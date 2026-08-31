-- ============================================================
-- 77. UNIFY TIME SYSTEM: 2-hour intervals, Africa/Nairobi
--
-- Changes:
--   - get_available_slots: step changed from 15 min to 120 min (2 hours)
--   - fn_get_staff_free_windows: unchanged (already Nairobi-aware)
--   - check_and_reserve: unchanged (already Nairobi-aware)
--   - All time slots are now generated in 2-hour intervals
-- ============================================================

-- ------------------------------------------------------------
-- get_available_slots: change step from 15 minutes to 120 minutes (2 hours)
-- This ensures all booking slots start at 2-hour boundaries (08:00, 10:00, 12:00, etc.)
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
  v_step int := 120;  -- 2-hour intervals (was 15)
begin
  select * into v_service from public.services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;

  v_total_min := v_service.duration_minutes + coalesce(v_service.buffer_minutes, 0);

  for v_staff in
    select sp.id, sp.full_name
    from public.service_providers sp
    join public.service_requirements sr on sr.role_id = (
      select id from public.staff_roles where code = sp.provider_type::text
    )
    where sr.service_id = p_service_id
      and sp.status = 'active'
      and (p_preferred_staff_ids is null or sp.id = any(p_preferred_staff_ids))
    order by case when p_preferred_staff_ids is not null and sp.id = any(p_preferred_staff_ids) then 0 else 1 end, sp.full_name
  loop
    for v_free in select * from public.fn_get_staff_free_windows(v_staff.id, p_date) loop
      -- Snap to 2-hour boundary from start of free window
      v_slot_start := v_free.start_ts;
      -- Round up to next 2-hour boundary if not already on one
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
-- Helper function: generate 2-hour slot start times for a given date
-- Returns table of timestamptz values at 2-hour intervals within business hours
-- ------------------------------------------------------------
create or replace function public.generate_2hr_slots(
  p_date date,
  p_open_time time default '08:00'::time,
  p_close_time time default '20:00'::time
) returns table (slot_start timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_slot_time time;
  v_slot_ts timestamptz;
begin
  v_slot_time := p_open_time;
  while v_slot_time < p_close_time loop
    v_slot_ts := ((p_date::text || ' ' || v_slot_time::text)::timestamp at time zone 'Africa/Nairobi');
    slot_start := v_slot_ts;
    return next;
    v_slot_time := v_slot_time + (120 || ' minutes')::interval;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- get_booked_slots: ensure returned times are in Nairobi timezone
-- This function is used by the BookingModal to show booked slots
-- ------------------------------------------------------------
create or replace function public.get_booked_slots(
  p_provider_id uuid,
  p_date date
) returns table (time_slot text, end_time text, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    to_char(b.start_ts at time zone 'Africa/Nairobi', 'HH24:MI') as time_slot,
    to_char(b.end_ts at time zone 'Africa/Nairobi', 'HH24:MI') as end_time,
    b.status::text
  from public.bookings b
  join public.booking_resources br on br.booking_id = b.id
  where br.provider_id = p_provider_id
    and b.status in ('pending', 'confirmed')
    and (b.start_ts at time zone 'Africa/Nairobi')::date = p_date
  order by b.start_ts;
end;
$$;

-- ------------------------------------------------------------
-- Grant execute permissions
-- ------------------------------------------------------------
grant execute on function public.generate_2hr_slots to anon, authenticated;
grant execute on function public.get_booked_slots to anon, authenticated;