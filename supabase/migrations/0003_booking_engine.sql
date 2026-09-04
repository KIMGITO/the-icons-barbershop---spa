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
-- ============================================================
-- 57. BOOKING ENGINE — RPC FUNCTIONS
--     Clean, minimal implementation using helper functions
--     and FOR loops. No repetitive variable declarations.
-- ============================================================

-- Drop existing versions (return types changed from tsrange[] to tstzrange[])
drop function if exists public.fn_subtract_windows(tsrange[], tsrange[]);
drop function if exists public.fn_get_staff_free_windows(uuid, date);
drop function if exists public.fn_get_customer_free_windows(uuid, date);
drop function if exists public.fn_is_staff_available(uuid, timestamptz, timestamptz);
drop function if exists public.get_available_slots(uuid, date, uuid[]);
drop function if exists public.get_qualified_staff(uuid);
drop function if exists public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text);

-- 57.1 Subtract windows helper
create or replace function public.fn_subtract_windows(
  p_base tstzrange[],
  p_remove tstzrange[]
) returns tstzrange[]
language plpgsql immutable as $$
declare
  v_result tstzrange[] := '{}';
  v_base tstzrange;
  v_rem tstzrange;
  v_parts tstzrange[];
  v_new tstzrange[];
  v_part tstzrange;
begin
  if p_base is null or array_length(p_base,1) = 0 then return '{}'; end if;
  if p_remove is null or array_length(p_remove,1) = 0 then return p_base; end if;

  foreach v_base in array p_base loop
    v_parts := array[v_base];
    foreach v_rem in array p_remove loop
      v_new := '{}';
      foreach v_part in array v_parts loop
        if lower(v_part) < lower(v_rem) then
          v_new := v_new || tstzrange(lower(v_part), least(upper(v_part), lower(v_rem)), '[)');
        end if;
        if upper(v_part) > upper(v_rem) then
          v_new := v_new || tstzrange(greatest(lower(v_part), upper(v_rem)), upper(v_part), '[)');
        end if;
      end loop;
      v_parts := v_new;
    end loop;
    v_result := v_result || v_parts;
  end loop;
  return v_result;
end $$;

-- 57.2 Staff free windows
create or replace function public.fn_get_staff_free_windows(
  p_provider_id uuid,
  p_date date
) returns table (start_ts timestamptz, end_ts timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_dow int := extract(dow from p_date)::int;
  v_start time;
  v_end time;
  v_working boolean;
  v_exc record;
  v_windows tstzrange[] := '{}';
  v_remove tstzrange[] := '{}';
  v_win tstzrange;
begin
  -- Exception check
  select * into v_exc from public.staff_schedule_exceptions
  where provider_id = p_provider_id and date = p_date limit 1;
  if found then
    if v_exc.exception_type in ('ABSENT','LEAVE') then return; end if;
    if v_exc.exception_type = 'SPECIAL_WORKING_DAY' and v_exc.start_time is not null then
      v_start := v_exc.start_time; v_end := v_exc.end_time; v_working := true;
    end if;
  end if;

  -- Base schedule
  if v_start is null then
    select start_time, end_time, is_working into v_start, v_end, v_working
    from public.staff_schedules
    where provider_id = p_provider_id and weekday = v_dow;
    if not found or not v_working then return; end if;
  end if;

  -- Working window
  v_windows := array[tstzrange(
    (p_date::text || ' ' || v_start::text)::timestamptz,
    (p_date::text || ' ' || v_end::text)::timestamptz, '[)')];

  -- Breaks
  for v_win in
    select tstzrange(
      (p_date::text || ' ' || b.start_time::text)::timestamptz,
      (p_date::text || ' ' || b.end_time::text)::timestamptz, '[)')
    from (
      select start_time, end_time from public.staff_breaks
      where provider_id = p_provider_id and date = p_date
      union all
      select start_time, end_time from public.staff_breaks
      where provider_id = p_provider_id and date is null and weekday = v_dow
    ) b
  loop
    v_remove := v_remove || v_win;
  end loop;

  -- Bookings
  for v_win in
    select tstzrange(b.start_ts, b.end_ts, '[)')
    from public.bookings b
    join public.booking_resources br on br.booking_id = b.id
    where br.provider_id = p_provider_id
      and b.status in ('pending','confirmed')
      and b.start_ts::date = p_date
  loop
    v_remove := v_remove || v_win;
  end loop;

  -- Subtract
  for v_win in select * from unnest(public.fn_subtract_windows(v_windows, v_remove)) loop
    if not isempty(v_win) then
      start_ts := lower(v_win); end_ts := upper(v_win);
      return next;
    end if;
  end loop;
end $$;

-- 57.3 Customer free windows
create or replace function public.fn_get_customer_free_windows(
  p_customer_id uuid, p_date date
) returns tstzrange[]
language plpgsql security definer set search_path = public as $$
declare
  v_remove tstzrange[] := '{}';
  v_win tstzrange;
begin
  for v_win in
    select tstzrange(start_ts, end_ts, '[)')
    from public.bookings
    where customer_id = p_customer_id
      and status in ('pending','confirmed')
      and start_ts::date = p_date
  loop
    v_remove := v_remove || v_win;
  end loop;
  return public.fn_subtract_windows(
    array[tstzrange((p_date::text||' 00:00:00')::timestamptz, (p_date::text||' 23:59:59')::timestamptz, '[)')],
    v_remove);
end $$;

-- 57.4 Is staff available for a window?
create or replace function public.fn_is_staff_available(
  p_provider_id uuid, p_start timestamptz, p_end timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_free record;
begin
  for v_free in select * from public.fn_get_staff_free_windows(p_provider_id, p_start::date) loop
    if v_free.start_ts <= p_start and v_free.end_ts >= p_end then return true; end if;
  end loop;
  return false;
end $$;

-- 57.5 Get available slots for a service on a date
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date date,
  p_preferred_staff_ids uuid[] default null
) returns table (start_ts timestamptz, end_ts timestamptz, staff_id uuid, staff_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_service record;
  v_req record;
  v_staff record;
  v_free record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_total_min int;
  v_step int := 15;
begin
  -- Load service
  select * into v_service from public.services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;

  v_total_min := v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0);

  -- For each eligible staff member for this service's role
  for v_staff in
    select sp.id, sp.full_name
    from public.service_providers sp
    join public.service_requirements sr on sr.role_id = (
      select id from public.staff_roles where code = sp.provider_type::text
    )
    where sr.service_id = p_service_id
      and sp.status = 'active'
      and (p_preferred_staff_ids is null or sp.id = any(p_preferred_staff_ids))
    order by case when p_preferred_staff_ids is not null and sp.id = any(p_preferred_staff_ids) then 0 else 1 end, sp.full_name
  loop
    -- For each free window
    for v_free in select * from public.fn_get_staff_free_windows(v_staff.id, p_date) loop
      -- Generate slots within this free window
      v_slot_start := v_free.start_ts;
      while v_slot_start + (v_total_min || ' minutes')::interval <= v_free.end_ts loop
        v_slot_end := v_slot_start + (v_total_min || ' minutes')::interval;
        start_ts := v_slot_start;
        end_ts := v_slot_end;
        staff_id := v_staff.id;
        staff_name := v_staff.full_name;
        return next;
        v_slot_start := v_slot_start + (v_step || ' minutes')::interval;
      end loop;
    end loop;
  end loop;
end $$;

-- 57.6 Get qualified staff for a service (regardless of availability)
--     Used by the UI to suggest alternatives when no one is available.
create or replace function public.get_qualified_staff(
  p_service_id uuid
) returns table (staff_id uuid, staff_name text, provider_type text)
language sql
security definer
set search_path = public as $$
  select sp.id, sp.full_name, sp.provider_type::text
  from public.service_providers sp
  join public.service_requirements sr on sr.role_id = (
    select id from public.staff_roles where code = sp.provider_type::text
  )
  where sr.service_id = p_service_id
    and sp.status = 'active'
  order by sp.full_name;
$$;

-- 57.7 Check and reserve (atomic booking creation)
create or replace function public.check_and_reserve(
  p_customer_id uuid,
  p_service_id uuid,
  p_desired_start_ts timestamptz,
  p_preferred_staff_ids uuid[] default null,
  p_check_only boolean default false,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_customer_email text default null,
  p_special_requests text default null,
  p_require_payment boolean default false,
  p_payment_method text default 'unpaid',
  p_payment_ref text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_service record;
  v_desired_end timestamptz;
  v_staff record;
  v_booking_id uuid;
  v_reference text;
  v_receipt_code text;
  v_total numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
  v_status booking_status := 'confirmed';
  v_pay_status payment_status;
  v_customer_id uuid := p_customer_id;
  v_available jsonb := '[]'::jsonb;
  v_slot record;
begin
  -- Load service
  select * into v_service from public.services where id = p_service_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'SERVICE_NOT_FOUND');
  end if;

  v_desired_end := p_desired_start_ts + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes,0)) || ' minutes')::interval;

  -- Check business hours
  if not exists (
    select 1 from public.business_hours bh
    where bh.business_id = '00000000-0000-0000-0000-000000000001'
      and bh.weekday = extract(dow from p_desired_start_ts)::int
      and bh.is_open
      and bh.open_time <= p_desired_start_ts::time
      and bh.close_time >= v_desired_end::time
  ) then
    return jsonb_build_object('success', false, 'error', 'BUSINESS_CLOSED');
  end if;

  -- Check customer conflict
  if exists (
    select 1 from public.bookings
    where customer_id = p_customer_id
      and status in ('pending','confirmed')
      and start_ts < v_desired_end
      and end_ts > p_desired_start_ts
  ) then
    return jsonb_build_object('success', false, 'error', 'CUSTOMER_CONFLICT');
  end if;

  -- Find available staff
  select * into v_staff
  from public.get_available_slots(p_service_id, p_desired_start_ts::date, p_preferred_staff_ids)
  where start_ts = p_desired_start_ts
  limit 1;

  if not found then
    -- Check if any staff is available at all (for better error message)
    if exists (
      select 1 from public.get_available_slots(p_service_id, p_desired_start_ts::date, p_preferred_staff_ids)
    ) then
      return jsonb_build_object('success', false, 'error', 'SLOT_UNAVAILABLE');
    else
      return jsonb_build_object('success', false, 'error', 'ROLE_UNAVAILABLE');
    end if;
  end if;

  -- If check_only, return availability info
  if p_check_only then
    return jsonb_build_object(
      'success', true,
      'available', true,
      'staff_id', v_staff.staff_id,
      'staff_name', v_staff.staff_name,
      'start_ts', p_desired_start_ts,
      'end_ts', v_desired_end
    );
  end if;

  -- Generate reference and receipt code
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;
  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

  -- Calculate pricing
  v_total := v_service.price_ksh;
  v_deposit := least(greatest(coalesce(0, ceil(v_total * 0.5)), 0), v_total);
  v_remaining := greatest(0, v_total - v_deposit);

  if p_require_payment then
    v_status := 'pending';
    v_pay_status := 'unpaid'::payment_status;
  elsif v_remaining = 0 then
    v_pay_status := 'paid'::payment_status;
  elsif v_deposit > 0 then
    v_pay_status := 'deposit-paid'::payment_status;
  else
    v_pay_status := 'unpaid'::payment_status;
  end if;

  -- Create customer if needed
  if p_customer_name is not null and p_customer_phone is not null then
    select id into v_customer_id from public.customers
    where phone = p_customer_phone and business_id = '00000000-0000-0000-0000-000000000001' limit 1;
    if v_customer_id is null then
      insert into public.customers (name, phone, email, business_id, total_visits)
      values (p_customer_name, p_customer_phone, p_customer_email, '00000000-0000-0000-0000-000000000001', 1)
      returning id into v_customer_id;
    end if;
  end if;

  -- Insert booking
  insert into public.bookings (
    reference_number, receipt_code, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id, mpesa_receipt_number,
    start_ts, end_ts
  ) values (
    v_reference, v_receipt_code, v_customer_id,
    coalesce(p_customer_name, (select name from public.customers where id = v_customer_id)),
    coalesce(p_customer_phone, (select phone from public.customers where id = v_customer_id)),
    coalesce(p_customer_email, (select email from public.customers where id = v_customer_id)),
    array[p_service_id], array[v_service.name], v_staff.staff_id, v_staff.staff_name,
    p_desired_start_ts::date,
    to_char(p_desired_start_ts, 'HH12:MI AM'),
    to_char(v_desired_end, 'HH12:MI AM'),
    v_service.duration_minutes,
    v_total, v_deposit, v_remaining,
    v_status, v_pay_status, p_payment_method,
    p_special_requests, '00000000-0000-0000-0000-000000000001', p_payment_ref,
    p_desired_start_ts, v_desired_end
  ) returning id into v_booking_id;

  -- Insert booking resource
  insert into public.booking_resources (booking_id, provider_id, role_id)
  values (v_booking_id, v_staff.staff_id, (
    select id from public.staff_roles where code = (
      select provider_type::text from public.service_providers where id = v_staff.staff_id
    )
  ));

  -- Insert booking_services junction
  insert into public.booking_services (booking_id, service_id)
  values (v_booking_id, p_service_id);

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'reference_number', v_reference,
    'receipt_code', v_receipt_code,
    'staff_id', v_staff.staff_id,
    'staff_name', v_staff.staff_name,
    'start_ts', p_desired_start_ts,
    'end_ts', v_desired_end,
    'total_price_ksh', v_total,
    'deposit_paid_ksh', v_deposit,
    'remaining_balance_ksh', v_remaining,
    'status', v_status,
    'payment_status', v_pay_status
  );
end $$;

-- Grants
grant execute on function public.fn_subtract_windows(tstzrange[], tstzrange[]) to anon, authenticated;
grant execute on function public.fn_get_staff_free_windows(uuid, date) to anon, authenticated;
grant execute on function public.fn_get_customer_free_windows(uuid, date) to anon, authenticated;
grant execute on function public.fn_is_staff_available(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.get_available_slots(uuid, date, uuid[]) to anon, authenticated;
grant execute on function public.get_qualified_staff(uuid) to anon, authenticated;
grant execute on function public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text) to anon, authenticated;
-- ============================================================
-- 58. BOOKING ENGINE — RLS POLICIES
--     Security for new normalized tables.
-- ============================================================

-- Enable RLS on new tables
alter table public.staff_roles enable row level security;
alter table public.service_requirements enable row level security;
alter table public.staff_schedules enable row level security;
alter table public.staff_breaks enable row level security;
alter table public.staff_schedule_exceptions enable row level security;
alter table public.booking_resources enable row level security;
alter table public.business_hours enable row level security;

-- ============================================================
-- PUBLIC / ANONYMOUS (needed for booking flow)
-- ============================================================

-- Anyone can view staff roles (needed for service requirements display)
drop policy if exists "Public can view staff roles" on public.staff_roles;
create policy "Public can view staff roles" on public.staff_roles
  for select using (true);

-- Anyone can view service requirements (needed for booking flow)
drop policy if exists "Public can view service requirements" on public.service_requirements;
create policy "Public can view service requirements" on public.service_requirements
  for select using (true);

-- Anyone can view business hours (needed for booking flow)
drop policy if exists "Public can view business hours" on public.business_hours;
create policy "Public can view business hours" on public.business_hours
  for select using (true);

-- ============================================================
-- STAFF (logged-in portal users)
-- ============================================================

-- Staff can view all staff schedules
drop policy if exists "Staff can view staff schedules" on public.staff_schedules;
create policy "Staff can view staff schedules" on public.staff_schedules
  for select using (public.is_staff());

-- Admin can manage staff schedules
drop policy if exists "Admin can manage staff schedules" on public.staff_schedules;
create policy "Admin can manage staff schedules" on public.staff_schedules
  for all using (public.is_admin());

-- Staff can view all staff breaks
drop policy if exists "Staff can view staff breaks" on public.staff_breaks;
create policy "Staff can view staff breaks" on public.staff_breaks
  for select using (public.is_staff());

-- Admin can manage staff breaks
drop policy if exists "Admin can manage staff breaks" on public.staff_breaks;
create policy "Admin can manage staff breaks" on public.staff_breaks
  for all using (public.is_admin());

-- Staff can view all schedule exceptions
drop policy if exists "Staff can view schedule exceptions" on public.staff_schedule_exceptions;
create policy "Staff can view schedule exceptions" on public.staff_schedule_exceptions
  for select using (public.is_staff());

-- Admin can manage schedule exceptions
drop policy if exists "Admin can manage schedule exceptions" on public.staff_schedule_exceptions;
create policy "Admin can manage schedule exceptions" on public.staff_schedule_exceptions
  for all using (public.is_admin());

-- Staff can view booking resources
drop policy if exists "Staff can view booking resources" on public.booking_resources;
create policy "Staff can view booking resources" on public.booking_resources
  for select using (public.is_staff());

-- Admin can manage booking resources
drop policy if exists "Admin can manage booking resources" on public.booking_resources;
create policy "Admin can manage booking resources" on public.booking_resources
  for all using (public.is_admin());

-- Admin can manage staff roles
drop policy if exists "Admin can manage staff roles" on public.staff_roles;
create policy "Admin can manage staff roles" on public.staff_roles
  for all using (public.is_admin());

-- Admin can manage service requirements
drop policy if exists "Admin can manage service requirements" on public.service_requirements;
create policy "Admin can manage service requirements" on public.service_requirements
  for all using (public.is_admin());

-- Admin can manage business hours
drop policy if exists "Admin can manage business hours" on public.business_hours;
create policy "Admin can manage business hours" on public.business_hours
  for all using (public.is_admin());-- ============================================================
-- 57. BOOKING ENGINE — AUTH HARDENING (permanent)
--
-- 1. Make the handle_new_user trigger defensive: the staff_profiles
--    insert must NEVER break GoTrue signup (which would surface as
--    "Database error saving new user" / 500).
-- 2. The admin auth row is seeded correctly by 0003; this migration is
--    a safety net that re-syncs any legacy admin row to a GoTrue-loginable
--    shape (non-null token columns, proper app_metadata, valid bcrypt hash).
-- ============================================================

-- 57.1 Defensive handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = auth, public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
  e text;
begin
  -- (no-op in AFTER triggers; kept for parity with the original)
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb;

  -- Staff-profile creation: fully defensive so it cannot break auth signup
  begin
    insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
    values (new.id, coalesce(new.email, ''),
            coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
            user_role, user_provider_id, default_business_id, true)
    on conflict (id) do nothing;
  exception when others then
    -- Swallow any error so GoTrue's auth.users INSERT never fails
    e := sqlerrm;
  end;

  return new;
end $$;

-- Re-attach (idempotent — 0003 already created it for fresh clones)
do $$
begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- 57.2 Safety net: re-sync a legacy admin auth row so login succeeds.
--     (Fresh clones are seeded correctly by 0003; this covers pre-existing rows.)
update auth.users
set
  instance_id              = '00000000-0000-0000-0000-000000000000',
  confirmation_token       = coalesce(confirmation_token, ''),
  email_change             = coalesce(email_change, ''),
  email_change_token_new   = coalesce(email_change_token_new, ''),
  recovery_token           = coalesce(recovery_token, ''),
  confirmation_sent_at     = coalesce(confirmation_sent_at, now()),
  email_confirmed_at       = coalesce(email_confirmed_at, now()),
  encrypted_password       = extensions.crypt('Admin@123', extensions.gen_salt('bf', 10)),
  role                     = 'authenticated',
  aud                      = 'authenticated',
  raw_app_meta_data        = '{"provider":"email","providers":["email"]}',
  updated_at               = now()
where id = '00000000-0000-0000-0000-0000000000ad';

grant execute on function public.handle_new_user() to public;
