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
$$;