-- ============================================================
-- 45. 5-MINUTE INTERVAL & CONDITIONAL BUFFER REMOVAL
--
-- Change Summary:
--   * Update get_available_slots to use 5-minute intervals.
--   * Update check_and_reserve to ignore buffer time for
--     services that are exactly 30 minutes.
-- ============================================================

-- 45.1 Update get_available_slots to use 5-minute intervals
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
  v_step int := 5; -- Changed from 15 to 5
begin
  select * into v_service from public.services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;

  -- Conditional buffer removal: if duration is exactly 30, ignore buffer
  if v_service.duration_minutes = 30 then
    v_total_min := 30;
  else
    v_total_min := v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0);
  end if;

  for v_staff in
    select sp.id, sp.full_name
    from public.service_providers sp
    where sp.status = 'active'
      and exists (
        select 1 from public.provider_services ps
        where ps.provider_id = sp.id and ps.service_id = p_service_id
      )
      and (p_preferred_staff_ids is null or sp.id = any(p_preferred_staff_ids))
    order by case when p_preferred_staff_ids is not null and sp.id = any(p_preferred_staff_ids) then 0 else 1 end,
             sp.full_name
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

-- 45.2 Update check_and_reserve to ignore buffer for 30-min services
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
  p_payment_ref text default null,
  p_service_ids uuid[] default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_service_ids uuid[];
  v_service_count int;
  v_duration_min int;
  v_total_min int;
  v_total numeric(10,2);
  v_names text[];
  v_desired_end timestamptz;
  v_desired_local_date date;
  v_desired_local_time time;
  v_desired_dow int;
  v_staff record;
  v_staff_found boolean := false;
  v_any_qualified boolean := false;
  v_booking_id uuid;
  v_reference text;
  v_receipt_code text;
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
  v_status booking_status := 'confirmed';
  v_pay_status payment_status;
  v_customer_id uuid := p_customer_id;
begin
  -- Resolve the service list (multi-service capable; falls back to single)
  v_service_ids := coalesce(
    (select array_agg(distinct sid) from unnest(p_service_ids) as t(sid) where sid is not null),
    case when p_service_id is null then null else array[p_service_id] end
  );

  if v_service_ids is null or array_length(v_service_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'SERVICE_NOT_FOUND');
  end if;

  -- Conditional buffer logic: if ANY service in the bundle is 30 mins, 
  -- or specifically handle the 30-min rule. 
  -- The requirement says "if a services goes for 30 minues, dont add even a single buffer time".
  -- We'll calculate v_total_min by checking each service.
  
  select count(*),
         coalesce(sum(s.duration_minutes), 0),
         coalesce(sum(
           case 
             when s.duration_minutes = 30 then s.duration_minutes 
             else s.duration_minutes + coalesce(s.buffer_minutes, 0) 
           end
         ), 0),
         coalesce(sum(s.price_ksh), 0),
         coalesce(array_agg(s.name order by s.name), '{}'::text[])
    into v_service_count, v_duration_min, v_total_min, v_total, v_names
  from public.services s
  where s.id = any(v_service_ids) and s.status = 'active';

  if v_service_count is null or v_service_count <> array_length(v_service_ids, 1) then
    return jsonb_build_object('success', false, 'error', 'SERVICE_NOT_FOUND');
  end if;

  v_desired_end := p_desired_start_ts + (v_total_min || ' minutes')::interval;
  v_desired_local_date := (p_desired_start_ts at time zone 'Africa/Nairobi')::date;
  v_desired_local_time := (p_desired_start_ts at time zone 'Africa/Nairobi')::time;
  v_desired_dow := extract(dow from v_desired_local_date)::int;

  -- Business hours: only the START time must be within open hours
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

  -- Customer conflict
  if p_customer_id is not null and exists (
    select 1 from public.bookings
    where customer_id = p_customer_id
      and status in ('pending','confirmed')
      and start_ts < v_desired_end
      and end_ts > p_desired_start_ts
  ) then
    return jsonb_build_object('success', false, 'error', 'CUSTOMER_CONFLICT');
  end if;

  -- Find a qualified, available provider.
  v_staff := null;
  for v_staff in
    select sp.id, sp.full_name
    from public.service_providers sp
    where sp.status = 'active'
      and (p_preferred_staff_ids is null or sp.id = any(p_preferred_staff_ids))
      and (
        select count(distinct ps.service_id)
        from public.provider_services ps
        where ps.provider_id = sp.id and ps.service_id = any(v_service_ids)
      ) = array_length(v_service_ids, 1)
    order by case when p_preferred_staff_ids is not null and sp.id = any(p_preferred_staff_ids) then 0 else 1 end,
             sp.full_name
  loop
    v_any_qualified := true;
    if public.fn_is_staff_available(v_staff.id, p_desired_start_ts, v_desired_end) then
      v_staff_found := true;
      exit;
    end if;
  end loop;

  if not v_staff_found then
    if not v_any_qualified then
      return jsonb_build_object('success', false, 'error', 'ROLE_UNAVAILABLE');
    end if;
    return jsonb_build_object('success', false, 'error', 'SLOT_UNAVAILABLE');
  end if;

  if p_check_only then
    return jsonb_build_object(
      'success', true, 'available', true,
      'staff_id', v_staff.id, 'staff_name', v_staff.full_name,
      'start_ts', p_desired_start_ts, 'end_ts', v_desired_end
    );
  end if;

  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;
  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

  -- Pricing across ALL selected services (50% deposit, same as UI)
  v_deposit := least(greatest(ceil(v_total * 0.5), 0), v_total);
  v_remaining := greatest(0, v_total - v_deposit);

  if p_require_payment then
    v_status := 'pending'; v_pay_status := 'unpaid'::payment_status;
  elsif v_remaining = 0 then v_pay_status := 'paid'::payment_status;
  elsif v_deposit > 0 then v_pay_status := 'deposit-paid'::payment_status;
  else v_pay_status := 'unpaid'::payment_status;
  end if;

  -- Create/lookup customer
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
    v_service_ids, v_names, v_staff.id, v_staff.full_name,
    v_desired_local_date,
    to_char(p_desired_start_ts at time zone 'Africa/Nairobi', 'HH12:MI AM'),
    to_char(v_desired_end at time zone 'Africa/Nairobi', 'HH12:MI AM'),
    v_duration_min,
    v_total, v_deposit, v_remaining,
    v_status, v_pay_status, p_payment_method,
    p_special_requests, '00000000-0000-0000-0000-000000000001', p_payment_ref,
    p_desired_start_ts, v_desired_end
  ) returning id into v_booking_id;

  insert into public.booking_resources (booking_id, provider_id, role_id)
  values (v_booking_id, v_staff.id, (
    select id from public.staff_roles where code = (
      select provider_type::text from public.service_providers where id = v_staff.id
    )
  ));

  insert into public.booking_services (booking_id, service_id)
  select v_booking_id, x.service_id
  from unnest(v_service_ids) as x(service_id);

  return jsonb_build_object(
    'success', true, 'booking_id', v_booking_id,
    'reference_number', v_reference, 'receipt_code', v_receipt_code,
    'staff_id', v_staff.id, 'staff_name', v_staff.full_name,
    'start_ts', p_desired_start_ts, 'end_ts', v_desired_end,
    'total_price_ksh', v_total, 'deposit_paid_ksh', v_deposit,
    'remaining_balance_ksh', v_remaining, 'status', v_status,
    'payment_status', v_pay_status
  );
end;
$$;
