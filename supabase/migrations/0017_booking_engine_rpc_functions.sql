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
