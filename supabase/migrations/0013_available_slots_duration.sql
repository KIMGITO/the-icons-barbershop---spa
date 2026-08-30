-- ============================================================
-- 50. DURATION-AWARE AVAILABLE TIME SLOTS
--     Accepts p_duration_minutes so customers see blocks that
--     match the total duration of their selected services
--     (e.g. a 40-min service produces 8:00-8:40, 8:30-9:10, ...).
--     Start candidates remain on 30-min boundaries; a candidate
--     is returned only if the provider is free for the ENTIRE
--     [start, start + duration) window (schedule blocks, breaks,
--     and existing bookings all checked).
-- ============================================================
drop function if exists public.get_available_time_slots(p_provider_id uuid, p_date date);

create or replace function public.get_available_time_slots(
  p_provider_id uuid,
  p_date date,
  p_duration_minutes int default 30
)
returns table (
  start_time text,
  end_time text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text;
  v_schedule jsonb;
  v_day_schedule jsonb;
  v_start_min int;
  v_end_min int;
  v_slot_min int;
  v_step_min int := 30;
  v_minute int;
  v_end_time text;
begin
  v_day := lower(to_char(p_date, 'Day'));
  v_day := trim(v_day);

  -- Slot block length = total duration of requested services (min 30 min)
  v_slot_min := greatest(coalesce(p_duration_minutes, 30), 30);

  -- Get provider schedule
  select schedule into v_schedule from public.service_providers where id = p_provider_id;

  -- Check availability override
  if exists (
    select 1 from public.provider_availability
    where provider_id = p_provider_id and date = p_date and is_available = false
  ) then
    return;
  end if;

  -- Get schedule for the day
  v_day_schedule := (
    select jsonb_agg(s) from jsonb_array_elements(coalesce(v_schedule, '[]'::jsonb)) s
    where lower(s->>'day') = v_day
  );

  if v_day_schedule is null then
    return;
  end if;

  v_day_schedule := v_day_schedule->0;
  if (v_day_schedule->>'is_working')::boolean = false then
    return;
  end if;

  v_start_min := (split_part(v_day_schedule->>'start_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'start_time', ':', 2)::int;
  v_end_min := (split_part(v_day_schedule->>'end_time', ':', 1)::int * 60) + split_part(v_day_schedule->>'end_time', ':', 2)::int;

  v_minute := v_start_min;
  while v_minute + v_slot_min <= v_end_min loop
    v_end_time := lpad(((v_minute + v_slot_min) / 60)::text, 2, '0') || ':' || lpad(((v_minute + v_slot_min) % 60)::text, 2, '0');

    -- Check schedule block (break / day-off / holiday) conflicts
    if exists (
      select 1 from public.schedule_blocks sb
      where sb.provider_id = p_provider_id
        and sb.date = p_date
        and sb.start_time <= v_end_time
        and sb.end_time > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      v_minute := v_minute + v_step_min;
      continue;
    end if;

    -- Check if slot overlaps with a scheduled break
    if exists (
      select 1
      from jsonb_array_elements(coalesce(v_day_schedule->'breaks', '[]'::jsonb)) b
      where b->>'start' <= v_end_time
        and b->>'end' > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      v_minute := v_minute + v_step_min;
      continue;
    end if;

    -- Check existing bookings conflict across the ENTIRE [start, start+duration) window
    if not exists (
      select 1 from public.bookings b
      where b.provider_id = p_provider_id and b.date = p_date
        and b.status in ('pending', 'confirmed')
        and b.time_slot < v_end_time
        and coalesce(b.end_time, to_char(to_timestamp(b.time_slot, 'HH12:MI AM') + (b.duration_minutes || ' minutes')::interval, 'HH24:MI')) > lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0')
    ) then
      start_time := lpad((v_minute / 60)::text, 2, '0') || ':' || lpad((v_minute % 60)::text, 2, '0');
      end_time := v_end_time;
      return next;
    end if;

    v_minute := v_minute + v_step_min;
  end loop;
end;
$$;

grant execute on function public.get_available_time_slots(uuid, date, int) to anon, authenticated;