-- ============================================================
-- 77. UNIFY TIME SYSTEM: Fix timezone bug, retain 15-min intervals
--
-- Root cause of "BUSINESS_CLOSED" false positive:
--   1. check_and_reserve required the booking END time to fall within
--      business hours (close_time >= end_local_time). This rejected
--      valid bookings that start before closing but run past it.
--   2. The weekday convention in business_hours must match PostgreSQL's
--      extract(dow from ...) which returns 0=Sunday .. 6=Saturday.
--
-- Fixes:
--   1. Business-hours check now only requires the START time to be
--      within business hours (open_time <= start_local_time AND
--      start_local_time < close_time). The service may run past closing.
--   2. Retains 15-minute slot intervals (v_step = 15).
--   3. All timestamps are explicitly handled in Africa/Nairobi.
-- ============================================================

-- ------------------------------------------------------------
-- check_and_reserve: fix the business-hours check to only require
-- the START time to be within business hours. The service is allowed
-- to run past closing time as long as it begins before close.
-- ------------------------------------------------------------
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
  v_desired_local_date date;
  v_desired_local_time time;
  v_desired_dow int;
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
begin
  -- Load service
  select * into v_service from public.services where id = p_service_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'SERVICE_NOT_FOUND');
  end if;

  v_desired_end := p_desired_start_ts + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes,0)) || ' minutes')::interval;

  -- Resolve Nairobi-local calendar date, time, and weekday for this instant.
  -- A booking at 00:30 Nairobi time is 21:30 UTC the previous day, so a
  -- plain ::date cast (session tz = UTC) would resolve to the wrong day.
  v_desired_local_date := (p_desired_start_ts at time zone 'Africa/Nairobi')::date;
  v_desired_local_time := (p_desired_start_ts at time zone 'Africa/Nairobi')::time;
  -- extract(dow from date) returns 0=Sunday, 1=Monday, ..., 6=Saturday
  v_desired_dow := extract(dow from v_desired_local_date)::int;

  -- Check business hours — only the START time must be within business
  -- hours. The service is allowed to run past closing time.
  if not exists (
    select 1 from public.business_hours bh
    where bh.business_id = '00000000-0000-0000-0000-000000000001'
      and bh.weekday = v_desired_dow
      and bh.is_open
      and bh.open_time <= v_desired_local_time
      and bh.close_time > v_desired_local_time
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
  from public.get_available_slots(p_service_id, v_desired_local_date, p_preferred_staff_ids)
  where start_ts = p_desired_start_ts
  limit 1;

  if not found then
    -- Check if any staff is available at all (for better error message)
    if exists (
      select 1 from public.get_available_slots(p_service_id, v_desired_local_date, p_preferred_staff_ids)
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
    v_desired_local_date,
    to_char(p_desired_start_ts at time zone 'Africa/Nairobi', 'HH12:MI AM'),
    to_char(v_desired_end at time zone 'Africa/Nairobi', 'HH12:MI AM'),
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
end;
$$;

-- ------------------------------------------------------------
-- get_available_slots: retain 15-minute step (unchanged behavior)
-- but ensure Nairobi timezone consistency
-- ------------------------------------------------------------
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date date,
  p_preferred_staff_ids uuid[] default null
) returns table (start_ts timestamptz, end_ts timestamptz, staff_id uuid, staff_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_service record;
  v_staff record;
  v_free record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_total_min int;
  v_step int := 15;  -- 15-minute intervals (retained)
begin
  select * into v_service from public.services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;

  v_total_min := v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0);

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
    for v_free in select * from public.fn_get_staff_free_windows(v_staff.id, p_date) loop
      v_slot_start := v_free.start_ts;
      while v_slot_start + (v_total_min || ' minutes')::interval <= v_free.end_ts loop
        v_slot_end := v_slot_start + (v_total_min || ' minutes')::interval;
        start_ts := v_slot_start;
        end_ts := v_slot_end;
        staff_id := v_staff.id;
        staff_name := v_staff.staff_name;
        return next;
        v_slot_start := v_slot_start + (v_step || ' minutes')::interval;
      end loop;
    end loop;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- get_booked_slots: ensure returned times are in Nairobi timezone
-- Uses HH24:MI format for consistency
-- Drop first because return type may differ (booking_status enum vs text)
-- ------------------------------------------------------------
drop function if exists public.get_booked_slots(uuid, date);
create function public.get_booked_slots(
  p_provider_id uuid,
  p_date date
) returns table (time_slot text, end_time text, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    to_char(b.start_ts at time zone 'Africa/Nairobi', 'HH24:MI') as time_slot,
    to_char(b.end_ts at time zone 'Africa/Nairobi', 'HH24:MI') as end_time,
    b.status::text
  from public.bookings b
  join public.booking_resources br on br.booking_id = b.id
  where br.provider_id = p_provider_id
    and b.status in ('pending', 'confirmed')
    and (b.start_ts at time zone 'Africa/Nairobi')::date = p_date
  order by b.start_ts;
end;
$$;

-- ------------------------------------------------------------
-- Grant execute permissions
-- ------------------------------------------------------------
grant execute on function public.get_booked_slots to anon, authenticated;
grant execute on function public.check_and_reserve to anon, authenticated;
grant execute on function public.get_available_slots to anon, authenticated;