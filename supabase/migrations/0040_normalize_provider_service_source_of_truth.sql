-- ============================================================
-- 40. NORMALIZE PROVIDER ↔ SERVICE — SINGLE SOURCE OF TRUTH
--
-- Problem:
--   Provider↔service capability lived in THREE places that could
--   disagree with each other:
--     1. provider_services        (junction table — written by the
--                                  manage-services edge function when
--                                  a service is created/updated with
--                                  providers selected)
--     2. service_providers.services_offered_ids (uuid[] on provider)
--     3. service_requirements     (role-level projection)
--   The booking engine RPCs read #2 and #3 but never #1, so a
--   newly created service with providers selected produced
--   ROLE_UNAVAILABLE until every provider was edited again.
--
-- Fix (normalization):
--   * provider_services is the SINGLE SOURCE OF TRUTH for
--     "which provider can perform which service".
--   * services_offered_ids (denormalized array for the admin UI)
--     and service_requirements (role-level projection) are DERIVED
--     and kept in sync by triggers — bidirectionally.
--   * All booking engine RPCs (get_qualified_staff,
--     get_available_slots, check_and_reserve) read capability from
--     provider_services only — one fetch path everywhere.
--   * check_and_reserve now accepts p_service_ids (multi-service
--     bookings) and matches staff by free-window containment
--     instead of exact 15-minute grid equality, so any typed
--     start time that fits a free window is accepted.
-- ============================================================

-- ------------------------------------------------------------
-- 40.1 Backfill provider_services (canonical) from
--      service_providers.services_offered_ids
-- ------------------------------------------------------------
insert into public.provider_services (provider_id, service_id)
select sp.id, s.id
from public.service_providers sp
join public.services s
  on s.id = any(coalesce(sp.services_offered_ids, '{}'::uuid[]))
on conflict (provider_id, service_id) do nothing;

-- ------------------------------------------------------------
-- 40.2 Backfill provider_services from role-based
--      service_requirements so role-qualified providers keep
--      their capability after the switch (no data loss).
-- ------------------------------------------------------------
insert into public.provider_services (provider_id, service_id)
select distinct sp.id, sr.service_id
from public.service_requirements sr
join public.service_providers sp
  on sp.status = 'active'
 and sp.provider_type::text = (
       select r.code from public.staff_roles r where r.id = sr.role_id
     )
on conflict (provider_id, service_id) do nothing;

-- ------------------------------------------------------------
-- 40.2b Also backfill from the 0039-style dual match used by
--       get_available_slots (services_offered_ids OR role match)
--       so nothing that was previously bookable is lost.
-- ------------------------------------------------------------
insert into public.provider_services (provider_id, service_id)
select distinct sp.id, s.id
from public.service_providers sp
join public.services s on s.status = 'active'
join public.service_requirements sr on sr.service_id = s.id
join public.staff_roles r on r.id = sr.role_id and r.code = sp.provider_type::text
where sp.status = 'active'
on conflict (provider_id, service_id) do nothing;

-- ------------------------------------------------------------
-- 40.3 Rebuild service_providers.services_offered_ids from the
--      canonical junction (merge — union of what is there now).
-- ------------------------------------------------------------
update public.service_providers sp
set services_offered_ids = sub.ids
from (
  select ps.provider_id, array_agg(distinct ps.service_id) as ids
  from public.provider_services ps
  group by ps.provider_id
) sub
where sp.id = sub.provider_id
  and sp.services_offered_ids is distinct from sub.ids;

-- ------------------------------------------------------------
-- 40.4 Trigger A: provider_services is canonical.
--      Whenever a link is added/removed (e.g. a service is
--      created with providers selected), automatically update:
--        - service_providers.services_offered_ids (UI projection)
--        - service_requirements (role-level projection)
--      so providers can offer the service WITHOUT being edited.
-- ------------------------------------------------------------
create or replace function public.sync_provider_capability_denormalized()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  v_provider uuid := coalesce(new.provider_id, old.provider_id);
  v_service  uuid := coalesce(new.service_id, old.service_id);
  v_ids uuid[];
begin
  -- Keep the provider's denormalized services_offered_ids in sync
  if v_provider is not null then
    select coalesce(array_agg(ps.service_id order by ps.service_id), '{}'::uuid[])
      into v_ids
      from public.provider_services ps
      where ps.provider_id = v_provider;

    if exists (
      select 1 from public.service_providers sp
      where sp.id = v_provider
        and sp.services_offered_ids is distinct from v_ids
    ) then
      update public.service_providers
      set services_offered_ids = v_ids, updated_at = now()
      where id = v_provider;
    end if;
  end if;

  -- Keep the role-level projection (service_requirements) in sync
  if v_service is not null then
    insert into public.service_requirements (service_id, role_id, quantity)
    select distinct v_service, r.id, 1
    from public.provider_services ps
    join public.service_providers sp on sp.id = ps.provider_id
    join public.staff_roles r on r.code = sp.provider_type::text
    where ps.service_id = v_service
    on conflict (service_id, role_id) do nothing;

    -- Drop role requirements that no active provider covers anymore
    delete from public.service_requirements sr
    where sr.service_id = v_service
      and not exists (
        select 1
        from public.provider_services ps
        join public.service_providers sp on sp.id = ps.provider_id
        join public.staff_roles r on r.code = sp.provider_type::text
        where ps.service_id = v_service and r.id = sr.role_id
      );
  end if;

  return null;
end $$;

drop trigger if exists trg_sync_provider_capability on public.provider_services;
create trigger trg_sync_provider_capability
  after insert or delete on public.provider_services
  for each row execute procedure public.sync_provider_capability_denormalized();

-- ------------------------------------------------------------
-- 40.5 Trigger B: editing a provider's services_offered_ids in
--      the portal syncs back into the canonical junction.
--      (Trigger A then finds the array already equal → no loop.)
-- ------------------------------------------------------------
create or replace function public.sync_provider_services_from_offered_ids()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  -- Remove links that were unchecked
  delete from public.provider_services ps
  where ps.provider_id = new.id
    and not (ps.service_id = any(coalesce(new.services_offered_ids, '{}'::uuid[])));

  -- Add links that were checked
  insert into public.provider_services (provider_id, service_id)
  select new.id, x.service_id
  from unnest(coalesce(new.services_offered_ids, '{}'::uuid[])) as x(service_id)
  where exists (select 1 from public.services s where s.id = x.service_id)
  on conflict (provider_id, service_id) do nothing;

  return null;
end $$;

drop trigger if exists trg_sync_provider_services_array on public.service_providers;
create trigger trg_sync_provider_services_array
  after insert or update of services_offered_ids
  on public.service_providers
  for each row execute procedure public.sync_provider_services_from_offered_ids();

-- ------------------------------------------------------------
-- 40.6 get_qualified_staff — read from provider_services only
-- ------------------------------------------------------------
create or replace function public.get_qualified_staff(
  p_service_id uuid
) returns table (staff_id uuid, staff_name text, provider_type text)
language sql
security definer
set search_path = public as $$
  select sp.id, sp.full_name, sp.provider_type::text
  from public.service_providers sp
  where sp.status = 'active'
    and exists (
      select 1 from public.provider_services ps
      where ps.provider_id = sp.id and ps.service_id = p_service_id
    )
  order by sp.full_name;
$$;

-- ------------------------------------------------------------
-- 40.7 check_and_reserve — multi-service + window-based staff
--      matching. New optional final parameter p_service_ids
--      keeps every existing caller working unchanged.
-- ------------------------------------------------------------
drop function if exists public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text);

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

  select count(*),
         coalesce(sum(s.duration_minutes), 0),
         coalesce(sum(s.duration_minutes + coalesce(s.buffer_minutes, 0)), 0),
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
  -- Qualification = provider_services (single source of truth);
  -- the provider must be able to perform EVERY service in the list.
  -- Availability = a free window fully contains [start, end),
  -- so any typed start time works, not just 15-min grid slots.
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

  -- One booking_services row per selected service
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

-- ------------------------------------------------------------
-- 40.7b get_available_slots — canonical provider_services match
--      (kept for slot-grid consumers; same 0036 timezone logic)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 40.8 Grants (keep anon guest booking working)
-- ------------------------------------------------------------
drop function if exists public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text);
grant execute on function public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text, uuid[]) to anon, authenticated;
grant execute on function public.get_available_slots(uuid, date, uuid[]) to anon, authenticated;
grant execute on function public.get_qualified_staff(uuid) to anon, authenticated;
