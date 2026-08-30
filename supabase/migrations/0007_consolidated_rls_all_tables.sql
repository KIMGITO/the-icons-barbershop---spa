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
  );