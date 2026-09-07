-- ============================================================
-- 0011_sequenced_bookings.sql
-- Add support for multi-service, multi-provider sequenced bookings.
-- ============================================================

-- 1. Add sequence_rank to services
alter table public.services add column if not exists sequence_rank int not null default 100;

-- 2. Create booking_legs table
create table if not exists public.booking_legs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  sequence_order int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_legs_booking_id on public.booking_legs(booking_id);
create index if not exists idx_booking_legs_provider_id on public.booking_legs(provider_id);
create index if not exists idx_booking_legs_start_ts on public.booking_legs(start_ts);

-- Add exclusion constraint if not exists (using extension btree_gist)
do $$ 
begin
  alter table public.booking_legs add constraint no_provider_overlap exclude using gist (
    provider_id with =,
    tstzrange(start_ts, end_ts) with &&
  );
exception
  when others then null;
end $$;

-- 3. Define types for input
do $$
begin
  create type public.booking_leg_input as (
    service_id uuid,
    provider_id uuid
  );
exception
  when duplicate_object then null;
end $$;

-- 4. Create check_and_reserve_sequenced function
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
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    on conflict (phone, business_id) do update set total_visits = customers.total_visits + 1, last_visit_date = now(), email = coalesce(p_customer_email, customers.email), updated_at = now()
    returning id into v_customer_id;
  else
    update public.customers set total_visits = total_visits + 1, last_visit_date = now(), email = coalesce(p_customer_email, email), updated_at = now() where id = v_customer_id;
  end if;

  if p_require_payment then v_status := 'pending'; v_payment_status := 'unpaid'; end if;

  insert into public.bookings (reference_number, receipt_code, customer_id, customer_name, customer_phone, customer_email, service_ids, service_names, provider_id, provider_name, date, time_slot, end_time, duration_minutes, total_price_ksh, deposit_paid_ksh, remaining_balance_ksh, status, payment_status, payment_method, special_requests, business_id, mpesa_receipt_number, start_ts, end_ts)
  values (v_reference, v_receipt_code, v_customer_id, p_customer_name, p_customer_phone, p_customer_email, v_service_ids, v_service_names, (v_sorted_legs[1]).provider_id, coalesce((select full_name from public.service_providers where id = (v_sorted_legs[1]).provider_id), ''), (p_desired_start_ts at time zone 'Africa/Nairobi')::date, to_char(p_desired_start_ts at time zone 'Africa/Nairobi', 'HH24:MI'), to_char(v_current_ts at time zone 'Africa/Nairobi', 'HH24:MI'), v_total_duration, v_total_price, 0, v_total_price, v_status, v_payment_status, p_payment_method, p_special_requests, v_business_id, p_payment_ref, p_desired_start_ts, v_current_ts)
  returning id into v_booking_id;

  v_i := 0; v_current_ts := p_desired_start_ts;
  foreach v_leg in array v_sorted_legs loop
    v_i := v_i + 1; select * into v_service from public.services where id = v_leg.service_id;
    v_leg_start := v_current_ts;
    if v_service.duration_minutes = 30 then v_leg_end := v_leg_start + (v_service.duration_minutes || ' minutes')::interval;
    else v_leg_end := v_leg_start + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0)) || ' minutes')::interval; end if;
    insert into public.booking_legs (booking_id, service_id, provider_id, start_ts, end_ts, sequence_order)
    values (v_booking_id, v_leg.service_id, v_leg.provider_id, v_leg_start, v_leg_end, v_i);
    insert into public.booking_services (booking_id, service_id) values (v_booking_id, v_leg.service_id) on conflict do nothing;
    insert into public.booking_resources (booking_id, provider_id, role_id)
    values (v_booking_id, v_leg.provider_id, (select id from public.staff_roles where code = (select provider_type::text from public.service_providers where id = v_leg.provider_id))) on conflict do nothing;
    v_current_ts := v_leg_end;
  end loop;

  return jsonb_build_object('success', true, 'booking_id', v_booking_id, 'reference_number', v_reference, 'receipt_code', v_receipt_code, 'start_ts', p_desired_start_ts, 'end_ts', v_current_ts, 'total_price_ksh', v_total_price, 'status', v_status, 'payment_status', v_payment_status);
end;
$$;

-- 5. Next available combined slot query
create or replace function public.get_next_available_combined_slot(
  p_legs public.booking_leg_input[],
  p_start_after timestamptz,
  p_max_days int default 30
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_current_attempt_start timestamptz := p_start_after;
  v_max_ts timestamptz := p_start_after + (p_max_days || ' days')::interval;
  v_leg record;
  v_service record;
  v_leg_start timestamptz;
  v_leg_end timestamptz;
  v_conflict_found boolean;
  v_sorted_legs public.booking_leg_input[];
  v_step interval := '5 minutes';
begin
  v_current_attempt_start := date_trunc('hour', v_current_attempt_start) + (ceil(extract(minute from v_current_attempt_start) / 5.0) * 5 || ' minutes')::interval;
  select array_agg((l.service_id, l.provider_id)::public.booking_leg_input order by s.sequence_rank, s.id)
  into v_sorted_legs from unnest(p_legs) l join public.services s on s.id = l.service_id;
  while v_current_attempt_start < v_max_ts loop
    v_conflict_found := false; v_leg_start := v_current_attempt_start;
    foreach v_leg in array v_sorted_legs loop
      select * into v_service from public.services where id = v_leg.service_id;
      if v_service.duration_minutes = 30 then v_leg_end := v_leg_start + (v_service.duration_minutes || ' minutes')::interval;
      else v_leg_end := v_leg_start + ((v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0)) || ' minutes')::interval; end if;
      if not public.fn_is_staff_available(v_leg.provider_id, v_leg_start, v_leg_end) then v_conflict_found := true; exit; end if;
      v_leg_start := v_leg_end;
    end loop;
    if not v_conflict_found then return v_current_attempt_start; end if;
    v_current_attempt_start := v_current_attempt_start + v_step;
  end loop;
  return null;
end;
$$;
