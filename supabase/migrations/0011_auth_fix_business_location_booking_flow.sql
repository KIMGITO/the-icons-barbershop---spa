-- ============================================================
-- 46. FIX AUTH 500 — raw_app_meta_data.role must be a valid
--     Postgres/auth role (e.g. 'authenticated'), never 'admin'.
--     The app's admin role lives in public.staff_profiles.role.
-- ============================================================
update auth.users
set raw_app_meta_data = (raw_app_meta_data - 'role') || '{"role":"authenticated"}'::jsonb
where raw_app_meta_data->>'role' is not null
  and raw_app_meta_data->>'role' not in ('authenticated', 'anon', 'service_role');

-- Also sanitize any future manually-created auth users via the trigger metadata
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Never allow raw_app_meta_data.role to be a non-auth role.
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role":"authenticated"}'::jsonb;
  insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
  values (new.id, coalesce(new.email, ''), coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), user_role, user_provider_id, default_business_id, true)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 47. BUSINESS LOCATION — no hardcoded location anywhere
-- ============================================================
alter table public.businesses
  add column if not exists location_details text,
  add column if not exists maps_embed_url text,
  add column if not exists directions_url text;

update public.businesses
set location_details = 'Located at Four Ways Village on Kiambu Road. Convenient executive parking and private penthouse access.',
    maps_embed_url = 'https://www.google.com/maps?q=Four+Ways+Village+Kiambu+Road+Nairobi&output=embed',
    directions_url = 'https://www.google.com/maps/dir/?api=1&destination=Four+Ways+Village+Kiambu+Road+Nairobi'
where id = '00000000-0000-0000-0000-000000000001'
  and location_details is null;

-- ============================================================
-- 48. PUBLIC BOOKED-SLOTS LOOKUP (no personal data leak)
--     Returns only time_slot + end_time for booked slots on a date.
-- ============================================================
create or replace function public.get_booked_slots(p_provider_id uuid, p_date date)
returns table (time_slot text, end_time text, status booking_status)
language sql
security definer
set search_path = public
as $$
  select b.time_slot, coalesce(b.end_time, ''), b.status
  from public.bookings b
  where b.provider_id = p_provider_id
    and b.date = p_date
    and b.status in ('pending', 'confirmed')
  order by b.time_slot;
$$;

grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;

-- ============================================================
-- 49. create_booking — payment-gated branch
--     When p_require_payment is true the booking is created
--     'pending' + 'unpaid' (slot held) and is only
--     'confirmed' after M-Pesa callback marks it deposit-paid.
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
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
  v_service_id uuid;
  v_status booking_status := 'confirmed';
begin
  -- Calculate totals
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- Deposit = 50% of total by default
  v_deposit := greatest(coalesce(p_deposit_paid_ksh, 0), ceil(v_price * 0.5));
  v_deposit := least(v_deposit, v_price);
  v_remaining := greatest(0, v_price - v_deposit);

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

  -- Payment-gated booking: created pending/unpaid, slot held.
  -- Confirmed only after M-Pesa callback marks it deposit-paid.
  if p_require_payment then
    v_status := 'pending';
  end if;

  -- Insert booking
  insert into public.bookings (
    reference_number, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id, mpesa_receipt_number
  )
  values (
    v_reference, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, v_deposit, v_remaining,
    v_status,
    case when p_require_payment then 'unpaid'
         when v_remaining = 0 then 'paid'
         when v_deposit > 0 then 'deposit-paid'
         else 'unpaid' end,
    p_payment_method,
    p_special_requests, v_business_id, p_payment_ref
  )
  returning * into v_booking;

  -- Record canonical many-to-many junction rows (snapshot columns remain)
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
-- 50. update_mpesa_payment_status — on completed deposit
--     confirm a pending booking + record deposit-paid.
-- ============================================================
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
  v_total numeric(10,2);
  v_deposit numeric(10,2);
  v_remaining numeric(10,2);
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
    select total_price_ksh, deposit_paid_ksh into v_total, v_deposit
    from public.bookings where id = v_booking_id;

    if v_deposit is null or v_total is null then
      v_deposit := coalesce(v_deposit, 0);
      v_total := coalesce(v_total, 0);
    end if;

    v_remaining := greatest(0, v_total - v_deposit);

    update public.bookings
    set status = 'confirmed',
        payment_status = case when v_remaining = 0 then 'paid' else 'deposit-paid' end,
        payment_method = 'mpesa',
        mpesa_receipt_number = coalesce(p_receipt_number, mpesa_receipt_number),
        remaining_balance_ksh = v_remaining,
        updated_at = now()
    where id = v_booking_id;
  end if;

  return found;
end;
$$;