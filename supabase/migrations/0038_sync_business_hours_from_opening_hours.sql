
create or replace function public.sync_business_hours_from_opening_hours()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  oh jsonb := coalesce(new.opening_hours, '{}'::jsonb);
  v_weekdays jsonb := oh->'weekdays';
  v_saturday jsonb := oh->'saturday';
  v_sunday jsonb := oh->'sunday';
  v_wd_start time;
  v_wd_end time;
  v_sat_start time;
  v_sat_end time;
  v_sun_start time;
  v_sun_end time;
begin
  -- Defensive parsing: fall back to sane defaults (matching the
  -- frontend DEFAULT_HOURS in businessService.ts) if a field is
  -- missing or malformed, instead of throwing and blocking the
  -- admin's save entirely.
  begin
    v_wd_start := coalesce(nullif(v_weekdays->>'start', ''), '09:00')::time;
  exception when others then v_wd_start := '09:00'::time; end;
  begin
    v_wd_end := coalesce(nullif(v_weekdays->>'end', ''), '18:00')::time;
  exception when others then v_wd_end := '18:00'::time; end;
  begin
    v_sat_start := coalesce(nullif(v_saturday->>'start', ''), '09:00')::time;
  exception when others then v_sat_start := '09:00'::time; end;
  begin
    v_sat_end := coalesce(nullif(v_saturday->>'end', ''), '16:00')::time;
  exception when others then v_sat_end := '16:00'::time; end;
  begin
    v_sun_start := coalesce(nullif(v_sunday->>'start', ''), '10:00')::time;
  exception when others then v_sun_start := '10:00'::time; end;
  begin
    v_sun_end := coalesce(nullif(v_sunday->>'end', ''), '14:00')::time;
  exception when others then v_sun_end := '14:00'::time; end;

  -- weekday convention matches business_hours.weekday: 0=Sunday .. 6=Saturday
  insert into public.business_hours (business_id, weekday, open_time, close_time, is_open)
  values
    (new.id, 0, v_sun_start, v_sun_end, true),
    (new.id, 1, v_wd_start,  v_wd_end,  true),
    (new.id, 2, v_wd_start,  v_wd_end,  true),
    (new.id, 3, v_wd_start,  v_wd_end,  true),
    (new.id, 4, v_wd_start,  v_wd_end,  true),
    (new.id, 5, v_wd_start,  v_wd_end,  true),
    (new.id, 6, v_sat_start, v_sat_end, true)
  on conflict (business_id, weekday) do update
    set open_time = excluded.open_time,
        close_time = excluded.close_time,
        is_open = excluded.is_open,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_business_hours on public.businesses;
create trigger trg_sync_business_hours
  after insert or update of opening_hours on public.businesses
  for each row execute procedure public.sync_business_hours_from_opening_hours();


update public.businesses set opening_hours = coalesce(opening_hours, '{}'::jsonb);