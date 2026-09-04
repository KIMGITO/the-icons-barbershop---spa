-- ============================================================
-- DATABASE FUNCTIONS — CRUD, Calculations & Availability
-- ============================================================

-- ============================================================
-- 25. BOOKING DURATION & PRICE CALCULATION
-- ============================================================
create or replace function public.calculate_booking_totals(
  p_service_ids uuid[],
  p_provider_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_duration int := 0;
  v_total_buffer int := 0;
  v_total_price numeric(10,2) := 0;
  v_service record;
  v_name_list text[] := '{}';
begin
  for v_service in
    select s.id, s.name, coalesce(s.duration_minutes, 30) as duration_minutes,
           coalesce(s.buffer_minutes, 0) as buffer_minutes, s.price_ksh
    from public.services s
    where s.id = any(p_service_ids) and s.status = 'active'
  loop
    v_total_duration := v_total_duration + v_service.duration_minutes;
    v_total_buffer := v_total_buffer + v_service.buffer_minutes;
    v_total_price := v_total_price + coalesce(v_service.price_ksh, 0);
    v_name_list := array_append(v_name_list, v_service.name);
  end loop;

  return jsonb_build_object(
    'total_duration_minutes', v_total_duration,
    'total_buffer_minutes', v_total_buffer,
    'total_minutes', v_total_duration + v_total_buffer,
    'total_price_ksh', v_total_price,
    'service_names', v_name_list
  );
end;
$$;

-- ============================================================
-- 26. PROVIDER TIME SLOT GENERATION
-- ============================================================
create or replace function public.get_available_time_slots(
  p_provider_id uuid,
  p_date date
)
returns table (
  start_time text,
  end_time text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text;
  v_schedule jsonb;
  v_day_schedule jsonb;
  v_start_min int;
  v_end_min int;
  v_slot_min int := 30;
  v_minute int;
  v_end_time text;
  v_break record;
  v_blocked record;
begin
  v_day := lower(to_char(p_date, 'Day'));
  v_day := trim(v_day);

  -- Get provider schedule
  select schedule into v_schedule from public.service_providers where id = p_provider_id;

  -- Check availability override
  if exists (
    select 1 from public.provider_availability
    where provider_id = p_provider_id and date = p_date and is_available = false
  ) then
    return;
  end if;

  -- Get schedule for the day
  v_day_schedule := (
    select jsonb_agg(s) from jsonb_array_elements(coalesce(v_schedule, '[]'::jsonb)) s
    where lower(s->>'day') = v_day
  );

  if v_day_schedule is null then
    return;
  end if;

  v_day_schedule := v_day_schedule->0;
  if (v_day_schedule->>'is_working')::boolean = false then
    return;
  end if;

  v_start_min := (split_part(v_day_schedule->>'start_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'start_time', ':', 2)::int;
  v_end_min := (split_part(v_day_schedule->>'end_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'end_time', ':', 2)::int;

  v_minute := v_start_min;
  while v_minute + v_slot_min <= v_end_min loop
    v_end_time := lpad(((v_minute + v_slot_min) / 60)::text, 2, '0') || ':' || lpad(((v_minute + v_slot_min) % 60)::text, 2, '0');

    -- Check schedule block conflicts
    v_blocked := null;
    for v_blocked in
      select * from (
        select 1 as conflict
        from public.schedule_blocks sb
        where sb.provider_id = p_provider_id
          and sb.date = p_date
          and sb.start_time <= v_end_time
          and sb.end_time > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
        limit 1
      ) t
    loop
      v_blocked := null;
      exit;
    end loop;

    -- Check if slot overlaps with breaks
    for v_break in
      select * from jsonb_array_elements(coalesce(v_day_schedule->'breaks', '[]'::jsonb)) b
    loop
      exit when exists (
        select 1 where (
          v_break->>'start' <= v_end_time
          and v_break->>'end' > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
        )
      );
    end loop;
    continue when v_break is not null;

    -- Check existing bookings conflict
    if not exists (
      select 1 from public.bookings b
      where b.provider_id = p_provider_id and b.date = p_date
        and b.status in ('pending', 'confirmed')
        and b.time_slot < v_end_time
        and coalesce(b.end_time, to_char(to_timestamp(b.time_slot, 'HH12:MI AM') + (b.duration_minutes || ' minutes')::interval, 'HH24:MI')) > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      start_time := lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0');
      end_time := v_end_time;
      return next;
    end if;

    v_minute := v_minute + v_slot_min;
  end loop;
end;
$$;

-- ============================================================
-- 27. CREATE BOOKING WITH AUTOMATIC CALCULATIONS
-- ============================================================
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids uuid[],
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_special_requests text default null,
  p_deposit_paid_ksh numeric default 0,
  p_payment_method text default 'unpaid'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals jsonb;
  v_booking public.bookings;
  v_reference text;
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
begin
  -- Calculate totals
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- Generate end time
  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');

  -- Generate reference
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  -- Find or create customer
  select id into v_customer_id from public.customers
  where phone = p_customer_phone and business_id = v_business_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    returning id into v_customer_id;
  else
    update public.customers set
      total_visits = total_visits + 1,
      last_visit_date = p_date,
      updated_at = now()
    where id = v_customer_id;
  end if;

  -- Calculate remaining balance
  v_remaining := greatest(0, v_price - coalesce(p_deposit_paid_ksh, 0));

  -- Insert booking
  insert into public.bookings (
    reference_number, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id
  )
  values (
    v_reference, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, coalesce(p_deposit_paid_ksh, 0), v_remaining,
    'confirmed',
    case when v_remaining = 0 then 'paid'
         when coalesce(p_deposit_paid_ksh, 0) > 0 then 'deposit-paid'
         else 'unpaid' end,
    p_payment_method,
    p_special_requests, v_business_id
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ============================================================
-- 28. CATEGORY MANAGEMENT FUNCTIONS
-- ============================================================
create or replace function public.get_service_categories()
returns setof public.service_categories
language sql
security definer
set search_path = public
as $$
  select * from public.service_categories
  where is_active = true
  order by sort_order, name;
$$;

create or replace function public.upsert_service_category(
  p_slug text,
  p_name text,
  p_description text default null,
  p_icon text default null,
  p_sort_order int default 0,
  p_is_active boolean default true
)
returns public.service_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_category public.service_categories;
begin
  insert into public.service_categories (slug, name, description, icon, sort_order, is_active, business_id)
  values (p_slug, p_name, p_description, p_icon, p_sort_order, p_is_active, v_business_id)
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_category;
  return v_category;
end;
$$;

create or replace function public.delete_service_category(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if services reference this category
  if exists (select 1 from public.services where category in (
    select slug from public.service_categories where id = p_id
  )) then
    raise exception 'Cannot delete category with associated services';
  end if;
  delete from public.service_categories where id = p_id;
  return found;
end;
$$;

-- ============================================================
-- 29. PROVIDER SCHEDULE MANAGEMENT
-- ============================================================
create or replace function public.get_provider_schedule(p_provider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule jsonb;
begin
  select schedule into v_schedule
  from public.service_providers
  where id = p_provider_id;
  return coalesce(v_schedule, '[]'::jsonb);
end;
$$;

create or replace function public.update_provider_schedule(
  p_provider_id uuid,
  p_schedule jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_providers
  set schedule = p_schedule, updated_at = now()
  where id = p_provider_id;
  return found;
end;
$$;

-- ============================================================
-- 30. DASHBOARD STATS
-- ============================================================
create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_result jsonb;
begin
  select jsonb_build_object(
    'today_total_bookings', count(*) filter (where date = v_today),
    'today_confirmed', count(*) filter (where date = v_today and status = 'confirmed'),
    'today_completed', count(*) filter (where date = v_today and status = 'completed'),
    'today_revenue_ksh', coalesce(sum(total_price_ksh) filter (where date = v_today and status != 'cancelled'), 0),
    'pending_bookings', count(*) filter (where status = 'pending'),
    'total_customers', (select count(*) from public.customers),
    'total_bookings', count(*),
    'total_services', (select count(*) from public.services where status = 'active'),
    'total_providers', (select count(*) from public.service_providers where status = 'active'),
    'total_products', (select count(*) from public.products where status = 'active'),
    'total_revenue_ksh', coalesce(sum(total_price_ksh) filter (where status != 'cancelled'), 0)
  ) into v_result
  from public.bookings;

  return v_result;
end;
$$;

-- ============================================================
-- 31. M-PESA PAYMENT LOGGING FUNCTIONS
-- ============================================================
create or replace function public.log_mpesa_payment(
  p_booking_id uuid,
  p_phone_number text,
  p_amount_ksh numeric,
  p_checkout_request_id text default null,
  p_merchant_request_id text default null,
  p_status text default 'pending'
)
returns public.mpesa_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.mpesa_payments;
begin
  insert into public.mpesa_payments (
    booking_id, phone_number, amount_ksh,
    checkout_request_id, merchant_request_id, status
  )
  values (
    p_booking_id, p_phone_number, p_amount_ksh,
    p_checkout_request_id, p_merchant_request_id, p_status
  )
  returning * into v_payment;
  return v_payment;
end;
$$;

create or replace function public.update_mpesa_payment_status(
  p_checkout_request_id text,
  p_status text,
  p_receipt_number text default null,
  p_result_code int default null,
  p_result_desc text default null,
  p_raw_callback jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_booking_id uuid;
begin
  update public.mpesa_payments
  set status = p_status,
      receipt_number = coalesce(p_receipt_number, receipt_number),
      result_code = coalesce(p_result_code, result_code),
      result_desc = coalesce(p_result_desc, result_desc),
      raw_callback = p_raw_callback,
      updated_at = now()
  where checkout_request_id = p_checkout_request_id
  returning id, booking_id into v_payment_id, v_booking_id;

  if found and p_status = 'completed' and v_booking_id is not null then
    update public.bookings
    set payment_status = 'paid',
        remaining_balance_ksh = 0,
        payment_method = 'mpesa',
        mpesa_receipt_number = p_receipt_number,
        updated_at = now()
    where id = v_booking_id;
  end if;

  return found;
end;
$$;

-- ============================================================
-- 32. AVAILABILITY CHECK & SLOT SEARCH
-- ============================================================
create or replace function public.is_provider_available(
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_duration_minutes int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start text;
  v_end text;
begin
  v_start := p_time_slot;
  v_end := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (p_duration_minutes || ' minutes')::interval, 'HH24:MI');

  -- Check availability override
  if exists (
    select 1 from public.provider_availability
    where provider_id = p_provider_id and date = p_date and is_available = false
  ) then
    return false;
  end if;

  -- Check schedule blocks
  if exists (
    select 1 from public.schedule_blocks
    where provider_id = p_provider_id and date = p_date
      and start_time <= v_end and end_time > v_start
  ) then
    return false;
  end if;

  -- Check overlapping bookings
  if exists (
    select 1 from public.bookings
    where provider_id = p_provider_id and date = p_date
      and status in ('pending', 'confirmed')
      and time_slot < v_end
      and coalesce(end_time, to_char(to_timestamp(time_slot, 'HH12:MI AM') + (duration_minutes || ' minutes')::interval, 'HH24:MI')) > v_start
  ) then
    return false;
  end if;

  return true;
end;
$$;-- ============================================================
-- FIX: IDENTITY & FK CONSISTENCY
-- 1. services.category_id uuid FK → service_categories(id)
--    (services.category remains as a denormalized display slug)
-- 2. booking_services junction table (proper many-to-many)
-- 3. Missing columns: customers.last_visit_date,
--    services.is_popular, services.recommended_for
-- ============================================================

-- ============================================================
-- 39. MISSING COLUMNS
-- ============================================================

-- customers.last_visit_date is referenced by create_booking()
alter table public.customers
  add column if not exists last_visit_date date;

-- services.is_popular / recommended_for are used by the frontend serviceService
alter table public.services
  add column if not exists is_popular boolean not null default false,
  add column if not exists recommended_for text;

-- ============================================================
-- 40. services.category_id — REAL FK (not slug-as-ID)
-- ============================================================

-- Add the proper UUID FK column. ON DELETE RESTRICT enforces the
-- business rule: a category with associated services cannot be deleted.
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id) on delete restrict;

-- Backfill category_id from the denormalized category slug
update public.services s
set category_id = sc.id
from public.service_categories sc
where s.category = sc.slug
  and s.category_id is null;

-- Index for FK lookups
create index if not exists idx_services_category_id on public.services(category_id);

-- ============================================================
-- 41. TRIGGER: keep services.category slug in sync with category_id
--     The slug remains a denormalized display/business value.
--     The UUID is the single source of truth for the relationship.
-- ============================================================
create or replace function public.sync_service_category_slug()
returns trigger as $$
declare
  v_slug text;
begin
  if new.category_id is not null then
    select slug into v_slug from public.service_categories where id = new.category_id;
    new.category := coalesce(v_slug, 'haircuts');
  else
    new.category := 'haircuts';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_service_category_slug on public.services;
create trigger sync_service_category_slug
  before insert or update of category_id on public.services
  for each row execute procedure public.sync_service_category_slug();

-- Keep display slug updated if a category slug is ever renamed
create or replace function public.sync_service_category_slug_rename()
returns trigger as $$
begin
  update public.services set category = new.slug
  where category_id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_service_category_slug_rename on public.service_categories;
create trigger sync_service_category_slug_rename
  after update of slug on public.service_categories
  for each row execute procedure public.sync_service_category_slug_rename();

-- ============================================================
-- 42. delete_service_category — use the real FK, drop slug lookup
--     The FK (ON DELETE RESTRICT) now enforces the business rule
--     at the database level.
-- ============================================================
create or replace function public.delete_service_category(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The services.category_id FK with ON DELETE RESTRICT raises an
  -- exception if any service still references this category.
  delete from public.service_categories where id = p_id;
  return found;
end;
$$;

-- ============================================================
-- 43. booking_services — proper many-to-many junction table
--     bookings.service_ids/service_names remain as denormalized
--     historical snapshots for display & data integrity.
-- ============================================================
create table if not exists public.booking_services (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  primary key (booking_id, service_id)
);

-- Backfill from existing booking.service_ids arrays
insert into public.booking_services (booking_id, service_id)
select b.id, unnest(b.service_ids)
from public.bookings b
where b.service_ids is not null
  and array_length(b.service_ids, 1) > 0
on conflict do nothing;

create index if not exists idx_booking_services_service on public.booking_services(service_id);

-- RLS
alter table public.booking_services enable row level security;

drop policy if exists "Public can view booking services" on public.booking_services;
create policy "Public can view booking services" on public.booking_services
  for select using (true);

drop policy if exists "Staff can view booking services" on public.booking_services;
create policy "Staff can view booking services" on public.booking_services
  for select using (public.is_staff());

drop policy if exists "Admin can manage booking services" on public.booking_services;
create policy "Admin can manage booking services" on public.booking_services
  for all using (public.is_admin());

-- ============================================================
-- 44. create_booking — also record canonical junction rows
-- ============================================================
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids uuid[],
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_special_requests text default null,
  p_deposit_paid_ksh numeric default 0,
  p_payment_method text default 'unpaid'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals jsonb;
  v_booking public.bookings;
  v_reference text;
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
  v_service_id uuid;
begin
  -- Calculate totals
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- Generate end time
  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');

  -- Generate reference
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  -- Find or create customer
  select id into v_customer_id from public.customers
  where phone = p_customer_phone and business_id = v_business_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    returning id into v_customer_id;
  else
    update public.customers set
      total_visits = total_visits + 1,
      last_visit_date = p_date,
      updated_at = now()
    where id = v_customer_id;
  end if;

  -- Calculate remaining balance
  v_remaining := greatest(0, v_price - coalesce(p_deposit_paid_ksh, 0));

  -- Insert booking
  insert into public.bookings (
    reference_number, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id
  )
  values (
    v_reference, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, coalesce(p_deposit_paid_ksh, 0), v_remaining,
    'confirmed',
    case when v_remaining = 0 then 'paid'
         when coalesce(p_deposit_paid_ksh, 0) > 0 then 'deposit-paid'
         else 'unpaid' end,
    p_payment_method,
    p_special_requests, v_business_id
  )
  returning * into v_booking;

  -- Record canonical many-to-many junction rows (snapshot columns remain)
  if v_booking.id is not null and p_service_ids is not null then
    foreach v_service_id in array p_service_ids loop
      insert into public.booking_services (booking_id, service_id)
      values (v_booking.id, v_service_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_booking;
end;
$$;

-- ============================================================
-- 45. REALTIME
-- ============================================================
alter publication supabase_realtime add table public.booking_services;-- ============================================================
-- 46. FIX AUTH 500 — raw_app_meta_data.role must be a valid
--     Postgres/auth role (e.g. 'authenticated'), never 'admin'.
--     The app's admin role lives in public.staff_profiles.role.
-- ============================================================
update auth.users
set raw_app_meta_data = (raw_app_meta_data - 'role') || '{"role":"authenticated"}'::jsonb
where raw_app_meta_data->>'role' is not null
  and raw_app_meta_data->>'role' not in ('authenticated', 'anon', 'service_role');

-- Also sanitize any future manually-created auth users via the trigger metadata
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Never allow raw_app_meta_data.role to be a non-auth role.
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role":"authenticated"}'::jsonb;
  insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
  values (new.id, coalesce(new.email, ''), coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), user_role, user_provider_id, default_business_id, true)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 47. BUSINESS LOCATION — no hardcoded location anywhere
-- ============================================================
alter table public.businesses
  add column if not exists location_details text,
  add column if not exists maps_embed_url text,
  add column if not exists directions_url text;

update public.businesses
set location_details = 'Located at Four Ways Village on Kiambu Road. Convenient executive parking and private penthouse access.',
    maps_embed_url = 'https://www.google.com/maps?q=Four+Ways+Village+Kiambu+Road+Nairobi&output=embed',
    directions_url = 'https://www.google.com/maps/dir/?api=1&destination=Four+Ways+Village+Kiambu+Road+Nairobi'
where id = '00000000-0000-0000-0000-000000000001'
  and location_details is null;

-- ============================================================
-- 48. PUBLIC BOOKED-SLOTS LOOKUP (no personal data leak)
--     Returns only time_slot + end_time for booked slots on a date.
-- ============================================================
create or replace function public.get_booked_slots(p_provider_id uuid, p_date date)
returns table (time_slot text, end_time text, status booking_status)
language sql
security definer
set search_path = public
as $$
  select b.time_slot, coalesce(b.end_time, ''), b.status
  from public.bookings b
  where b.provider_id = p_provider_id
    and b.date = p_date
    and b.status in ('pending', 'confirmed')
  order by b.time_slot;
$$;

grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;

-- ============================================================
-- 49. create_booking — payment-gated branch
--     When p_require_payment is true the booking is created
--     'pending' + 'unpaid' (slot held) and is only
--     'confirmed' after M-Pesa callback marks it deposit-paid.
-- ============================================================
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids uuid[],
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_special_requests text default null,
  p_deposit_paid_ksh numeric default 0,
  p_payment_method text default 'unpaid',
  p_require_payment boolean default false,
  p_payment_ref text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals jsonb;
  v_booking public.bookings;
  v_reference text;
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
  v_service_id uuid;
  v_status booking_status := 'confirmed';
begin
  -- Calculate totals
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- Deposit = 50% of total by default
  v_deposit := greatest(coalesce(p_deposit_paid_ksh, 0), ceil(v_price * 0.5));
  v_deposit := least(v_deposit, v_price);
  v_remaining := greatest(0, v_price - v_deposit);

  -- Generate end time
  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');

  -- Generate reference
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  -- Find or create customer
  select id into v_customer_id from public.customers
  where phone = p_customer_phone and business_id = v_business_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    returning id into v_customer_id;
  else
    update public.customers set
      total_visits = total_visits + 1,
      last_visit_date = p_date,
      updated_at = now()
    where id = v_customer_id;
  end if;

  -- Payment-gated booking: created pending/unpaid, slot held.
  -- Confirmed only after M-Pesa callback marks it deposit-paid.
  if p_require_payment then
    v_status := 'pending';
  end if;

  -- Insert booking
  insert into public.bookings (
    reference_number, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id, mpesa_receipt_number
  )
  values (
    v_reference, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, v_deposit, v_remaining,
    v_status,
    case when p_require_payment then 'unpaid'
         when v_remaining = 0 then 'paid'
         when v_deposit > 0 then 'deposit-paid'
         else 'unpaid' end,
    p_payment_method,
    p_special_requests, v_business_id, p_payment_ref
  )
  returning * into v_booking;

  -- Record canonical many-to-many junction rows (snapshot columns remain)
  if v_booking.id is not null and p_service_ids is not null then
    foreach v_service_id in array p_service_ids loop
      insert into public.booking_services (booking_id, service_id)
      values (v_booking.id, v_service_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_booking;
end;
$$;

-- ============================================================
-- 50. update_mpesa_payment_status — on completed deposit
--     confirm a pending booking + record deposit-paid.
-- ============================================================
create or replace function public.update_mpesa_payment_status(
  p_checkout_request_id text,
  p_status text,
  p_receipt_number text default null,
  p_result_code int default null,
  p_result_desc text default null,
  p_raw_callback jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_booking_id uuid;
  v_total numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
begin
  update public.mpesa_payments
  set status = p_status,
      receipt_number = coalesce(p_receipt_number, receipt_number),
      result_code = coalesce(p_result_code, result_code),
      result_desc = coalesce(p_result_desc, result_desc),
      raw_callback = p_raw_callback,
      updated_at = now()
  where checkout_request_id = p_checkout_request_id
  returning id, booking_id into v_payment_id, v_booking_id;

  if found and p_status = 'completed' and v_booking_id is not null then
    select total_price_ksh, deposit_paid_ksh into v_total, v_deposit
    from public.bookings where id = v_booking_id;

    if v_deposit is null or v_total is null then
      v_deposit := coalesce(v_deposit, 0);
      v_total := coalesce(v_total, 0);
    end if;

    v_remaining := greatest(0, v_total - v_deposit);

    update public.bookings
    set status = 'confirmed',
        payment_status = case when v_remaining = 0 then 'paid' else 'deposit-paid' end,
        payment_method = 'mpesa',
        mpesa_receipt_number = coalesce(p_receipt_number, mpesa_receipt_number),
        remaining_balance_ksh = v_remaining,
        updated_at = now()
    where id = v_booking_id;
  end if;

  return found;
end;
$$;-- ============================================================
-- 51. GUEST BOOKING WITHOUT LOGIN — grant anon/authenticated
--     execute on the booking + availability + payment functions.
--     All functions are SECURITY DEFINER so RLS on tables is
--     bypassed intentionally for these bounded operations.
-- ============================================================

grant execute on function public.create_booking(text, text, text, uuid[], uuid, date, text, text, numeric, text, boolean, text) to anon, authenticated;
grant execute on function public.calculate_booking_totals(uuid[], uuid) to anon, authenticated;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_time_slots(uuid, date) to anon, authenticated;
grant execute on function public.is_provider_available(uuid, date, text, int) to anon, authenticated;

-- ============================================================
-- 52. M-PESA PAYMENTS — unique checkout request + index
-- ============================================================
create unique index if not exists uq_mpesa_payments_checkout_request_id
  on public.mpesa_payments(checkout_request_id)
  where checkout_request_id is not null;

-- ============================================================
-- 53. PAYMENT-CONFIRMED BOOKING LOOKUP for the public
--     "my booking" status check (no auth / no login).
--     Returns only the essentials + payment state.
-- ============================================================
create or replace function public.get_booking_by_reference(p_reference text)
returns table (
  id uuid,
  reference_number text,
  date date,
  time_slot text,
  status booking_status,
  payment_status payment_status,
  total_price_ksh numeric,
  deposit_paid_ksh numeric,
  remaining_balance_ksh numeric,
  mpesa_receipt_number text,
  provider_name text,
  service_names text[]
)
language sql
security definer
set search_path = public
as $$
  select b.id, b.reference_number, b.date, b.time_slot, b.status, b.payment_status,
         b.total_price_ksh, b.deposit_paid_ksh, b.remaining_balance_ksh,
         b.mpesa_receipt_number, b.provider_name, b.service_names
  from public.bookings b
  where b.reference_number = p_reference
  limit 1;
$$;

grant execute on function public.get_booking_by_reference(text) to anon, authenticated;-- ============================================================
-- 50. DURATION-AWARE AVAILABLE TIME SLOTS
--     Accepts p_duration_minutes so customers see blocks that
--     match the total duration of their selected services
--     (e.g. a 40-min service produces 8:00-8:40, 8:30-9:10, ...).
--     Start candidates remain on 30-min boundaries; a candidate
--     is returned only if the provider is free for the ENTIRE
--     [start, start + duration) window (schedule blocks, breaks,
--     and existing bookings all checked).
-- ============================================================
drop function if exists public.get_available_time_slots(p_provider_id uuid, p_date date);

create or replace function public.get_available_time_slots(
  p_provider_id uuid,
  p_date date,
  p_duration_minutes int default 30
)
returns table (
  start_time text,
  end_time text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text;
  v_schedule jsonb;
  v_day_schedule jsonb;
  v_start_min int;
  v_end_min int;
  v_slot_min int;
  v_step_min int := 30;
  v_minute int;
  v_end_time text;
begin
  v_day := lower(to_char(p_date, 'Day'));
  v_day := trim(v_day);

  -- Slot block length = total duration of requested services (min 30 min)
  v_slot_min := greatest(coalesce(p_duration_minutes, 30), 30);

  -- Get provider schedule
  select schedule into v_schedule from public.service_providers where id = p_provider_id;

  -- Check availability override
  if exists (
    select 1 from public.provider_availability
    where provider_id = p_provider_id and date = p_date and is_available = false
  ) then
    return;
  end if;

  -- Get schedule for the day
  v_day_schedule := (
    select jsonb_agg(s) from jsonb_array_elements(coalesce(v_schedule, '[]'::jsonb)) s
    where lower(s->>'day') = v_day
  );

  if v_day_schedule is null then
    return;
  end if;

  v_day_schedule := v_day_schedule->0;
  if (v_day_schedule->>'is_working')::boolean = false then
    return;
  end if;

  v_start_min := (split_part(v_day_schedule->>'start_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'start_time', ':', 2)::int;
  v_end_min := (split_part(v_day_schedule->>'end_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'end_time', ':', 2)::int;

  v_minute := v_start_min;
  while v_minute + v_slot_min <= v_end_min loop
    v_end_time := lpad(((v_minute + v_slot_min) / 60)::text, 2, '0') || ':' || lpad(((v_minute + v_slot_min) % 60)::text, 2, '0');

    -- Check schedule block (break / day-off / holiday) conflicts
    if exists (
      select 1 from public.schedule_blocks sb
      where sb.provider_id = p_provider_id
        and sb.date = p_date
        and sb.start_time <= v_end_time
        and sb.end_time > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      v_minute := v_minute + v_step_min;
      continue;
    end if;

    -- Check if slot overlaps with a scheduled break
    if exists (
      select 1
      from jsonb_array_elements(coalesce(v_day_schedule->'breaks', '[]'::jsonb)) b
      where b->>'start' <= v_end_time
        and b->>'end' > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      v_minute := v_minute + v_step_min;
      continue;
    end if;

    -- Check existing bookings conflict across the ENTIRE [start, start+duration) window
    if not exists (
      select 1 from public.bookings b
      where b.provider_id = p_provider_id and b.date = p_date
        and b.status in ('pending', 'confirmed')
        and b.time_slot < v_end_time
        and coalesce(b.end_time, to_char(to_timestamp(b.time_slot, 'HH12:MI AM') + (b.duration_minutes || ' minutes')::interval, 'HH24:MI')) > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      start_time := lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0');
      end_time := v_end_time;
      return next;
    end if;

    v_minute := v_minute + v_step_min;
  end loop;
end;
$$;

grant execute on function public.get_available_time_slots(uuid, date, int) to anon, authenticated;-- ============================================================
-- 51. FIX payment_status ENUM CAST in create_booking
--     The CASE expression returns text; the bookings.payment_status
--     column is the payment_status enum. Postgres requires an
--     explicit cast in plpgsql inserts.
-- ============================================================
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids uuid[],
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_special_requests text default null,
  p_deposit_paid_ksh numeric default 0,
  p_payment_method text default 'unpaid',
  p_require_payment boolean default false,
  p_payment_ref text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals jsonb;
  v_booking public.bookings;
  v_reference text;
  v_receipt_code text;
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
  v_status booking_status := 'confirmed';
  v_service_id uuid;
  v_payment_status payment_status;
begin
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  v_deposit := greatest(coalesce(p_deposit_paid_ksh, 0), ceil(v_price * 0.5));
  v_deposit := least(v_deposit, v_price);
  v_remaining := greatest(0, v_price - v_deposit);

  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  -- Generate unique 6-char receipt code (A-Z0-9, no ambiguous chars)
  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

  -- Phone harvesting: create customer if not exists, else update
  select id into v_customer_id from public.customers
  where phone = p_customer_phone and business_id = v_business_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    returning id into v_customer_id;
  else
    update public.customers set
      total_visits = total_visits + 1,
      last_visit_date = p_date,
      email = coalesce(p_customer_email, email),
      updated_at = now()
    where id = v_customer_id;
  end if;

  if p_require_payment then
    v_status := 'pending';
    v_payment_status := 'unpaid'::payment_status;
  elsif v_remaining = 0 then
    v_payment_status := 'paid'::payment_status;
  elsif v_deposit > 0 then
    v_payment_status := 'deposit-paid'::payment_status;
  else
    v_payment_status := 'unpaid'::payment_status;
  end if;

  insert into public.bookings (
    reference_number, receipt_code, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id, mpesa_receipt_number
  )
  values (
    v_reference, v_receipt_code, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, v_deposit, v_remaining,
    v_status, v_payment_status, p_payment_method,
    p_special_requests, v_business_id, p_payment_ref
  )
  returning * into v_booking;

  if v_booking.id is not null and p_service_ids is not null then
    foreach v_service_id in array p_service_ids loop
      insert into public.booking_services (booking_id, service_id)
      values (v_booking.id, v_service_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_booking;
end;
$$;

-- ============================================================
-- 52. RECEIPT CODE COLUMN (unique, 6-char alpha-numeric)
-- ============================================================
alter table public.bookings
  add column if not exists receipt_code text unique;

do $$
declare
  r record;
  rc text;
begin
  for r in select id from public.bookings where receipt_code is null loop
    loop
      rc := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      rc := translate(rc, 'O01I', 'ABCD');
      exit when not exists (select 1 from public.bookings where receipt_code = rc);
    end loop;
    update public.bookings set receipt_code = rc where id = r.id;
  end loop;
end $$;-- ============================================================
-- 53. SMS MESSAGES LOG TABLE
--     Records every SMS sent (Africa's Talking) with customer,
--     receipt linkage, provider status, and admin audit fields.
-- ============================================================
create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  receipt_code text,
  to_phone text not null,
  customer_name text,
  message_body text not null,
  sms_type text not null default 'receipt',
  status text not null default 'pending',
  provider text not null default 'africastalking',
  provider_message_id text,
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_sms_messages_booking on public.sms_messages(booking_id);
create index if not exists idx_sms_messages_phone on public.sms_messages(to_phone);
create index if not exists idx_sms_messages_receipt on public.sms_messages(receipt_code);
create index if not exists idx_sms_messages_created on public.sms_messages(created_at desc);

alter table public.sms_messages enable row level security;

drop policy if exists "Staff can view sms_messages" on public.sms_messages;
create policy "Staff can view sms_messages" on public.sms_messages
  for select using (public.is_staff());

drop policy if exists "Admin can manage sms_messages" on public.sms_messages;
create policy "Admin can manage sms_messages" on public.sms_messages
  for all using (public.is_admin());

-- ============================================================
-- 54. RECEIPT LOOKUP -- instant retrieval by 6-char code
-- ============================================================
create or replace function public.get_booking_by_receipt(p_receipt_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_services jsonb;
begin
  if p_receipt_code is null or length(trim(p_receipt_code)) < 4 then
    return null;
  end if;

  select * into v_booking
  from public.bookings
  where upper(trim(receipt_code)) = upper(trim(p_receipt_code))
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'duration_minutes', s.duration_minutes,
    'price_ksh', s.price_ksh
  ) order by s.name), '[]'::jsonb)
  into v_services
  from public.services s
  where s.id = any(v_booking.service_ids);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'reference_number', v_booking.reference_number,
    'receipt_code', v_booking.receipt_code,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'customer_email', v_booking.customer_email,
    'provider_id', v_booking.provider_id,
    'provider_name', v_booking.provider_name,
    'date', v_booking.date,
    'time_slot', v_booking.time_slot,
    'end_time', v_booking.end_time,
    'duration_minutes', v_booking.duration_minutes,
    'service_names', v_booking.service_names,
    'services', v_services,
    'total_price_ksh', v_booking.total_price_ksh,
    'deposit_paid_ksh', v_booking.deposit_paid_ksh,
    'remaining_balance_ksh', v_booking.remaining_balance_ksh,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status,
    'special_requests', v_booking.special_requests,
    'mpesa_receipt_number', v_booking.mpesa_receipt_number
  );
end;
$$;

grant execute on function public.get_booking_by_receipt(text) to anon, authenticated;

-- ============================================================
-- 55. HELPER: Store an SMS log row (used by send-sms edge fn)
-- ============================================================
create or replace function public.log_sms_message(
  p_booking_id uuid,
  p_receipt_code text,
  p_to_phone text,
  p_customer_name text,
  p_message_body text,
  p_sms_type text default 'receipt',
  p_status text default 'pending',
  p_provider text default 'africastalking',
  p_provider_message_id text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.sms_messages (
    booking_id, receipt_code, to_phone, customer_name, message_body,
    sms_type, status, provider, provider_message_id, error_message,
    sent_by, business_id, sent_at
  )
  values (
    p_booking_id, p_receipt_code, p_to_phone, p_customer_name, p_message_body,
    p_sms_type, p_status, p_provider, p_provider_message_id, p_error_message,
    auth.uid(), v_business_id,
    case when p_status = 'sent' then now() else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_sms_message(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
