-- ============================================================
-- 72. PUBLIC-SAFE VIEWS (Secure column exposure)
--     The public website needs to read services, providers,
--     products, business, gallery, FAQs, and categories.
--
--     Instead of granting anon SELECT on the underlying tables
--     (which exposes ALL columns including private ones like
--     service_providers.email / phone / schedule), we create
--     narrow views that expose ONLY the fields required by the
--     public booking / browsing experience.
--
--     RLS remains enabled on the underlying tables. Anon and
--     authenticated users without staff role are REVOKED from
--     direct table SELECT — they must use these views.
-- ============================================================

-- ============================================================
-- 72.1 PUBLIC VIEW: BUSINESS (public-safe fields only)
-- ============================================================
drop view if exists public.v_public_business;
create view public.v_public_business as
  select
    id,
    name,
    description as tagline,
    phone,
    email,
    address,
    neighborhood,
    city,
    country,
    maps_embed_url,
    directions_url,
    social_links,
    logo_url
  from public.businesses;

-- ============================================================
-- 72.2 PUBLIC VIEW: SERVICES (public-safe fields only)
-- ============================================================
drop view if exists public.v_public_services;
create view public.v_public_services as
  select
    s.id,
    s.slug,
    s.name,
    s.category,
    s.short_description,
    s.full_description,
    s.duration_minutes,
    s.price_ksh,
    s.image_url,
    s.features,
    s.buffer_minutes,
    s.business_id
  from public.services s
  where s.status = 'active';

-- ============================================================
-- 72.3 PUBLIC VIEW: SERVICE PROVIDERS (public-safe fields only)
--     Hides email, phone, schedule, private notes.
-- ============================================================
drop view if exists public.v_public_providers;
create view public.v_public_providers as
  select
    sp.id,
    sp.slug,
    sp.full_name as name,
    sp.provider_type,
    sp.bio,
    sp.avatar_url,
    sp.years_experience,
    sp.rating,
    sp.instagram_handle,
    sp.status,
    sp.business_id
  from public.service_providers sp
  where sp.status = 'active';

-- ============================================================
-- 72.4 PUBLIC VIEW: PRODUCTS (public-safe fields only)
-- ============================================================
drop view if exists public.v_public_products;
create view public.v_public_products as
  select
    p.id,
    p.slug,
    p.name,
    p.category,
    p.short_description,
    p.detailed_description,
    p.price_ksh,
    p.original_price_ksh,
    p.availability,
    p.image_url,
    p.secondary_images,
    p.badge,
    p.rating,
    p.review_count,
    p.specifications,
    p.how_to_use,
    p.suitable_for,
    p.related_service_slugs,
    p.related_product_slugs,
    p.business_id
  from public.products p
  where p.status = 'active';

-- ============================================================
-- 72.5 PUBLIC VIEW: GALLERY (public-safe fields only)
-- ============================================================
drop view if exists public.v_public_gallery;
create view public.v_public_gallery as
  select
    g.id,
    g.title,
    g.alt,
    g.category,
    g.image_url,
    g.caption,
    g.sort_order
  from public.gallery_items g
  where g.is_active = true;

-- ============================================================
-- 72.6 PUBLIC VIEW: FAQS (public-safe fields only)
-- ============================================================
drop view if exists public.v_public_faqs;
create view public.v_public_faqs as
  select
    f.id,
    f.question,
    f.answer,
    f.category,
    f.sort_order,
    f.is_featured_on_home,
    f.internal_link_label,
    f.internal_link_url
  from public.faqs f
  where f.is_active = true;

-- ============================================================
-- 72.7 PUBLIC VIEW: SERVICE CATEGORIES
-- ============================================================
drop view if exists public.v_public_categories;
create view public.v_public_categories as
  select
    c.id,
    c.slug,
    c.name,
    c.description,
    c.icon,
    c.sort_order,
    c.business_id
  from public.service_categories c
  where c.is_active = true;

-- ============================================================
-- 72.8 GRANT SELECT ON VIEWS TO ANON + AUTHENTICATED
-- ============================================================
grant select on public.v_public_business to anon, authenticated;
grant select on public.v_public_services to anon, authenticated;
grant select on public.v_public_providers to anon, authenticated;
grant select on public.v_public_products to anon, authenticated;
grant select on public.v_public_gallery to anon, authenticated;
grant select on public.v_public_faqs to anon, authenticated;
grant select on public.v_public_categories to anon, authenticated;

-- ============================================================
-- 72.9 RESTRICT DIRECT ANON TABLE ACCESS
--     NOTE: These revokes are intentionally commented out for now.
--     They can be enabled once the frontend service layer is
--     migrated to query the public views (v_public_*) instead of
--     raw tables. RLS policies on the underlying tables remain
--     enabled and filter rows to active/public records.
--
--     To enable (after frontend view migration):
--     revoke select on public.businesses from anon;
--     revoke select on public.services from anon;
--     revoke select on public.service_providers from anon;
--     revoke select on public.products from anon;
--     revoke select on public.gallery_items from anon;
--     revoke select on public.faqs from anon;
--     revoke select on public.service_categories from anon;
--     revoke select on public.provider_services from anon;
--     revoke select on public.product_reviews from anon;
--     revoke select on public.service_reviews from anon;
-- ============================================================

-- ============================================================
-- 72.10 ANON WRITES TO BOOKINGS / CUSTOMERS
--     Guests book ONLY through the create_booking RPC (security
--     definer), which calculates prices & validates server-side.
--     Drops the overly-broad direct-insert RLS policies so the
--     only path for anon writes is the RPC.
-- ============================================================
drop policy if exists "Public can create bookings" on public.bookings;
drop policy if exists "Public can create customers" on public.customers;
drop policy if exists "Public can view own bookings by phone" on public.bookings;

-- Force PostgREST to reload its schema cache so the new views are
-- immediately visible to the client.
notify pgrst, 'reload schema';