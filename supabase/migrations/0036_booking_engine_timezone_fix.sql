-- Fix: booking engine timezone handling
-- Only the booking START time must fall within business hours.
-- Services may run past closing time.

drop function if exists public.get_booked_slots(uuid, date);

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
  select * into v_exc from public.staff_schedule_exceptions
  where provider_id = p_provider_id and date = p_date limit 1;
  if found then
    if v_exc.exception_type in ('ABSENT','LEAVE') then return; end if;
    if v_exc.exception_type = 'SPECIAL_WORKING_DAY' and v_exc.start_time is not null then
      v_start := v_exc.start_time; v_end := v_exc.end_time; v_working := true;
    end if;
  end if;

  if v_start is null then
    select start_time, end_time, is_working into v_start, v_end, v_working
    from public.staff_schedules
    where provider_id = p_provider_id and weekday = v_dow;
    if not found or not v_working then return; end if;
  end if;

  v_windows := array[tstzrange(
    ((p_date::text || ' ' || v_start::text)::timestamp at time zone 'Africa/Nairobi'),
    ((p_date::text || ' ' || v_end::text)::timestamp at time zone 'Africa/Nairobi'), '[)')];

  for v_win in
    select tstzrange(
      ((p_date::text || ' ' || b.start_time::text)::timestamp at time zone 'Africa/Nairobi'),
      ((p_date::text || ' ' || b.end_time::text)::timestamp at time zone 'Africa/Nairobi'), '[)')
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

  for v_win in
    select tstzrange(b.start_ts, b.end_ts, '[)')
    from public.bookings b
    join public.booking_resources br on br.booking_id = b.id
    where br.provider_id = p_provider_id
      and b.status in ('pending','confirmed')
      and (b.start_ts at time zone 'Africa/Nairobi')::date = p_date
  loop
    v_remove := v_remove || v_win;
  end loop;

  for v_win in select * from unnest(public.fn_subtract_windows(v_windows, v_remove)) loop
    if not isempty(v_win) then
      start_ts := lower(v_win); end_ts := upper(v_win);
      return next;
    end if;
  end loop;
end;
$$;

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
  v_step int := 15;
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
        staff_name := v_staff.full_name;
        return next;
        v_slot_start := v_slot_start + (v_step || ' minutes')::interval;
      end loop;
    end loop;
  end loop;
end;
$$;

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
  select * into v_service from public.services where id = p_service_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'SERVICE_NOT_FOUND');
  end if;

  v_desired_end := p_desired_start_ts + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes,0)) || ' minutes')::interval;
  v_desired_local_date := (p_desired_start_ts at time zone 'Africa/Nairobi')::date;
  v_desired_local_time := (p_desired_start_ts at time zone 'Africa/Nairobi')::time;
  v_desired_dow := extract(dow from v_desired_local_date)::int;

  -- Business hours: only START time must be within open hours
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

  if exists (
    select 1 from public.bookings
    where customer_id = p_customer_id
      and status in ('pending','confirmed')
      and start_ts < v_desired_end
      and end_ts > p_desired_start_ts
  ) then
    return jsonb_build_object('success', false, 'error', 'CUSTOMER_CONFLICT');
  end if;

  select * into v_staff
  from public.get_available_slots(p_service_id, v_desired_local_date, p_preferred_staff_ids)
  where start_ts = p_desired_start_ts
  limit 1;

  if not found then
    if exists (
      select 1 from public.get_available_slots(p_service_id, v_desired_local_date, p_preferred_staff_ids)
    ) then
      return jsonb_build_object('success', false, 'error', 'SLOT_UNAVAILABLE');
    else
      return jsonb_build_object('success', false, 'error', 'ROLE_UNAVAILABLE');
    end if;
  end if;

  if p_check_only then
    return jsonb_build_object(
      'success', true, 'available', true,
      'staff_id', v_staff.staff_id, 'staff_name', v_staff.staff_name,
      'start_ts', p_desired_start_ts, 'end_ts', v_desired_end
    );
  end if;

  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;
  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

  v_total := v_service.price_ksh;
  v_deposit := least(greatest(coalesce(0, ceil(v_total * 0.5)), 0), v_total);
  v_remaining := greatest(0, v_total - v_deposit);

  if p_require_payment then
    v_status := 'pending'; v_pay_status := 'unpaid'::payment_status;
  elsif v_remaining = 0 then v_pay_status := 'paid'::payment_status;
  elsif v_deposit > 0 then v_pay_status := 'deposit-paid'::payment_status;
  else v_pay_status := 'unpaid'::payment_status;
  end if;

  if p_customer_name is not null and p_customer_phone is not null then
    select id into v_customer_id from public.customers
    where phone = p_customer_phone and business_id = '00000000-0000-0000-0000-000000000001' limit 1;
    if v_customer_id is null then
      insert into public.customers (name, phone, email, business_id, total_visits)
      values (p_customer_name, p_customer_phone, p_customer_email, '00000000-0000-0000-0000-000000000001', 1)
      returning id into v_customer_id;
    end if;
  end if;

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

  insert into public.booking_resources (booking_id, provider_id, role_id)
  values (v_booking_id, v_staff.staff_id, (
    select id from public.staff_roles where code = (
      select provider_type::text from public.service_providers where id = v_staff.staff_id
    )
  ));

  insert into public.booking_services (booking_id, service_id)
  values (v_booking_id, p_service_id);

  return jsonb_build_object(
    'success', true, 'booking_id', v_booking_id,
    'reference_number', v_reference, 'receipt_code', v_receipt_code,
    'staff_id', v_staff.staff_id, 'staff_name', v_staff.staff_name,
    'start_ts', p_desired_start_ts, 'end_ts', v_desired_end,
    'total_price_ksh', v_total, 'deposit_paid_ksh', v_deposit,
    'remaining_balance_ksh', v_remaining, 'status', v_status,
    'payment_status', v_pay_status
  );
end;
$$;

create function public.get_booked_slots(
  p_provider_id uuid,
  p_date date
) returns table (time_slot text, end_time text, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    to_char(b.start_ts at time zone 'Africa/Nairobi', 'HH24:MI'),
    to_char(b.end_ts at time zone 'Africa/Nairobi', 'HH24:MI'),
    b.status::text
  from public.bookings b
  join public.booking_resources br on br.booking_id = b.id
  where br.provider_id = p_provider_id
    and b.status in ('pending', 'confirmed')
    and (b.start_ts at time zone 'Africa/Nairobi')::date = p_date
  order by b.start_ts;
end;
$$;

grant execute on function public.get_booked_slots to anon, authenticated;
grant execute on function public.check_and_reserve to anon, authenticated;
grant execute on function public.get_available_slots to anon, authenticated;