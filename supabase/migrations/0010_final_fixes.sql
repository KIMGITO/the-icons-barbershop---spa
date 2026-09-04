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
-- ============================================================
-- 56. EMAIL MESSAGES LOG TABLE
--     Records every Email sent with recipient, subject,
--     status, and audit fields.
-- ============================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  body_html text not null,
  email_type text not null default 'notification', -- 'invitation', 'receipt', 'alert'
  status text not null default 'pending', -- 'pending', 'sent', 'failed'
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  sent_by uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_email_logs_recipient on public.email_logs(recipient_email);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created on public.email_logs(created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists "Staff can view email_logs" on public.email_logs;
create policy "Staff can view email_logs" on public.email_logs
  for select using (public.is_staff());

drop policy if exists "Admin can manage email_logs" on public.email_logs;
create policy "Admin can manage email_logs" on public.email_logs
  for all using (public.is_admin());

-- ============================================================
-- 57. HELPER: Store an Email log row
-- ============================================================
create or replace function public.log_email_message(
  p_recipient_email text,
  p_subject text,
  p_body_html text,
  p_email_type text default 'notification',
  p_status text default 'pending',
  p_provider text default 'resend',
  p_provider_message_id text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.email_logs (
    recipient_email, subject, body_html, email_type, 
    status, provider, provider_message_id, error_message,
    metadata, sent_by, business_id, sent_at
  )
  values (
    p_recipient_email, p_subject, p_body_html, p_email_type,
    p_status, p_provider, p_provider_message_id, p_error_message,
    p_metadata, auth.uid(), v_business_id,
    case when p_status = 'sent' then now() else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_email_message(text, text, text, text, text, text, text, text, jsonb) to authenticated;

--
-- BUG: create_booking exists as TWO separate overloaded functions in the
-- live database:
--   (a) the original 10-parameter version (introduced 0008, re-stated by
--       "create or replace" in 0010 — which only replaces a function
--       when the parameter list is IDENTICAL, so this never touched (b))
--   (b) a 12-parameter version adding p_require_payment/p_payment_ref
--       (introduced 0011, re-stated in 0014)
--
-- Because "create or replace function" only replaces a function with an
-- EXACT signature match, (b) never actually replaced (a) — Postgres just
-- created a second, separate overload. Any call whose named/positional
-- arguments match both (the 12-param version's two extra arguments have
-- defaults, so a 10-argument call satisfies both) is ambiguous:
--   "Could not choose the best candidate function between:
--    create_booking(...10 params...), create_booking(...12 params...)"
--
-- Fix: explicitly DROP the old 10-parameter overload. Only the
-- 12-parameter version should exist going forward.

drop function if exists public.create_booking(
  text, text, text, uuid[], uuid, date, text, text, numeric, text
);

-- Re-state the correct (12-param) version, adding the staff-only
-- authorization check that was missing from every prior definition —
-- this function is used by staff/providers to book on a client's
-- behalf and must not be callable by anonymous/unauthenticated
-- requests directly against the API.
--
-- Time-collision protection is NOT duplicated here: public.bookings
-- already has a BEFORE INSERT trigger (prevent_provider_overlap, fixed
-- in 0041) that rejects any overlapping booking for the same provider
-- automatically, regardless of which function performs the INSERT. This
-- function's insert is covered by that trigger as-is.
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
  if not public.is_staff() then
    raise exception 'Only staff may create a booking directly.' using errcode = '42501';
  end if;

  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

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

-- Only staff/admin may call this (enforced inside the function too,
-- defense in depth). Anonymous booking must go through the public
-- booking-engine RPC, not this one.
revoke execute on function public.create_booking(
  text, text, text, uuid[], uuid, date, text, text, numeric, text, boolean, text
) from anon;
grant execute on function public.create_booking(
  text, text, text, uuid[], uuid, date, text, text, numeric, text, boolean, text
) to authenticated;
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
$$;-- 0050_create_booking_slot_and_past_time_fix.sql
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