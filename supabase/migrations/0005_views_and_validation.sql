-- ============================================================
-- 71. REMOVE ALL SEEDED BUSINESS DATA
--     Production cleanup: ensure the application starts with an
--     empty database state. The admin account (auth.users +
--     staff_profiles + admin service_provider) created by 0003 and
--     preserved by 0027 remains untouched.
--
--     WARNING: This deletes ALL services, products, bookings,
--     reviews, gallery items, FAQs, categories, schedules, and
--     hours. It is intentional — the database is the source of
--     truth and business data is created by the admin through
--     the management UI.
-- ============================================================

-- Disable FK triggers temporarily to allow clean cascade without
-- dependency ordering issues.
set session_replication_role = 'replica';

-- Delete junction / join tables first
delete from public.booking_resources;
delete from public.booking_services;
delete from public.provider_services;

-- Delete bookings & related payments
delete from public.bookings;
delete from public.mpesa_payments;

-- Delete reviews
delete from public.product_reviews;
delete from public.service_reviews;

-- Delete products
delete from public.products;

-- Delete services + service requirements
delete from public.service_requirements;
delete from public.services;

-- Delete categories
delete from public.service_categories;

-- Delete gallery
delete from public.gallery_items;

-- Delete FAQs
delete from public.faqs;

-- Delete schedule-related data
delete from public.staff_schedule_exceptions;
delete from public.staff_breaks;
delete from public.staff_schedules;
delete from public.schedule_blocks;
delete from public.provider_availability;
delete from public.business_hours;

-- Re-enable FK triggers
set session_replication_role = 'origin';

-- ============================================================
-- SAFETY NET: Prevent accidental re-seeding
-- (All tables use UUID primary keys — no serial sequences exist.)
-- Comment out or remove the old seed migration files (0005, 0009,
-- 0028, 0029 content) from the migration history, or keep them for
-- new installs that run all migrations in order. On a fresh clone,
-- these seeds run first, then this migration wipes them — leaving
-- the production state clean.
-- ============================================================
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
notify pgrst, 'reload schema';-- ============================================================
-- 73. RLS FIXES: GUEST INSERTS + PROVIDER SCOPING
--
--  A. Fix the "new row violates row-level security policy for
--     table product_reviews" error — ensures anon can INSERT with
--     review_status forced to 'pending' (never self-approved).
--  B. Tighten provider scoping on schedule/availability tables
--     so a provider can only read their OWN records.
--  C. Provider update policy restricted to own profile fields.
-- ============================================================

-- ============================================================
-- 73.1 PRODUCT REVIEWS — PUBLIC INSERT (fixes RLS error)
--     Guarantees guests can only insert pending reviews.
--     Public SELECT must only show approved reviews.
-- ============================================================
drop policy if exists "Public can submit product reviews" on public.product_reviews;
create policy "Public can submit product reviews" on public.product_reviews
  for insert with check (review_status = 'pending');

-- Enforce at DB level: guests cannot write approved/rejected/archived.
drop policy if exists "Admin can manage product reviews" on public.product_reviews;
create policy "Admin can manage product reviews" on public.product_reviews
  for all using (public.is_admin())
  with check (public.is_admin());

-- Staff can view all reviews (pending included)
drop policy if exists "Staff can view product reviews" on public.product_reviews;
create policy "Staff can view product reviews" on public.product_reviews
  for select using (public.is_staff());

-- ============================================================
-- 73.2 SERVICE REVIEWS — PUBLIC INSERT (guest with pending status)
-- ============================================================
drop policy if exists "Public can submit service reviews" on public.service_reviews;
create policy "Public can submit service reviews" on public.service_reviews
  for insert with check (review_status = 'pending');

drop policy if exists "Admin can manage service reviews" on public.service_reviews;
create policy "Admin can manage service reviews" on public.service_reviews
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Staff can view service reviews" on public.service_reviews;
create policy "Staff can view service reviews" on public.service_reviews
  for select using (public.is_staff());

-- ============================================================
-- 73.3 PROVIDER SCHEDULE SCOPING
--     Providers may read their OWN schedules / breaks /
--     exceptions / availability only (admin sees all).
-- ============================================================
drop policy if exists "Staff can view staff schedules" on public.staff_schedules;
create policy "Staff can view staff schedules" on public.staff_schedules
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

drop policy if exists "Staff can view staff breaks" on public.staff_breaks;
create policy "Staff can view staff breaks" on public.staff_breaks
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

drop policy if exists "Staff can view schedule exceptions" on public.staff_schedule_exceptions;
create policy "Staff can view schedule exceptions" on public.staff_schedule_exceptions
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

drop policy if exists "Staff can view provider availability" on public.provider_availability;
create policy "Staff can view provider availability" on public.provider_availability
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

drop policy if exists "Staff can view schedule blocks" on public.schedule_blocks;
create policy "Staff can view schedule blocks" on public.schedule_blocks
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

-- ============================================================
-- 73.4 PROVIDER OWN-SCHEDULE WRITES
--     Providers can manage their own schedule blocks only.
-- ============================================================
drop policy if exists "Provider can manage own schedule blocks" on public.schedule_blocks;
create policy "Provider can manage own schedule blocks" on public.schedule_blocks
  for all using (provider_id = public.get_my_provider_id())
  with check (provider_id = public.get_my_provider_id());

-- ============================================================
-- 73.5 PROVIDER OWN PROFILE UPDATE (column-safe)
--     Providers may update ONLY their own bio, avatar, instagram,
--     and schedule. They can NEVER update email / phone / role /
--     status / business_id / services_offered_ids.
--     Admin retains full control via the admin policy below.
-- ============================================================
drop policy if exists "Providers can update own profile" on public.service_providers;
create policy "Providers can update own profile" on public.service_providers
  for update using (id = public.get_my_provider_id())
  with check (id = public.get_my_provider_id());

-- Column-level protection: revoke direct UPDATE on sensitive columns
-- for non-admin roles. (RLS + column privileges together enforce
-- that a provider cannot touch another row's sensitive columns.)
revoke update (email, phone, provider_type, status, services_offered_ids, business_id)
  on public.service_providers from authenticated;

-- Ensure anon can never modify providers
revoke insert, update, delete on public.service_providers from anon;

-- ============================================================
-- 73.6 STAFF PROFILES — no self-elevation
--     A provider cannot change their own role to admin.
-- ============================================================
drop policy if exists "Users can update own profile" on public.staff_profiles;
create policy "Users can update own profile" on public.staff_profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.staff_profiles where id = auth.uid())
  );

revoke update (role) on public.staff_profiles from authenticated;

-- ============================================================
-- 73.7 BOOKINGS — provider scoping (defense in depth)
--     Providers ONLY see their own bookings; admin sees all.
--     Ensures a provider cannot browse other providers' data.
-- ============================================================
drop policy if exists "Staff can view bookings" on public.bookings;
create policy "Staff can view bookings" on public.bookings
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

drop policy if exists "Staff can create bookings" on public.bookings;
create policy "Staff can create bookings" on public.bookings
  for insert with check (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

-- ============================================================
-- 73.8 PUBLIC / GUEST BOOKINGS — narrow RPC-only insert
--     Guests use create_booking / check_and_reserve security
--     definer functions. No direct anon table INSERT/UPDATE/DELETE.
-- ============================================================
-- (Direct anon grants on bookings are NOT granted — guests must
--  use the RPC. The previous broad "Public can create bookings"
--  policy was dropped in 0032.)

-- ============================================================
-- 73.9 GRANT EXECUTE on security-definer RPCs to anon
--     (idempotent — ensure guests can still book & submit reviews)
-- ============================================================
grant execute on function public.create_booking(text, text, text, uuid[], uuid, date, text, text, numeric, text, boolean, text) to anon, authenticated;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_slots(uuid, date, uuid[]) to anon, authenticated;
grant execute on function public.check_and_reserve(uuid, uuid, timestamptz, uuid[], boolean, text, text, text, text, boolean, text, text) to anon, authenticated;
grant execute on function public.calculate_booking_totals(uuid[], uuid) to anon, authenticated;
grant execute on function public.get_booking_by_reference(text) to anon, authenticated;
grant execute on function public.get_qualified_staff(uuid) to anon, authenticated;

-- Force PostgREST to reload its schema cache.
notify pgrst, 'reload schema';-- ============================================================
-- 74. DATABASE CONSTRAINTS & VALIDATION
--     Enforce business rules at the database level so a malicious
--     or buggy client cannot persist invalid data.
-- ============================================================

-- ============================================================
-- 74.1 SERVICES — positive price & duration
-- ============================================================
alter table public.services drop constraint if exists chk_services_price_positive;
alter table public.services add constraint chk_services_price_positive
  check (price_ksh >= 0);

alter table public.services drop constraint if exists chk_services_duration_positive;
alter table public.services add constraint chk_services_duration_positive
  check (duration_minutes > 0);

-- ============================================================
-- 74.2 PRODUCTS — positive price, non-negative stock
-- ============================================================
alter table public.products drop constraint if exists chk_products_price_positive;
alter table public.products add constraint chk_products_price_positive
  check (price_ksh >= 0);

alter table public.products drop constraint if exists chk_products_original_price;
alter table public.products add constraint chk_products_original_price
  check (original_price_ksh is null or original_price_ksh >= price_ksh);

alter table public.products drop constraint if exists chk_products_stock_nonneg;
alter table public.products add constraint chk_products_stock_nonneg
  check (stock_quantity >= 0);

-- Products availability must be one of the known values
alter table public.products drop constraint if exists chk_products_availability;
alter table public.products add constraint chk_products_availability
  check (availability in ('in-stock', 'low-stock', 'out-of-stock'));

-- ============================================================
-- 74.3 BOOKINGS — payment invariants
--     total = deposit + remaining (server-side truth).
-- ============================================================
alter table public.bookings drop constraint if exists chk_bookings_prices_nonneg;
alter table public.bookings add constraint chk_bookings_prices_nonneg
  check (
    total_price_ksh >= 0
    and deposit_paid_ksh >= 0
    and remaining_balance_ksh >= 0
  );

alter table public.bookings drop constraint if exists chk_bookings_balance_math;
alter table public.bookings add constraint chk_bookings_balance_math
  check (deposit_paid_ksh + remaining_balance_ksh = total_price_ksh);

alter table public.bookings drop constraint if exists chk_bookings_deposit_not_over_total;
alter table public.bookings add constraint chk_bookings_deposit_not_over_total
  check (deposit_paid_ksh <= total_price_ksh);

-- ============================================================
-- 74.4 M-PESA PAYMENTS — positive amount
-- ============================================================
alter table public.mpesa_payments drop constraint if exists chk_mpesa_amount_positive;
alter table public.mpesa_payments add constraint chk_mpesa_amount_positive
  check (amount_ksh > 0);

-- ============================================================
-- 74.5 REVIEWS — rating range enforced at DB level
--     (product_reviews and service_reviews already have
--      check (rating between 1 and 5) from creation.)
--     Re-assert defensively:
-- ============================================================
alter table public.product_reviews drop constraint if exists chk_product_reviews_rating;
alter table public.product_reviews add constraint chk_product_reviews_rating
  check (rating between 1 and 5);

alter table public.product_reviews drop constraint if exists chk_product_reviews_status;
alter table public.product_reviews add constraint chk_product_reviews_status
  check (review_status in ('pending', 'approved', 'rejected', 'archived'));

alter table public.service_reviews drop constraint if exists chk_service_reviews_rating;
alter table public.service_reviews add constraint chk_service_reviews_rating
  check (rating between 1 and 5);

alter table public.service_reviews drop constraint if exists chk_service_reviews_status;
alter table public.service_reviews add constraint chk_service_reviews_status
  check (review_status in ('pending', 'approved', 'rejected', 'archived'));

-- ============================================================
-- 74.6 BOOKINGS — required relationships
--     A booking must reference an existing service/provider.
--     (FKs already exist; add NOT NULL on the critical ones
--      that were previously nullable.)
-- ============================================================
alter table public.bookings alter column provider_id set not null;
alter table public.bookings alter column provider_name set not null;
alter table public.bookings alter column service_ids set not null;
alter table public.bookings alter column service_names set not null;

-- ============================================================
-- 74.7 CUSTOMERS from guest bookings need business_id
-- ============================================================
alter table public.customers alter column name set not null;

-- ============================================================
-- 74.8 DEPLOY DEACTIVATE-INSTEAD-OF-DELETE PATTERN
--     Service providers already use status enum
--     ('active' / 'inactive'). Services use 'active'/'inactive'/
--     'archived'. This keeps historical bookings intact.
--     (No extra schema change required — documented here.)
-- ============================================================

-- Force PostgREST to reload its schema cache.
notify pgrst, 'reload schema';-- -- ============================================================
-- -- 75. RLS SECURITY TEST SUITE
-- --     Run against a local/CI Supabase instance to verify that
-- --     Row Level Security correctly ALLOWS and DENIES operations
-- --     for anonymous users, providers, and admins.
-- --
-- --     Execute with:  psql "..." -f supabase/migrations/0035_rls_security_tests.sql
-- --     (or via supabase db test / pgTAP if configured).
-- --
-- --     IMPORTANT: These tests run INSIDE a transaction and ROLL
-- --     BACK at the end so they never mutate real data.
-- -- ============================================================

-- begin;

-- -- ============================================================
-- -- 75.0 SETUP — require a business row + basic test records
-- --     (These are test fixtures created WITHIN the transaction and
-- --      rolled back — never persist to production.)
-- -- ============================================================
-- -- Ensure default business exists for FK constraints
-- insert into public.businesses (id, name, city, country)
-- values ('00000000-0000-0000-0000-000000000001', 'Test Business', 'Nairobi', 'Kenya')
-- on conflict (id) do nothing;

-- -- Create two test providers for scoping checks
-- do $$
-- declare
--   v_p1 uuid := gen_random_uuid();
--   v_p2 uuid := gen_random_uuid();
--   v_svc uuid := gen_random_uuid();
--   v_cust uuid := gen_random_uuid();
--   v_booking uuid;
-- begin
--   insert into public.service_providers (id, slug, first_name, last_name, full_name, provider_type, status, business_id)
--   values (v_p1, 'test-provider-a', 'Test', 'Provider A', 'Test Provider A', 'barber', 'active', '00000000-0000-0000-0000-000000000001');
--   insert into public.service_providers (id, slug, first_name, last_name, full_name, provider_type, status, business_id)
--   values (v_p2, 'test-provider-b', 'Test', 'Provider B', 'Test Provider B', 'barber', 'active', '00000000-0000-0000-0000-000000000001');

--   insert into public.services (id, slug, name, category, price_ksh, duration_minutes, status, business_id)
--   values (v_svc, 'test-service', 'Test Service', 'haircuts', 1000, 30, 'active', '00000000-0000-0000-0000-000000000001');

--   insert into public.customers (id, name, phone, business_id)
--   values (v_cust, 'Test Customer', '+254712345678', '00000000-0000-0000-0000-000000000001');

--   insert into public.bookings (
--     id, reference_number, customer_id, customer_name, customer_phone,
--     service_ids, service_names, provider_id, provider_name,
--     date, time_slot, duration_minutes, total_price_ksh,
--     deposit_paid_ksh, remaining_balance_ksh, status, payment_status,
--     business_id
--   ) values (
--     gen_random_uuid(), 'TEST-REF-1', v_cust, 'Test Customer', '+254712345678',
--     array[v_svc], array['Test Service'], v_p1, 'Test Provider A',
--     current_date, '10:00 AM', 30, 1000, 500, 500, 'confirmed', 'deposit-paid',
--     '00000000-0000-0000-0000-000000000001'
--   );
-- end $$;

-- -- ============================================================
-- -- 75.1 ANONYMOUS USER TESTS
-- -- ============================================================
-- -- Run as anon role (no auth)
-- set role anon;

-- -- ALLOWED: can read public services view
-- do $$
-- begin
--   perform * from public.v_public_services limit 1;
-- exception when others then
--   raise exception 'ANON should be able to read v_public_services: %', sqlerrm;
-- end $$;

-- -- ALLOWED: can read public providers view
-- do $$
-- begin
--   perform * from public.v_public_providers limit 1;
-- exception when others then
--   raise exception 'ANON should be able to read v_public_providers: %', sqlerrm;
-- end $$;

-- -- ALLOWED: can read public products view (empty)
-- do $$
-- begin
--   perform * from public.v_public_products limit 1;
-- exception when others then
--   raise exception 'ANON should be able to read v_public_products: %', sqlerrm;
-- end $$;

-- -- ALLOWED: can read public gallery view (empty)
-- do $$
-- begin
--   perform * from public.v_public_gallery limit 1;
-- exception when others then
--   raise exception 'ANON should be able to read v_public_gallery: %', sqlerrm;
-- end $$;

-- -- ALLOWED: can read public FAQs view (empty)
-- do $$
-- begin
--   perform * from public.v_public_faqs limit 1;
-- exception when others then
--   raise exception 'ANON should be able to read v_public_faqs: %', sqlerrm;
-- end $$;

-- -- ALLOWED: can insert a pending product review
-- do $$
-- begin
--   insert into public.product_reviews (product_id, author_name, rating, comment, review_status)
--   values (null, 'Anon Tester', 5, 'Test review', 'pending');
-- exception when others then
--   raise exception 'ANON should be able to insert pending product review: %', sqlerrm;
-- end $$;

-- -- DENIED: cannot insert an approved product review (self-approval)
-- do $$
-- begin
--   begin
--     insert into public.product_reviews (product_id, author_name, rating, comment, review_status)
--     values (null, 'Anon Tester', 5, 'Should fail', 'approved');
--     raise exception 'ANON must NOT be able to insert approved review';
--   exception when insufficient_privilege or sqlstate '42501' then
--     null; -- expected denial
--   end;
-- end $$;

-- -- DENIED: cannot read all bookings directly
-- -- NOTE: with RLS enabled and a table-level GRANT (Supabase's default),
-- -- a SELECT that matches no policy returns an EMPTY result, not a
-- -- permission-denied error. We must check whether a row actually came
-- -- back (FOUND) rather than waiting for an exception that won't fire.
-- do $$
-- declare
--   v_found boolean;
-- begin
--   begin
--     select true into v_found from public.bookings limit 1;
--     if v_found then
--       raise exception 'ANON must NOT be able to read bookings directly';
--     end if;
--   exception when insufficient_privilege or sqlstate '42501' then
--     null; -- also acceptable: table grant itself was denied
--   end;
-- end $$;

-- -- DENIED: cannot update services
-- -- Same caveat as above: a blocked UPDATE with RLS just affects 0 rows,
-- -- it does not raise insufficient_privilege by itself.
-- do $$
-- declare
--   v_rows int;
-- begin
--   begin
--     update public.services set price_ksh = 9999 where slug = 'test-service';
--     get diagnostics v_rows = row_count;
--     if v_rows > 0 then
--       raise exception 'ANON must NOT be able to update services';
--     end if;
--   exception when insufficient_privilege or sqlstate '42501' then
--     null; -- expected denial
--   end;
-- end $$;

-- -- DENIED: cannot delete services
-- do $$
-- declare
--   v_rows int;
-- begin
--   begin
--     delete from public.services where slug = 'test-service';
--     get diagnostics v_rows = row_count;
--     if v_rows > 0 then
--       raise exception 'ANON must NOT be able to delete services';
--     end if;
--   exception when insufficient_privilege or sqlstate '42501' then
--     null; -- expected denial
--   end;
-- end $$;

-- -- DENIED: cannot read staff profiles
-- do $$
-- declare
--   v_found boolean;
-- begin
--   begin
--     select true into v_found from public.staff_profiles limit 1;
--     if v_found then
--       raise exception 'ANON must NOT be able to read staff_profiles';
--     end if;
--   exception when insufficient_privilege or sqlstate '42501' then
--     null; -- also acceptable: table grant itself was denied
--   end;
-- end $$;

-- reset role;

-- -- ============================================================
-- -- 75.2 PROVIDER TESTS
-- --     Simulate a provider by setting auth.uid() to a made-up uuid
-- --     and calling get_my_provider_id() indirectly — we can't trivially
-- --     mock auth in plain SQL, so the tests below use the function
-- --     checks to verify the POLICY definitions exist and behave.
-- --     (Full auth-user simulation requires the Supabase test
-- --      framework / pgTAP with auth.uid() stubbed.)
-- -- ============================================================

-- -- Verify the is_admin() helper works
-- do $$
-- begin
--   -- is_admin() should return false for no auth (anon context)
--   if public.is_admin() then
--     raise exception 'is_admin() should be false in anon context';
--   end if;
-- end $$;

-- -- Verify the provider-scoped policy for staff_schedules exists with correct shape
-- do $$
-- declare
--   v_policy_exists boolean;
-- begin
--   select exists (
--     select 1 from pg_policies
--     where schemaname = 'public'
--       and tablename = 'staff_schedules'
--       and policyname = 'Staff can view staff schedules'
--   ) into v_policy_exists;
--   if not v_policy_exists then
--     raise exception 'Staff can view staff schedules policy is missing';
--   end if;
-- end $$;

-- -- Verify the column-level revoke on service_providers (email/phone/etc.)
-- do $$
-- declare
--   v_has_update_priv boolean;
-- begin
--   -- authenticated role should NOT have update privilege on email column
--   select has_column_privilege('authenticated', 'public.service_providers', 'email', 'UPDATE')
--   into v_has_update_priv;
--   if v_has_update_priv then
--     raise exception 'authenticated should NOT be able to UPDATE service_providers.email';
--   end if;
-- end $$;

-- -- ============================================================
-- -- 75.3 ADMIN TESTS
-- --     Verify the admin RPC functions exist and are executable by
-- --     authenticated (they self-check is_admin() inside).
-- -- ============================================================
-- select exists (
--   select 1 from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'admin_list_products'
-- ) as admin_list_products_exists;

-- select exists (
--   select 1 from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'admin_set_review_status'
-- ) as admin_set_review_status_exists;

-- select exists (
--   select 1 from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'admin_list_service_reviews'
-- ) as admin_list_service_reviews_exists;

-- -- ============================================================
-- -- 75.4 DATABASE CONSTRAINT TESTS
-- --     Verify the constraints we added actually reject bad data.
-- -- ============================================================
-- set role postgres;

-- -- DENIED: negative service price
-- do $$
-- begin
--   begin
--     insert into public.services (slug, name, category, price_ksh, duration_minutes, status)
--     values ('neg-price-test', 'Neg Price', 'haircuts', -1, 30, 'active');
--     raise exception 'Negative service price should be rejected';
--   exception when check_violation then
--     null; -- expected
--   end;
-- end $$;

-- -- DENIED: zero-duration service
-- do $$
-- begin
--   begin
--     insert into public.services (slug, name, category, price_ksh, duration_minutes, status)
--     values ('zero-dur-test', 'Zero Dur', 'haircuts', 1000, 0, 'active');
--     raise exception 'Zero-duration service should be rejected';
--   exception when check_violation then
--     null; -- expected
--   end;
-- end $$;

-- -- DENIED: booking with inconsistent balance math
-- do $$
-- begin
--   begin
--     insert into public.bookings (
--       reference_number, customer_name, provider_name, date, time_slot,
--       service_ids, service_names, total_price_ksh, deposit_paid_ksh,
--       remaining_balance_ksh, status, payment_status
--     ) values (
--       'BAD-BAL-1', 'Bad', 'Bad', current_date, '11:00 AM',
--       '{}', '{}', 1000, 200, 200, 'confirmed', 'paid'
--     );
--     raise exception 'Balance math mismatch should be rejected';
--   exception when check_violation then
--     null; -- expected
--   end;
-- end $$;

-- -- DENIED: invalid product review rating (outside 1-5)
-- do $$
-- begin
--   begin
--     insert into public.product_reviews (author_name, rating, comment, review_status)
--     values ('Bad', 6, 'Bad rating', 'pending');
--     raise exception 'Rating > 5 should be rejected';
--   exception when check_violation then
--     null; -- expected
--   end;
-- end $$;

-- -- ============================================================
-- -- 75.5 CLEANUP — roll back ALL test data, never persist.
-- -- ============================================================
-- rollback;

-- -- ============================================================
-- -- NOTE: This file ends with rollback — safe for CI and local runs.
-- -- If a migration runner applies files transactionally, the
-- -- rollback ensures no test fixtures leak into production.
-- -- ============================================================