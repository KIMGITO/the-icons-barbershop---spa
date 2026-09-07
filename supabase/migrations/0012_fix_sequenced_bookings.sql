-- ============================================================
-- 0012_fix_sequenced_bookings.sql
-- Fix check_and_reserve_sequenced to correctly denormalize
-- ============================================================

create or replace function public.check_and_reserve_sequenced(
  p_customer_id uuid,
  p_legs public.booking_leg_input[],
  p_desired_start_ts timestamptz,
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
  v_leg_count int;
  v_total_duration int := 0;
  v_total_price numeric(10,2) := 0;
  v_service_ids uuid[] := '{}';
  v_service_names text[] := '{}';
  v_current_ts timestamptz := p_desired_start_ts;
  v_leg_start timestamptz;
  v_leg_end timestamptz;
  v_leg record;
  v_service record;
  v_booking_id uuid;
  v_reference text;
  v_receipt_code text;
  v_business_id uuid;
  v_status booking_status := 'confirmed';
  v_payment_status payment_status := 'unpaid';
  v_leg_results jsonb[] := '{}';
  v_i int;
  v_sorted_legs public.booking_leg_input[];
  v_customer_id uuid := p_customer_id;
  v_primary_provider_id uuid;
  v_primary_provider_name text;
begin
  if array_length(p_legs, 1) is null or array_length(p_legs, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'NO_SERVICES_SELECTED');
  end if;

  select business_id into v_business_id from public.services where id = (p_legs[1]).service_id;

  select array_agg((l.service_id, l.provider_id)::public.booking_leg_input order by s.sequence_rank, s.id)
  into v_sorted_legs
  from unnest(p_legs) l
  join public.services s on s.id = l.service_id;

  v_i := 0;
  foreach v_leg in array v_sorted_legs loop
    v_i := v_i + 1;
    select * into v_service from public.services where id = v_leg.service_id;
    
    if not exists (select 1 from public.service_providers where id = v_leg.provider_id) then
        return jsonb_build_object('success', false, 'error', 'STAFF_NOT_FOUND');
    end if;

    v_leg_start := v_current_ts;
    if v_service.duration_minutes = 30 then
      v_leg_end := v_leg_start + (v_service.duration_minutes || ' minutes')::interval;
    else
      v_leg_end := v_leg_start + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0)) || ' minutes')::interval;
    end if;

    if not public.fn_is_staff_available(v_leg.provider_id, v_leg_start, v_leg_end) then
      return jsonb_build_object('success', false, 'error', 'SLOT_UNAVAILABLE');
    end if;

    v_total_duration := v_total_duration + v_service.duration_minutes;
    v_total_price := v_total_price + v_service.price_ksh;
    v_service_ids := array_append(v_service_ids, v_service.id);
    v_service_names := array_append(v_service_names, v_service.name);

    if v_i = 1 then
      v_primary_provider_id := v_leg.provider_id;
      select full_name into v_primary_provider_name from public.service_providers where id = v_leg.provider_id;
    end if;

    v_current_ts := v_leg_end;
  end loop;

  if p_check_only then
    return jsonb_build_object('success', true, 'total_price_ksh', v_total_price, 'duration_minutes', v_total_duration);
  end if;

  v_reference := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_receipt_code := v_reference;

  if p_require_payment then
    v_status := 'pending';
    v_payment_status := 'pending';
  end if;

  insert into public.bookings (
    customer_id, customer_name, customer_phone, customer_email, 
    reference_number, receipt_code, date, time_slot, end_time, 
    duration_minutes, total_price_ksh, deposit_paid_ksh, remaining_balance_ksh, 
    status, payment_status, payment_method, special_requests, 
    business_id, payment_ref, start_ts, end_ts,
    provider_id, provider_name, service_ids, service_names
  )
  values (
    v_customer_id, p_customer_name, p_customer_phone, p_customer_email, 
    v_reference, v_receipt_code, p_desired_start_ts::date, 
    to_char(p_desired_start_ts at time zone 'Africa/Nairobi', 'HH24:MI'), 
    to_char(v_current_ts at time zone 'Africa/Nairobi', 'HH24:MI'), 
    v_total_duration, v_total_price, 0, v_total_price, 
    v_status, v_payment_status, p_payment_method, p_special_requests, 
    v_business_id, p_payment_ref, p_desired_start_ts, v_current_ts,
    v_primary_provider_id, v_primary_provider_name, v_service_ids, v_service_names
  )
  returning id into v_booking_id;

  v_i := 0; v_current_ts := p_desired_start_ts;
  foreach v_leg in array v_sorted_legs loop
    v_i := v_i + 1; 
    select * into v_service from public.services where id = v_leg.service_id;
    v_leg_start := v_current_ts;
    if v_service.duration_minutes = 30 then 
      v_leg_end := v_leg_start + (v_service.duration_minutes || ' minutes')::interval;
    else 
      v_leg_end := v_leg_start + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0)) || ' minutes')::interval; 
    end if;
    
    insert into public.booking_legs (booking_id, service_id, provider_id, start_ts, end_ts, sequence_order)
    values (v_booking_id, v_leg.service_id, v_leg.provider_id, v_leg_start, v_leg_end, v_i);
    
    insert into public.booking_services (booking_id, service_id) 
    values (v_booking_id, v_leg.service_id);
    
    insert into public.booking_resources (booking_id, provider_id, role_id)
    values (
      v_booking_id, 
      v_leg.provider_id, 
      (select id from public.staff_roles where code = (select provider_type::text from public.service_providers where id = v_leg.provider_id))
    );
    
    v_current_ts := v_leg_end;
  end loop;

  return jsonb_build_object(
    'success', true, 
    'booking_id', v_booking_id, 
    'reference_number', v_reference, 
    'receipt_code', v_receipt_code, 
    'start_ts', p_desired_start_ts, 
    'end_ts', v_current_ts, 
    'total_price_ksh', v_total_price, 
    'status', v_status, 
    'payment_status', v_payment_status,
    'deposit_paid_ksh', 0,
    'remaining_balance_ksh', v_total_price
  );
end;
$$;
