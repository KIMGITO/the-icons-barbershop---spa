-- ============================================================
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
end $$;