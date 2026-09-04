-- ============================================================
-- CONSOLIDATED ROW LEVEL SECURITY (RLS) — ALL TABLES & BUCKETS
-- ============================================================

-- Enable RLS on all tables
alter table public.businesses enable row level security;
alter table public.service_providers enable row level security;
alter table public.services enable row level security;
alter table public.provider_services enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.gallery_items enable row level security;
alter table public.faqs enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.mpesa_payments enable row level security;
alter table public.provider_availability enable row level security;

-- ============================================================
-- PUBLIC / ANONYMOUS ACCESS (Frontend Website)
-- These policies allow anonymous users to READ public data
-- that the marketing site needs (services, providers, gallery, FAQs, products, categories)
-- ============================================================

-- PUBLIC: Anyone can view active services
drop policy if exists "Public can view active services" on public.services;
create policy "Public can view active services" on public.services
  for select using (status = 'active');

-- PUBLIC: Anyone can view active service providers
drop policy if exists "Public can view active providers" on public.service_providers;
create policy "Public can view active providers" on public.service_providers
  for select using (status = 'active');

-- PUBLIC: Anyone can view active categories
drop policy if exists "Public can view active categories" on public.service_categories;
create policy "Public can view active categories" on public.service_categories
  for select using (is_active = true);

-- PUBLIC: Anyone can view active products
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
  for select using (status = 'active');

-- PUBLIC: Anyone can view product reviews (for active products only)
drop policy if exists "Public can view product reviews" on public.product_reviews;
create policy "Public can view product reviews" on public.product_reviews
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_reviews.product_id and p.status = 'active'
    )
  );

-- PUBLIC: Anyone can view gallery items
drop policy if exists "Public can view gallery" on public.gallery_items;
create policy "Public can view gallery" on public.gallery_items
  for select using (is_active = true);

-- PUBLIC: Anyone can view FAQs
drop policy if exists "Public can view FAQs" on public.faqs;
create policy "Public can view FAQs" on public.faqs
  for select using (is_active = true);

-- PUBLIC: Anyone can view business profile
drop policy if exists "Public can view business" on public.businesses;
create policy "Public can view business" on public.businesses
  for select using (true);

-- PUBLIC: Anyone can create bookings (customer booking flow)
drop policy if exists "Public can create bookings" on public.bookings;
create policy "Public can create bookings" on public.bookings
  for insert with check (true);

-- PUBLIC: Anyone can read own bookings by phone (customer booking status lookup)
drop policy if exists "Public can view own bookings by phone" on public.bookings;
create policy "Public can view own bookings by phone" on public.bookings
  for select using (customer_phone is not null);

-- PUBLIC: Anyone can create customers (during booking flow)
drop policy if exists "Public can create customers" on public.customers;
create policy "Public can create customers" on public.customers
  for insert with check (true);

-- PUBLIC: Anyone can view provider-service join (for service provider lookup on frontend)
drop policy if exists "Public can view provider services" on public.provider_services;
create policy "Public can view provider services" on public.provider_services
  for select using (true);

-- ============================================================
-- STAFF RLS (Logged-in portal users)
-- ============================================================

-- STAFF: Can view all businesses
drop policy if exists "Staff can view all businesses" on public.businesses;
create policy "Staff can view all businesses" on public.businesses
  for select using (public.is_staff());

-- STAFF: Can view all providers
drop policy if exists "Staff can view all providers" on public.service_providers;
create policy "Staff can view all providers" on public.service_providers
  for select using (public.is_staff());

-- STAFF: Can view all services
drop policy if exists "Staff can view all services" on public.services;
create policy "Staff can view all services" on public.services
  for select using (public.is_staff());

-- STAFF: Can view all customers
drop policy if exists "Staff can view all customers" on public.customers;
create policy "Staff can view all customers" on public.customers
  for select using (public.is_staff());

-- STAFF: Can create customers
drop policy if exists "Staff can create customers" on public.customers;
create policy "Staff can create customers" on public.customers
  for insert with check (public.is_staff());

-- STAFF: Can update customers
drop policy if exists "Staff can update customers" on public.customers;
create policy "Staff can update customers" on public.customers
  for update using (public.is_staff());

-- STAFF: Can view bookings (admin sees all, provider sees own)
drop policy if exists "Staff can view bookings" on public.bookings;
create policy "Staff can view bookings" on public.bookings
  for select using (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

-- STAFF: Can create bookings
drop policy if exists "Staff can create bookings" on public.bookings;
create policy "Staff can create bookings" on public.bookings
  for insert with check (
    public.is_admin() or provider_id = public.get_my_provider_id()
  );

-- ADMIN: Can update any booking
drop policy if exists "Admin can update bookings" on public.bookings;
create policy "Admin can update bookings" on public.bookings
  for update using (public.is_admin());

-- PROVIDER: Can update own pending/confirmed bookings
drop policy if exists "Provider can update own bookings" on public.bookings;
create policy "Provider can update own bookings" on public.bookings
  for update using (
    provider_id = public.get_my_provider_id() and status in ('pending', 'confirmed')
  );

-- STAFF: Can view staff profiles
drop policy if exists "Staff can view staff profiles" on public.staff_profiles;
create policy "Staff can view staff profiles" on public.staff_profiles
  for select using (public.is_staff());

-- ADMIN: Can manage staff profiles
drop policy if exists "Admin can manage staff profiles" on public.staff_profiles;
create policy "Admin can manage staff profiles" on public.staff_profiles
  for all using (public.is_admin());

-- USERS: Can update own profile
drop policy if exists "Users can update own profile" on public.staff_profiles;
create policy "Users can update own profile" on public.staff_profiles
  for update using (auth.uid() = id);

-- STAFF: Can view categories
drop policy if exists "Staff can view categories" on public.service_categories;
create policy "Staff can view categories" on public.service_categories
  for select using (public.is_staff());

-- ADMIN: Can manage categories
drop policy if exists "Admin can manage categories" on public.service_categories;
create policy "Admin can manage categories" on public.service_categories
  for all using (public.is_admin());

-- STAFF: Can view products
drop policy if exists "Staff can view products" on public.products;
create policy "Staff can view products" on public.products
  for select using (public.is_staff());

-- ADMIN: Can manage products
drop policy if exists "Admin can manage products" on public.products;
create policy "Admin can manage products" on public.products
  for all using (public.is_admin());

-- STAFF: Can view product reviews
drop policy if exists "Staff can view product reviews" on public.product_reviews;
create policy "Staff can view product reviews" on public.product_reviews
  for select using (public.is_staff());

-- ADMIN: Can manage product reviews
drop policy if exists "Admin can manage product reviews" on public.product_reviews;
create policy "Admin can manage product reviews" on public.product_reviews
  for all using (public.is_admin());

-- STAFF: Can view gallery
drop policy if exists "Staff can view gallery" on public.gallery_items;
create policy "Staff can view gallery" on public.gallery_items
  for select using (public.is_staff());

-- ADMIN: Can manage gallery
drop policy if exists "Admin can manage gallery" on public.gallery_items;
create policy "Admin can manage gallery" on public.gallery_items
  for all using (public.is_admin());

-- STAFF: Can view FAQs
drop policy if exists "Staff can view FAQs" on public.faqs;
create policy "Staff can view FAQs" on public.faqs
  for select using (public.is_staff());

-- ADMIN: Can manage FAQs
drop policy if exists "Admin can manage FAQs" on public.faqs;
create policy "Admin can manage FAQs" on public.faqs
  for all using (public.is_admin());

-- STAFF: Can view schedule blocks
drop policy if exists "Staff can view schedule blocks" on public.schedule_blocks;
create policy "Staff can view schedule blocks" on public.schedule_blocks
  for select using (public.is_staff());

-- ADMIN: Can manage schedule blocks
drop policy if exists "Admin can manage schedule blocks" on public.schedule_blocks;
create policy "Admin can manage schedule blocks" on public.schedule_blocks
  for all using (public.is_admin());

-- STAFF: Can view M-Pesa payments
drop policy if exists "Staff can view mpesa payments" on public.mpesa_payments;
create policy "Staff can view mpesa payments" on public.mpesa_payments
  for select using (public.is_staff());

-- ADMIN: Can manage M-Pesa payments
drop policy if exists "Admin can manage mpesa payments" on public.mpesa_payments;
create policy "Admin can manage mpesa payments" on public.mpesa_payments
  for all using (public.is_admin());

-- STAFF: Can view provider availability
drop policy if exists "Staff can view provider availability" on public.provider_availability;
create policy "Staff can view provider availability" on public.provider_availability
  for select using (public.is_staff());

-- ADMIN: Can manage provider availability
drop policy if exists "Admin can manage provider availability" on public.provider_availability;
create policy "Admin can manage provider availability" on public.provider_availability
  for all using (public.is_admin());

-- ============================================================
-- STORAGE BUCKET POLICIES
-- ============================================================

-- PUBLIC: Anyone can read public images
drop policy if exists "Public can read public images" on storage.objects;
create policy "Public can read public images" on storage.objects
  for select using (bucket_id in ('avatars', 'services', 'business'));

-- STAFF: Can upload images to any bucket
drop policy if exists "Staff can upload images" on storage.objects;
create policy "Staff can upload images" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'services', 'business') and public.is_staff()
  );

-- ADMIN: Can delete images
drop policy if exists "Admin can delete images" on storage.objects;
create policy "Admin can delete images" on storage.objects
  for delete using (public.is_admin());

-- STAFF: Can update images (overwrite)
drop policy if exists "Staff can update images" on storage.objects;
create policy "Staff can update images" on storage.objects
  for update using (
    bucket_id in ('avatars', 'services', 'business') and public.is_staff()
  );-- ============================================================
-- 42. DATABASE NORMALIZATION + RLS HARDENING
--
-- Audit findings fixed here:
--
-- RLS / SECURITY
--   1. is_admin(), is_staff(), get_my_provider_id() are SECURITY
--      DEFINER without a pinned search_path — a search_path
--      hijack could bypass admin/staff checks. Pinned to public.
--   2. Sensitive tables had GRANT ALL TO anon (bookings,
--      customers, mpesa_payments, sms_messages, staff_profiles,
--      booking_resources, booking_services). RLS blocked rows,
--      but grants are now least-privilege: anon keeps access to
--      everything guests actually use (public content tables +
--      security-definer RPCs such as check_and_reserve,
--      get_booking_by_reference, get_customer_schedule_history,
--      get_available_slots) and NOTHING directly on sensitive
--      tables. Staff keep the operations their policies allow.
--   3. "Public can view booking services" exposed booking_id →
--      service_id links to anonymous callers (enumeration leak,
--      not needed by the guest flow which uses RPCs). Removed.
--
-- NORMALIZATION
--   4. provider_availability duplicated staff_schedule_exceptions
--      / schedule_blocks / staff_schedules and was referenced by
--      nothing but the legacy is_provider_available() (unused by
--      the app). Dropped both.
--   5. services.category (text) duplicated service_categories.
--      category_id is now the source of truth: FK added, rows
--      backfilled, and a trigger keeps the denormalized `category`
--      label in sync from service_categories.slug (the UI keeps
--      reading `category` without break).
--   6. services.business_id had no FK — added.
--   7. bookings denormalized snapshot columns (customer_name,
--      service_names, prices, time_slot...) are INTENTIONAL
--      historical records (prices/names change over time); the
--      normalized sources remain booking_services,
--      booking_resources and customers. Documented via COMMENT.
-- ============================================================

-- ------------------------------------------------------------
-- 42.1 Pin search_path on security-critical helper functions
-- ------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid());
$$;

create or replace function public.get_my_provider_id() returns uuid
language sql stable security definer set search_path = public as $$
  select provider_id from public.staff_profiles where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- 42.2 Least-privilege table grants
--      (anon keeps: public content tables + definer RPCs;
--       authenticated keeps: operations its policies allow;
--       service_role keeps ALL — edge functions rely on it)
-- ------------------------------------------------------------

-- Sensitive tables: no direct anonymous access at all.
-- Guests reach bookings/customers only through security-definer
-- RPCs (check_and_reserve, get_booking_by_reference,
-- get_customer_schedule_history) which is the audited path.
revoke all on table public.bookings from anon;
revoke all on table public.customers from anon;
revoke all on table public.mpesa_payments from anon;
revoke all on table public.sms_messages from anon;
revoke all on table public.staff_profiles from anon;
revoke all on table public.booking_resources from anon;
revoke all on table public.booking_services from anon;

-- booking_services: public SELECT exposed booking→service links
-- (enumeration leak); the guest flow uses RPCs instead.
drop policy if exists "Public can view booking services" on public.booking_services;

-- Staff (authenticated): grant exactly what their policies permit.
grant select, insert, update on table public.bookings to authenticated;
grant select, insert, update on table public.customers to authenticated;
grant select on table public.mpesa_payments to authenticated;
grant select on table public.sms_messages to authenticated;
grant select on table public.staff_profiles to authenticated;
grant select, insert, update, delete on table public.booking_resources to authenticated;
grant select, insert, update, delete on table public.booking_services to authenticated;

-- ------------------------------------------------------------
-- 42.3 Drop legacy provider_availability (duplicates
--      staff_schedules / schedule_blocks /
--      staff_schedule_exceptions; unused by the application)
-- ------------------------------------------------------------
drop function if exists public.is_provider_available(uuid, date, text, integer);
drop table if exists public.provider_availability;

-- ------------------------------------------------------------
-- 42.4 services.category_id — normalized source of truth
--      Backfill, FK, and sync trigger for the denormalized
--      `category` label (UI keeps reading `category`).
-- ------------------------------------------------------------
-- Backfill category_id from the legacy text slug where missing
update public.services s
set category_id = c.id
from public.service_categories c
where s.category_id is null and c.slug = s.category;

-- Backfill the label from the canonical category where they disagree
update public.services s
set category = c.slug
from public.service_categories c
where s.category_id = c.id and s.category is distinct from c.slug;

-- FK (added only if absent)
do $$ begin
  alter table public.services
    add constraint services_category_id_fkey
    foreign key (category_id) references public.service_categories(id) on delete set null;
exception when duplicate_object then null;
when duplicate_table then null;
end $$;

-- business_id FK (added only if absent)
do $$ begin
  alter table public.services
    add constraint services_business_id_fkey
    foreign key (business_id) references public.businesses(id) on delete cascade;
exception when duplicate_object then null;
when duplicate_table then null;
end $$;

-- Keep the denormalized `category` label in sync with the
-- canonical service_categories.slug (single source of truth).
create or replace function public.sync_service_category_label()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null then
    select c.slug into new.category
    from public.service_categories c
    where c.id = new.category_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_service_category_label on public.services;
create trigger trg_sync_service_category_label
  before insert or update of category_id on public.services
  for each row execute procedure public.sync_service_category_label();

-- ------------------------------------------------------------
-- 42.5 Document the intentional denormalization on bookings
-- ------------------------------------------------------------
comment on table public.bookings is
  'Bookings. Normalized relations: booking_services (services), booking_resources (providers), customers (client). The customer_name/service_names/price/time_slot columns are an intentional historical snapshot of the booking at creation time (prices and names change over time) and are kept in sync at write time by check_and_reserve.';
comment on column public.bookings.service_ids is
  'Historical snapshot; canonical relation is booking_services.';
comment on column public.bookings.service_names is
  'Historical snapshot of service names at booking time.';
comment on column public.bookings.provider_name is
  'Historical snapshot; canonical relation is booking_resources.';
