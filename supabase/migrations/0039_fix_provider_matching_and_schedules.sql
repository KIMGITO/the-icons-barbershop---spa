-- ============================================================
-- 39. FIX: PROVIDER MATCHING + WEEKLY SCHEDULES FROM BUSINESS HOURS
--
-- Problem: "No qualified master is available at this time"
-- (ROLE_UNAVAILABLE) even when the UI shows the selected master
-- as qualified for the service.
--
-- Root causes fixed here:
--   1. The UI matches providers to services via
--      service_providers.services_offered_ids, but the booking
--      engine RPCs matched ONLY via service_requirements
--      (role-based). When service_requirements rows were missing
--      or stale, the selected provider was rejected.
--      -> RPCs now also honour services_offered_ids.
--   2. The booking engine reads weekly hours from staff_schedules,
--      but the portal writes schedules to
--      service_providers.schedule (JSONB). Nothing synced them,
--      so providers had no working windows at all.
--      -> Backfill + trigger sync JSONB -> staff_schedules.
--   3. Default weekly hours were hardcoded standard times
--      (08:30-18:30). Weekly hours must default to the business
--      hours configured in the database (business_hours table,
--      synced from business info opening_hours).
--      -> Providers without a schedule now inherit business_hours.
-- ============================================================

-- ------------------------------------------------------------
-- 39.1 get_available_slots — honour services_offered_ids as well
--      as service_requirements (keeps 0036 timezone handling).
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
      and (
        -- Role-based qualification (service_requirements)
        exists (
          select 1 from public.service_requirements sr
          where sr.service_id = p_service_id
            and sr.role_id = (
              select id from public.staff_roles where code = sp.provider_type::text
            )
        )
        -- OR explicitly assigned via the admin UI (services_offered_ids)
        or p_service_id = any(coalesce(sp.services_offered_ids, '{}'::uuid[]))
      )
      and (p_preferred_staff_ids is null or sp.id = any(p_preferred_staff_ids))
    order by case when p_preferred_staff_ids is not null and sp.id = any(p_preferred_staff_ids) then 0 else 1 end, sp.full_name
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
-- 39.2 get_qualified_staff — same dual matching
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
    and (
      exists (
        select 1 from public.service_requirements sr
        where sr.service_id = p_service_id
          and sr.role_id = (
            select id from public.staff_roles where code = sp.provider_type::text
          )
      )
      or p_service_id = any(coalesce(sp.services_offered_ids, '{}'::uuid[]))
    )
  order by sp.full_name;
$$;

-- ------------------------------------------------------------
-- 39.3 Backfill service_requirements from services_offered_ids
--      so role-based matching agrees with what the admin sees.
-- ------------------------------------------------------------
insert into public.service_requirements (service_id, role_id, quantity)
select distinct s.id, r.id, 1
from public.service_providers sp
join public.services s
  on s.id = any(coalesce(sp.services_offered_ids, '{}'::uuid[]))
 and s.status = 'active'
join public.staff_roles r on r.code = sp.provider_type::text
on conflict (service_id, role_id) do nothing;

-- ------------------------------------------------------------
-- 39.4 Backfill staff_schedules from service_providers.schedule
--      JSONB (portal edits since migration 0016).
-- ------------------------------------------------------------
do $$
declare
  p record;
  s jsonb;
  day_map text[] := array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  day_idx int;
begin
  for p in select id, schedule from public.service_providers where schedule is not null loop
    if jsonb_typeof(p.schedule) = 'array' then
      for s in select * from jsonb_array_elements(p.schedule) loop
        day_idx := array_position(day_map, lower(s->>'day'));
        if day_idx is not null and s->>'startTime' is not null and s->>'endTime' is not null then
          insert into public.staff_schedules (provider_id, weekday, start_time, end_time, is_working)
          values (
            p.id,
            day_idx - 1,
            (s->>'startTime')::time,
            (s->>'endTime')::time,
            coalesce((s->>'isWorking')::boolean, true)
          )
          on conflict (provider_id, weekday) do update set
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            is_working = excluded.is_working,
            updated_at = now();
        end if;
      end loop;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 39.5 Providers with NO schedule configured: inherit weekly
--      hours from business_hours (set from business info),
--      instead of hardcoded standard times.
-- ------------------------------------------------------------
insert into public.staff_schedules (provider_id, weekday, start_time, end_time, is_working)
select sp.id, bh.weekday, bh.open_time, bh.close_time, bh.is_open
from public.service_providers sp
cross join public.business_hours bh
where bh.business_id = '00000000-0000-0000-0000-000000000001'
  and sp.status = 'active'
  and not exists (select 1 from public.staff_schedules ss where ss.provider_id = sp.id)
on conflict (provider_id, weekday) do nothing;

-- ------------------------------------------------------------
-- 39.6 Going forward: keep staff_schedules and
--      service_requirements in sync whenever a provider is
--      created/updated from the portal (covers both direct
--      updates and the update_provider_schedule RPC).
-- ------------------------------------------------------------
create or replace function public.sync_provider_schedule_and_requirements()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  s jsonb;
  day_map text[] := array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  day_idx int;
begin
  -- Sync services_offered_ids -> service_requirements
  if new.services_offered_ids is not null then
    insert into public.service_requirements (service_id, role_id, quantity)
    select distinct srv.id, r.id, 1
    from public.services srv
    join public.staff_roles r on r.code = new.provider_type::text
    where srv.id = any(coalesce(new.services_offered_ids, '{}'::uuid[]))
      and srv.status = 'active'
    on conflict (service_id, role_id) do nothing;
  end if;

  -- Sync schedule JSONB -> staff_schedules
  if new.schedule is not null
     and jsonb_typeof(new.schedule) = 'array'
     and jsonb_array_length(new.schedule) > 0 then
    for s in select * from jsonb_array_elements(new.schedule) loop
      day_idx := array_position(day_map, lower(s->>'day'));
      if day_idx is not null and s->>'startTime' is not null and s->>'endTime' is not null then
        insert into public.staff_schedules (provider_id, weekday, start_time, end_time, is_working)
        values (
          new.id,
          day_idx - 1,
          (s->>'startTime')::time,
          (s->>'endTime')::time,
          coalesce((s->>'isWorking')::boolean, true)
        )
        on conflict (provider_id, weekday) do update set
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          is_working = excluded.is_working,
          updated_at = now();
      end if;
    end loop;
  else
    -- No schedule configured: default weekly hours come from
    -- business_hours (synced from business info), not standard times.
    insert into public.staff_schedules (provider_id, weekday, start_time, end_time, is_working)
    select new.id, bh.weekday, bh.open_time, bh.close_time, bh.is_open
    from public.business_hours bh
    where bh.business_id = '00000000-0000-0000-0000-000000000001'
    on conflict (provider_id, weekday) do update set
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_working = excluded.is_working,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_provider_schedule on public.service_providers;
create trigger trg_sync_provider_schedule
  after insert or update of schedule, services_offered_ids, provider_type, status
  on public.service_providers
  for each row execute procedure public.sync_provider_schedule_and_requirements();

-- ------------------------------------------------------------
-- 39.7 Grants (keep anon guest booking working)
-- ------------------------------------------------------------
grant execute on function public.get_available_slots(uuid, date, uuid[]) to anon, authenticated;
grant execute on function public.get_qualified_staff(uuid) to anon, authenticated;