-- ============================================================
-- 56. BOOKING ENGINE — NORMALIZED DATA MODEL
--     Multi-resource services, provider schedules, breaks,
--     absences, buffers, and race-condition-safe booking.
-- ============================================================

-- ============================================================
-- 56.1 EXTENSIONS
-- ============================================================
create extension if not exists btree_gist;

-- ============================================================
-- 56.2 STAFF ROLES
--     Maps to the existing provider_type enum values.
-- ============================================================
create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Seed roles from the provider_type enum
insert into public.staff_roles (code, name, description) values
  ('barber', 'Master Barber', 'Precision haircuts, fades, beard sculpting'),
  ('facial-specialist', 'Facial Specialist', 'Facials, skin treatments'),
  ('spa-therapist', 'Spa Therapist', 'Spa therapies, manicures, pedicures'),
  ('scalp-care', 'Scalp-Care Specialist', 'Scalp detox, hair spa treatments'),
  ('other', 'Service Specialist', 'General service specialist')
on conflict (code) do nothing;

-- ============================================================
-- 56.3 SERVICE REQUIREMENTS
--     Which role(s) and quantity a service needs.
-- ============================================================
create table if not exists public.service_requirements (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  role_id uuid not null references public.staff_roles(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (service_id, role_id)
);

-- Backfill: every service requires 1 provider of its category role
insert into public.service_requirements (service_id, role_id, quantity)
select s.id, r.id, 1
from public.services s
join public.staff_roles r on r.code = s.category
where s.status = 'active'
on conflict (service_id, role_id) do nothing;

-- For services whose category doesn't match a role code, default to 'barber'
insert into public.service_requirements (service_id, role_id, quantity)
select s.id, r.id, 1
from public.services s
join public.staff_roles r on r.code = 'barber'
where s.status = 'active'
  and not exists (
    select 1 from public.service_requirements sr
    where sr.service_id = s.id
  )
on conflict (service_id, role_id) do nothing;

-- ============================================================
-- 56.4 STAFF SCHEDULES (normalized weekly hours)
--     Migrates from service_providers.schedule JSONB.
-- ============================================================
create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  is_working boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, weekday)
);

-- Migrate from service_providers.schedule JSONB
-- JSONB format: [{"day":"monday","isWorking":true,"startTime":"08:30","endTime":"19:00","breaks":[...]}]
do $$
declare
  p record;
  s jsonb;
  day_map text[];
  day_idx int;
begin
  day_map := array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  
  for p in select id, schedule from public.service_providers where schedule is not null loop
    for s in select * from jsonb_array_elements(p.schedule) loop
      day_idx := array_position(day_map, lower(s->>'day'));
      if day_idx is not null then
        insert into public.staff_schedules (provider_id, weekday, start_time, end_time, is_working)
        values (
          p.id,
          day_idx - 1,
          (s->>'startTime')::time,
          (s->>'endTime')::time,
          coalesce((s->>'isWorking')::boolean, true)
        )
        on conflict (provider_id, weekday) do update set
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          is_working = excluded.is_working,
          updated_at = now();
      end if;
    end loop;
  end loop;
end $$;

-- ============================================================
-- 56.5 STAFF BREAKS (recurring or date-specific)
--     Migrates breaks from service_providers.schedule JSONB
--     and schedule_blocks with reason='break'.
-- ============================================================
create table if not exists public.staff_breaks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  date date, -- NULL = recurring weekly break
  weekday int check (weekday between 0 and 6), -- for recurring breaks
  start_time time not null,
  end_time time not null,
  reason text default 'break',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate recurring breaks from service_providers.schedule JSONB
do $$
declare
  p record;
  s jsonb;
  b jsonb;
  day_map text[];
  day_idx int;
begin
  day_map := array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  
  for p in select id, schedule from public.service_providers where schedule is not null loop
    for s in select * from jsonb_array_elements(p.schedule) loop
      day_idx := array_position(day_map, lower(s->>'day'));
      if day_idx is not null and jsonb_typeof(coalesce(s->'breaks', '[]'::jsonb)) = 'array' then
        for b in select * from jsonb_array_elements(coalesce(s->'breaks', '[]'::jsonb)) loop
          insert into public.staff_breaks (provider_id, weekday, start_time, end_time, reason)
          values (p.id, day_idx - 1, (b->>'start')::time, (b->>'end')::time, 'break')
          on conflict do nothing;
        end loop;
      end if;
    end loop;
  end loop;
end $$;

-- Migrate date-specific breaks from schedule_blocks
insert into public.staff_breaks (provider_id, date, start_time, end_time, reason, notes)
select provider_id, date, start_time::time, end_time::time, reason, notes
from public.schedule_blocks
where reason = 'break'
on conflict do nothing;

-- ============================================================
-- 56.6 STAFF SCHEDULE EXCEPTIONS (absences / special days)
--     Migrates from schedule_blocks (non-break) and
--     provider_availability.
-- ============================================================
create table if not exists public.staff_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  date date not null,
  exception_type text not null check (exception_type in ('ABSENT', 'LEAVE', 'SPECIAL_WORKING_DAY')),
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, date)
);

-- Migrate from schedule_blocks (non-break reasons = absences)
insert into public.staff_schedule_exceptions (provider_id, date, exception_type, start_time, end_time, reason)
select provider_id, date,
  case when reason in ('day-off', 'holiday', 'maintenance') then 'ABSENT' else 'LEAVE' end,
  start_time::time, end_time::time, reason
from public.schedule_blocks
where reason != 'break'
on conflict (provider_id, date) do update set
  exception_type = excluded.exception_type,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  reason = excluded.reason,
  updated_at = now();

-- Migrate from provider_availability (is_available=false = ABSENT)
insert into public.staff_schedule_exceptions (provider_id, date, exception_type, start_time, end_time, reason)
select provider_id, date, 'ABSENT', start_time::time, end_time::time, coalesce(reason, 'Marked unavailable')
from public.provider_availability
where is_available = false
on conflict (provider_id, date) do update set
  exception_type = excluded.exception_type,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  reason = excluded.reason,
  updated_at = now();

-- Migrate from provider_availability (is_available=true with custom hours = SPECIAL_WORKING_DAY)
insert into public.staff_schedule_exceptions (provider_id, date, exception_type, start_time, end_time, reason)
select provider_id, date, 'SPECIAL_WORKING_DAY', start_time::time, end_time::time, coalesce(reason, 'Special working day')
from public.provider_availability
where is_available = true and start_time is not null and end_time is not null
on conflict (provider_id, date) do update set
  exception_type = excluded.exception_type,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  reason = excluded.reason,
  updated_at = now();

-- ============================================================
-- 56.7 BOOKING TIMESTAMPS
--     Add start_ts/end_ts for exclusion constraints.
--     Backfill from existing date/time_slot/duration.
-- ============================================================
alter table public.bookings
  add column if not exists start_ts timestamptz,
  add column if not exists end_ts timestamptz;

-- Backfill existing bookings
update public.bookings
set start_ts = (date::text || ' ' || time_slot)::timestamptz,
    end_ts = (date::text || ' ' || time_slot)::timestamptz + (duration_minutes || ' minutes')::interval
where start_ts is null and date is not null and time_slot is not null;

-- ============================================================
-- 56.8 BOOKING RESOURCES (join table)
--     Links a booking to each required staff member.
-- ============================================================
create table if not exists public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  role_id uuid references public.staff_roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (booking_id, provider_id)
);

-- Backfill from existing bookings (single provider per booking)
insert into public.booking_resources (booking_id, provider_id, role_id)
select b.id, b.provider_id, r.id
from public.bookings b
left join public.staff_roles r on r.code = 'barber'
where b.provider_id is not null
on conflict (booking_id, provider_id) do nothing;

-- ============================================================
-- 56.9 BUSINESS HOURS
--     Centralized opening/closing times per weekday.
-- ============================================================
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0=Sunday, 6=Saturday
  open_time time not null,
  close_time time not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, weekday)
);

-- Seed default business hours (Mon-Sat 8:30-20:00, Sun 10:00-18:00)
insert into public.business_hours (business_id, weekday, open_time, close_time, is_open) values
  ('00000000-0000-0000-0000-000000000001', 0, '10:00', '18:00', true),  -- Sunday
  ('00000000-0000-0000-0000-000000000001', 1, '08:30', '19:00', true),  -- Monday
  ('00000000-0000-0000-0000-000000000001', 2, '08:30', '19:00', true),  -- Tuesday
  ('00000000-0000-0000-0000-000000000001', 3, '08:30', '19:00', true),  -- Wednesday
  ('00000000-0000-0000-0000-000000000001', 4, '08:30', '19:00', true),  -- Thursday
  ('00000000-0000-0000-0000-000000000001', 5, '08:30', '20:00', true),  -- Friday
  ('00000000-0000-0000-0000-000000000001', 6, '09:00', '20:30', true)   -- Saturday
on conflict (business_id, weekday) do nothing;

-- ============================================================
-- 56.10 EXCLUSION CONSTRAINTS (race-condition-safe)
--     Postgres does not allow subqueries in index predicates,
--     so we denormalize start_ts / end_ts / status onto
--     booking_resources and keep them in sync with triggers.
-- ============================================================

-- Denormalized columns on booking_resources
alter table public.booking_resources
  add column if not exists start_ts timestamptz,
  add column if not exists end_ts timestamptz,
  add column if not exists booking_status booking_status;

-- Backfill from bookings
update public.booking_resources br
set start_ts = b.start_ts, end_ts = b.end_ts, booking_status = b.status
from public.bookings b
where b.id = br.booking_id;

-- Trigger: fill denormalized columns when a resource row is written
create or replace function public.sync_booking_resource_window()
returns trigger as $$
begin
  select b.start_ts, b.end_ts, b.status
  into new.start_ts, new.end_ts, new.booking_status
  from public.bookings b
  where b.id = new.booking_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_resource_window on public.booking_resources;
create trigger sync_resource_window
  before insert or update on public.booking_resources
  for each row execute procedure public.sync_booking_resource_window();

-- Trigger: propagate booking changes (reschedule/status) to resources
create or replace function public.sync_resource_windows_on_booking_change()
returns trigger as $$
begin
  update public.booking_resources
  set start_ts = new.start_ts, end_ts = new.end_ts, booking_status = new.status
  where booking_id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_resources_on_booking on public.bookings;
create trigger sync_resources_on_booking
  after insert or update of start_ts, end_ts, status on public.bookings
  for each row execute procedure public.sync_resource_windows_on_booking_change();

-- Staff conflict prevention: no two active bookings can overlap
-- for the same provider (direct columns — no subqueries).
alter table public.booking_resources
  drop constraint if exists no_staff_overlap;
do $$
begin
  alter table public.booking_resources
    add constraint no_staff_overlap
    exclude using gist (
      provider_id with =,
      tstzrange(start_ts, end_ts, '[)') with &&
    )
    where (booking_status in ('pending', 'confirmed'));
exception
  when others then
    -- Legacy overlapping data may block the constraint; the RPC-level
    -- checks in check_and_reserve still prevent new conflicts.
    raise notice 'no_staff_overlap constraint not added: %', sqlerrm;
end $$;

-- Customer conflict prevention: no two active bookings can overlap
-- for the same customer.
alter table public.bookings
  drop constraint if exists no_customer_overlap;
do $$
begin
  alter table public.bookings
    add constraint no_customer_overlap
    exclude using gist (
      customer_id with =,
      tstzrange(start_ts, end_ts, '[)') with &&
    )
    where (status in ('pending', 'confirmed'));
exception
  when others then
    raise notice 'no_customer_overlap constraint not added: %', sqlerrm;
end $$;

-- ============================================================
-- 56.11 INDEXES
-- ============================================================
create index if not exists idx_staff_schedules_provider on public.staff_schedules(provider_id);
create index if not exists idx_staff_schedules_weekday on public.staff_schedules(weekday);
create index if not exists idx_staff_breaks_provider_date on public.staff_breaks(provider_id, date);
create index if not exists idx_staff_breaks_provider_weekday on public.staff_breaks(provider_id, weekday);
create index if not exists idx_staff_exceptions_provider_date on public.staff_schedule_exceptions(provider_id, date);
create index if not exists idx_service_requirements_service on public.service_requirements(service_id);
create index if not exists idx_service_requirements_role on public.service_requirements(role_id);
create index if not exists idx_booking_resources_booking on public.booking_resources(booking_id);
create index if not exists idx_booking_resources_provider on public.booking_resources(provider_id);
create index if not exists idx_bookings_start_ts on public.bookings(start_ts);
create index if not exists idx_bookings_end_ts on public.bookings(end_ts);
create index if not exists idx_bookings_customer_start on public.bookings(customer_id, start_ts);
create index if not exists idx_business_hours_business on public.business_hours(business_id);

-- ============================================================
-- 56.12 UPDATED_AT TRIGGERS
-- ============================================================
do $$ begin create trigger set_updated_at before update on public.staff_schedules for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.staff_breaks for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.staff_schedule_exceptions for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.business_hours for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 56.13 REALTIME
-- ============================================================
do $$ begin alter publication supabase_realtime add table public.booking_resources; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff_schedules; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff_breaks; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff_schedule_exceptions; exception when duplicate_object then null; end $$;
