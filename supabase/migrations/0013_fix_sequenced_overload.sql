-- ============================================================
-- Fixes: "Could not choose the best candidate function" caused by
-- 0012 creating a second overload of check_and_reserve_sequenced
-- (jsonb) instead of replacing the 0011 one (booking_leg_input[]),
-- since CREATE OR REPLACE only replaces on an exact type match.
--
-- Also restores regressions introduced in 0012 vs 0011:
--   - insert referenced a non-existent "payment_ref" column
--     (the real column is mpesa_receipt_number)
--   - booking date was computed without the Africa/Nairobi
--     timezone conversion
--   - guest customers (p_customer_id is null) were never
--     created/updated in public.customers
--   - reference_number and receipt_code ended up identical
-- ============================================================

-- 1. Drop the stale array-typed overload from 0011 by exact signature.
drop function if exists public.check_and_reserve_sequenced(
  uuid,
  public.booking_leg_input[],
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  boolean,
  text,
  text
);

-- 2. Recreate the single canonical (jsonb) version, merging 0011's
--    correct data handling with 0012's validation additions.
create or replace function public.check_and_reserve_sequenced(
  p_customer_id uuid,
  p_legs jsonb,
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
  v_business_count int;
  v_status booking_status := 'confirmed';
  v_payment_status payment_status := 'unpaid';
  v_leg_results jsonb[] := '{}';
  v_i int;
  v_sorted_legs public.booking_leg_input[];
  v_customer_id uuid := p_customer_id;
  v_primary_provider_id uuid;
  v_primary_provider_name text;
  v_role_id uuid;
begin
  if p_legs is null or jsonb_array_length(p_legs) = 0 then
    return jsonb_build_object('success', false, 'error', 'NO_SERVICES_SELECTED');
  end if;

  -- Parse and sort legs by each service's sequence_rank (never trust client order).
  select array_agg(( (l->>'service_id')::uuid, (l->>'provider_id')::uuid )::public.booking_leg_input order by s.sequence_rank, s.id)
  into v_sorted_legs
  from jsonb_array_elements(p_legs) l
  join public.services s on s.id = (l->>'service_id')::uuid;

  if v_sorted_legs is null or array_length(v_sorted_legs, 1) is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_SERVICE_IDS');
  end if;

  -- All services in one booking must belong to the same business.
  -- (uuid has no built-in min()/max() aggregate, so count distinct
  -- separately and just take any one business_id once confirmed unique.)
  select count(distinct business_id)
  into v_business_count
  from public.services
  where id = any(select (l).service_id from unnest(v_sorted_legs) l);

  if v_business_count > 1 then
    return jsonb_build_object('success', false, 'error', 'MULTIPLE_BUSINESSES');
  end if;

  select business_id into v_business_id
  from public.services
  where id = (v_sorted_legs[1]).service_id;

  v_i := 0;
  foreach v_leg in array v_sorted_legs loop
    v_i := v_i + 1;
    select * into v_service from public.services where id = v_leg.service_id;

    if not exists (select 1 from public.service_providers where id = v_leg.provider_id) then
      return jsonb_build_object('success', false, 'error', 'STAFF_NOT_FOUND', 'leg_index', v_i);
    end if;

    v_leg_start := v_current_ts;
    if v_service.duration_minutes = 30 then
      v_leg_end := v_leg_start + (v_service.duration_minutes || ' minutes')::interval;
    else
      v_leg_end := v_leg_start + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0)) || ' minutes')::interval;
    end if;

    if not public.fn_is_staff_available(v_leg.provider_id, v_leg_start, v_leg_end) then
      return jsonb_build_object('success', false, 'error', 'SLOT_UNAVAILABLE', 'conflicting_service_id', v_leg.service_id, 'conflicting_provider_id', v_leg.provider_id, 'leg_index', v_i);
    end if;

    if v_customer_id is not null and exists (
      select 1 from public.bookings b
      where b.customer_id = v_customer_id and b.status in ('pending', 'confirmed', 'completed')
        and tstzrange(b.start_ts, b.end_ts) && tstzrange(v_leg_start, v_leg_end)
    ) then
      return jsonb_build_object('success', false, 'error', 'CUSTOMER_CONFLICT');
    end if;

    if v_i = 1 then
      v_primary_provider_id := v_leg.provider_id;
      select full_name into v_primary_provider_name from public.service_providers where id = v_leg.provider_id;
    end if;

    v_total_duration := v_total_duration + v_service.duration_minutes;
    v_total_price := v_total_price + coalesce(v_service.price_ksh, 0);
    v_service_ids := array_append(v_service_ids, v_service.id);
    v_service_names := array_append(v_service_names, v_service.name);
    v_leg_results := array_append(v_leg_results, jsonb_build_object('service_id', v_leg.service_id, 'provider_id', v_leg.provider_id, 'start_ts', v_leg_start, 'end_ts', v_leg_end, 'sequence_order', v_i));
    v_current_ts := v_leg_end;
  end loop;

  if p_check_only then
    return jsonb_build_object('success', true, 'total_price_ksh', v_total_price, 'total_duration_minutes', v_total_duration, 'start_ts', p_desired_start_ts, 'end_ts', v_current_ts, 'legs', to_jsonb(v_leg_results));
  end if;

  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;
  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

  if v_customer_id is null then
    -- No unique/exclusion constraint exists on (phone, business_id) in this
    -- schema, so ON CONFLICT can't be used here -- do an explicit
    -- find-then-insert-or-update instead.
    if p_customer_phone is not null then
      select id into v_customer_id from public.customers
      where phone = p_customer_phone and business_id = v_business_id
      limit 1;
    end if;

    if v_customer_id is not null then
      update public.customers
      set total_visits = total_visits + 1, last_visit_date = now(),
          email = coalesce(p_customer_email, email), updated_at = now()
      where id = v_customer_id;
    else
      insert into public.customers (name, phone, email, business_id, total_visits, last_visit_date)
      values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1, now())
      returning id into v_customer_id;
    end if;
  else
    update public.customers set total_visits = total_visits + 1, last_visit_date = now(), email = coalesce(p_customer_email, email), updated_at = now() where id = v_customer_id;
  end if;

  if p_require_payment then
    v_status := 'pending';
    v_payment_status := 'unpaid';
  end if;

  insert into public.bookings (
    reference_number, receipt_code, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method, special_requests,
    business_id, mpesa_receipt_number, start_ts, end_ts
  )
  values (
    v_reference, v_receipt_code, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    v_service_ids, v_service_names, v_primary_provider_id, coalesce(v_primary_provider_name, ''),
    (p_desired_start_ts at time zone 'Africa/Nairobi')::date,
    to_char(p_desired_start_ts at time zone 'Africa/Nairobi', 'HH24:MI'),
    to_char(v_current_ts at time zone 'Africa/Nairobi', 'HH24:MI'),
    v_total_duration, v_total_price, 0, v_total_price,
    v_status, v_payment_status, p_payment_method, p_special_requests,
    v_business_id, p_payment_ref, p_desired_start_ts, v_current_ts
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
    values (v_booking_id, v_leg.service_id) on conflict do nothing;

    select id into v_role_id from public.staff_roles
    where code = (select provider_type::text from public.service_providers where id = v_leg.provider_id);

    if v_role_id is not null then
      insert into public.booking_resources (booking_id, provider_id, role_id)
      values (v_booking_id, v_leg.provider_id, v_role_id) on conflict do nothing;
    end if;

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
    'remaining_balance_ksh', v_total_price);

    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;