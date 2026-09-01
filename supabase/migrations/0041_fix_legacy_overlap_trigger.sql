-- ============================================================
-- 41. FIX: LEGACY OVERLAP TRIGGER — USE AUTHORITATIVE TIMESTAMPS
--
-- Problem: prevent_provider_overlap (migration 0004) recomputed
-- booking windows from date || time_slot TEXT and compared them
-- in the database's default timezone. The booking engine (0036+)
-- stores authoritative start_ts/end_ts timestamptz and treats
-- times as Africa/Nairobi. The legacy trigger therefore:
--   * compared windows in the wrong timezone, and
--   * only checked ONE arbitrary existing booking (limit 1), and
--   * ignored buffer time and multi-service windows.
-- This caused false "Provider unavailable at this time. Existing
-- booking overlaps." errors for bookings the engine had already
-- validated as free.
--
-- Fix: overlap detection now uses the authoritative start_ts /
-- end_ts columns (single source of truth), falling back to
-- date/time_slot parsing only for legacy rows without timestamps,
-- and checks ALL overlapping bookings — not just one.
-- ============================================================

create or replace function public.prevent_provider_overlap()
returns trigger as $$
declare
  existing record;
  new_start timestamptz;
  new_end timestamptz;
begin
  if new.status in ('cancelled', 'no-show') then
    return new;
  end if;

  -- Authoritative window: start_ts/end_ts when present.
  -- Legacy rows (portal-created without timestamps) fall back to
  -- date + time_slot parsing.
  new_start := coalesce(
    new.start_ts,
    (new.date::text || ' ' || new.time_slot)::timestamptz
  );
  new_end := coalesce(
    new.end_ts,
    new_start + (new.duration_minutes || ' minutes')::interval
  );

  for existing in
    select b.start_ts, b.end_ts,
           (b.date::text || ' ' || b.time_slot)::timestamptz as legacy_start,
           (b.date::text || ' ' || b.time_slot)::timestamptz
             + (b.duration_minutes || ' minutes')::interval as legacy_end
    from public.bookings b
    where b.provider_id = new.provider_id
      and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000')
      and b.status in ('pending', 'confirmed')
      and b.date = new.date
  loop
    -- Use authoritative timestamps when both rows have them;
    -- fall back to legacy parsing otherwise.
    if new.start_ts is not null and existing.start_ts is not null then
      if new_start < existing.end_ts and new_end > existing.start_ts then
        raise exception 'Provider unavailable at this time. Existing booking overlaps.';
      end if;
    else
      if new_start < existing.legacy_end and new_end > existing.legacy_start then
        raise exception 'Provider unavailable at this time. Existing booking overlaps.';
      end if;
    end if;
  end loop;

  return new;
end;
$$ language plpgsql;
