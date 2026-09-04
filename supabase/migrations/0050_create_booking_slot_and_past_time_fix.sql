-- 0050_create_booking_slot_and_past_time_fix.sql
--
-- Two bugs in create_booking (staff/provider booking a client directly):
--
-- BUG 1: Past times were accepted with no validation at all — nothing in
-- the function ever compared the requested start time against now().
--
-- BUG 2: The booking never appeared as "booked" on the client-facing
-- booking page. The availability engine (fn_get_staff_free_windows,
-- called by get_available_slots) excludes a slot only when it finds a
-- matching row via:
--     bookings b join booking_resources br on br.booking_id = b.id
--     where br.provider_id = ... and b.start_ts/b.end_ts fall on the date
-- create_booking populated date/time_slot/duration_minutes but NEVER
-- wrote start_ts/end_ts, and never inserted into booking_resources at
-- all. So the booking existed and correctly blocked itself from
-- double-booking (the separate prevent_provider_overlap trigger has its
-- own date/time_slot fallback and doesn't need booking_resources) — but
-- was completely invisible to the client-facing "which slots are open"
-- calculation.
--
-- Fix: compute start_ts/end_ts once (Africa/Nairobi), reject the booking
-- if that's in the past, store start_ts/end_ts on the row, and insert
-- the booking_resources row exactly the way check_and_reserve does.

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
  v_service_names text[];
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  if not public.is_staff() then
    raise exception 'Only staff may create a booking directly.' using errcode = '42501';
  end if;

  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  select coalesce(array_agg(x), '{}'::text[])
  into v_service_names
  from jsonb_array_elements_text(v_totals->'service_names') as x;

  -- Build the authoritative start/end timestamp (Africa/Nairobi) from the
  -- date + "10:00 AM"-style time slot.
  v_start_ts := (
    p_date::text || ' ' || to_char(to_timestamp(p_time_slot, 'HH12:MI AM'), 'HH24:MI')
  )::timestamp at time zone 'Africa/Nairobi';
  v_end_ts := v_start_ts + (v_duration || ' minutes')::interval;

  -- BUG 1 FIX: refuse to book a time that has already passed.
  if v_start_ts < now() then
    raise exception 'Cannot create a booking in the past. Please choose a current or future time.' using errcode = 'P0001';
  end if;

  v_deposit := greatest(coalesce(p_deposit_paid_ksh, 0), case when p_require_payment then ceil(v_price * 0.5) else 0 end);
  v_deposit := least(v_deposit, v_price);
  v_remaining := greatest(0, v_price - v_deposit);

  v_end_time := to_char(v_end_ts at time zone 'Africa/Nairobi', 'HH24:MI');
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  loop
    v_receipt_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_receipt_code := translate(v_receipt_code, 'O01I', 'ABCD');
    exit when not exists (select 1 from public.bookings where receipt_code = v_receipt_code);
  end loop;

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
    special_requests, business_id, mpesa_receipt_number,
    start_ts, end_ts
  )
  values (
    v_reference, v_receipt_code, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, v_service_names, p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, v_deposit, v_remaining,
    v_status, v_payment_status, p_payment_method,
    p_special_requests, v_business_id, p_payment_ref,
    v_start_ts, v_end_ts
  )
  returning * into v_booking;

  -- BUG 2 FIX: reserve the slot the same way check_and_reserve does, so
  -- fn_get_staff_free_windows() (and therefore the client-facing
  -- available-slots list) actually sees and excludes it.
  if v_booking.id is not null then
    insert into public.booking_resources (booking_id, provider_id, role_id)
    values (v_booking.id, p_provider_id, (
      select id from public.staff_roles where code = (
        select provider_type::text from public.service_providers where id = p_provider_id
      )
    ));
  end if;

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