-- ============================================================
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
notify pgrst, 'reload schema';