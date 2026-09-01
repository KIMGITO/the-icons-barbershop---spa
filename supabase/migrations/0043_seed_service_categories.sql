-- ============================================================
-- 43. SEED SERVICE CATEGORIES + BACKFILL FK
--
-- service_categories was empty, so the category_id backfill in
-- 0042 had no rows to join. This migration:
--   1. Seeds distinct category slugs from services.category
--      (ignores duplicates so it is re-runnable).
--   2. Backfills services.category_id from the seeded rows.
--   3. Verifies the sync trigger keeps the label in sync.
-- ============================================================

-- 43.1 Seed distinct category labels as slugs
insert into public.service_categories (slug, name, is_active)
select distinct
  s.category,
  initcap(replace(s.category, '-', ' ')),
  true
from public.services s
where s.category is not null
  and not exists (
    select 1 from public.service_categories c where c.slug = s.category
  );

-- 43.2 Backfill the FK from the canonical category
update public.services s
set category_id = c.id
from public.service_categories c
where s.category_id is null
  and c.slug = s.category;

-- 43.3 (safety) ensure labels match the canonical slug
update public.services s
set category = c.slug
from public.service_categories c
where s.category_id = c.id
  and s.category is distinct from c.slug;
