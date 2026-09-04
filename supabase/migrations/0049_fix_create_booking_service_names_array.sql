
--
-- BUG: "malformed array literal: [\"cuts\"]"
--
-- calculate_booking_totals() returns service names as a JSON array
-- packed inside jsonb via jsonb_build_object, e.g.:
--   {"service_names": ["cuts"], ...}
--
-- create_booking() then did:
--   (v_totals->>'service_names')::text[]
--
-- `->>` extracts the value as TEXT, producing the literal string
-- `["cuts"]` (JSON bracket syntax). Casting THAT string straight to
-- text[] fails, because Postgres array literals use curly braces
-- (`{cuts}`), not JSON square brackets. This has been present in every
-- version of create_booking since it was introduced (0008) — it was
-- simply never reached before, because the function-overload ambiguity
-- fixed in 0048 was raising its own error first on every call.
--
-- Fix: unnest the jsonb array properly instead of casting its text
-- representation.

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
begin
  if not public.is_staff() then
    raise exception 'Only staff may create a booking directly.' using errcode = '42501';
  end if;

  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- FIX: unnest the jsonb array (v_totals->'service_names', note '->' not
  -- '->>') into a real text[] instead of casting its JSON string form.
  select coalesce(array_agg(x), '{}'::text[])
  into v_service_names
  from jsonb_array_elements_text(v_totals->'service_names') as x;

  v_deposit := greatest(coalesce(p_deposit_paid_ksh, 0), case when p_require_payment then ceil(v_price * 0.5) else 0 end);
  v_deposit := least(v_deposit, v_price);
  v_remaining := greatest(0, v_price - v_deposit);

  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');
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
    special_requests, business_id, mpesa_receipt_number
  )
  values (
    v_reference, v_receipt_code, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, v_service_names, p_provider_id,
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