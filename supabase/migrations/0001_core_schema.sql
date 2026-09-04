-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. ENUMS
do $$ begin create type staff_role as enum ('admin', 'provider'); exception when duplicate_object then null; end $$;
do $$ begin create type provider_type as enum ('barber', 'facial-specialist', 'spa-therapist', 'scalp-care', 'other'); exception when duplicate_object then null; end $$;
do $$ begin create type provider_status as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no-show'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('paid', 'deposit-paid', 'unpaid', 'refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type service_status as enum ('active', 'inactive', 'archived'); exception when duplicate_object then null; end $$;

-- 3. BUSINESSES
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'The Icons Barber & Spa',
  description text, phone text, email text, address text, neighborhood text,
  city text default 'Nairobi', country text default 'Kenya',
  opening_hours jsonb default '{}'::jsonb, social_links jsonb default '{}'::jsonb,
  logo_url text, cover_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 4. SERVICE PROVIDERS
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, first_name text not null, last_name text not null, full_name text not null,
  email text, phone text, provider_type provider_type not null default 'barber', bio text,
  avatar_url text, cover_url text, status provider_status not null default 'active',
  services_offered_ids uuid[] default '{}', schedule jsonb default '[]'::jsonb,
  years_experience int, rating numeric(3,2), instagram_handle text,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_providers_business on public.service_providers(business_id);
create index if not exists idx_providers_type on public.service_providers(provider_type);
create index if not exists idx_providers_status on public.service_providers(status);-- 5. SERVICES
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null,
  category text not null default 'haircuts',
  description text, short_description text, full_description text,
  price_ksh numeric(10,2) not null default 0,
  duration_minutes int not null default 30,
  buffer_minutes int not null default 0,
  features jsonb default '[]'::jsonb, image_url text,
  status service_status not null default 'active',
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_services_business on public.services(business_id);
create index if not exists idx_services_status on public.services(status);

-- Provider-Service join
create table if not exists public.provider_services (
  provider_id uuid references public.service_providers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  primary key (provider_id, service_id)
);

-- 6. CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text, phone text, avatar_url text,
  preferred_provider_id uuid references public.service_providers(id) on delete set null,
  notes text, tags text[] default '{}', vip_status boolean not null default false,
  total_visits int not null default 0, total_spend_ksh numeric(10,2) not null default 0,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_customers_business on public.customers(business_id);
create index if not exists idx_customers_phone on public.customers(phone);

-- 7. BOOKINGS
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null, customer_phone text, customer_email text,
  service_ids uuid[] default '{}', service_names text[] default '{}',
  provider_id uuid references public.service_providers(id) on delete restrict,
  provider_name text not null,
  date date not null, time_slot text not null, end_time text,
  duration_minutes int not null default 30,
  total_price_ksh numeric(10,2) not null default 0,
  deposit_paid_ksh numeric(10,2) not null default 0,
  remaining_balance_ksh numeric(10,2) not null default 0,
  status booking_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method text default 'unpaid', mpesa_receipt_number text,
  special_requests text, staff_notes text,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_bookings_date on public.bookings(date);
create index if not exists idx_bookings_provider on public.bookings(provider_id);
create index if not exists idx_bookings_business on public.bookings(business_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_provider_date on public.bookings(provider_id, date);

-- 8. STAFF PROFILES
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null, full_name text not null,
  role staff_role not null default 'provider',
  provider_id uuid references public.service_providers(id) on delete set null,
  phone text, avatar_url text,
  must_change_password boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_staff_profiles_role on public.staff_profiles(role);
create index if not exists idx_staff_profiles_business on public.staff_profiles(business_id);-- ============================================================
-- 9. DEFAULT BUSINESS SEED
-- ============================================================
insert into public.businesses (id, name, description, city, country)
values ('00000000-0000-0000-0000-000000000001', 'The Icons Barber & Spa', 'Premium barber and spa sanctuary in Kilimani, Nairobi.', 'Nairobi', 'Kenya')
on conflict (id) do nothing;

-- ============================================================
-- 10. DEFAULT ADMIN ACCOUNT (auto-created)
--     Email: admin@theicons.co.ke  |  Password: Admin@123
--     must_change_password = true → UI forces update on first login
-- ============================================================
do $$
declare
  admin_user_id uuid;
  admin_provider_id uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.service_providers (
    id, slug, first_name, last_name, full_name, email, phone,
    provider_type, bio, avatar_url, status, years_experience, rating, business_id
  )
  values (
    '00000000-0000-0000-0000-00000000000a', 'dennis-kimanthi',
    'Dennis', 'Kimanthi', 'Dennis Kimanthi', 'admin@theicons.co.ke', '+254 743 952 173',
    'barber', 'Founder, Executive Director & Master Stylist.', 
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    'active', 14, 5.00, default_business_id
  )
  on conflict (id) do nothing
  returning id into admin_provider_id;

  -- Explicitly populate GoTrue's NOT-NULL token columns (defaults may be
  -- NULL on some schemas, which makes GoTrue's login query error with 500).
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  )
  values (
    '00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-000000000000',
    'admin@theicons.co.ke', extensions.crypt('Admin@123', extensions.gen_salt('bf', 10)), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dennis Kimanthi","role":"admin","provider_id":"00000000-0000-0000-0000-00000000000a"}',
    now(), now(), 'authenticated', 'authenticated'
  )
  on conflict (id) do nothing
  returning id into admin_user_id;

  if admin_user_id is null then
    select id into admin_user_id from auth.users where email = 'admin@theicons.co.ke' limit 1;
  end if;

  insert into public.staff_profiles (id, email, full_name, role, provider_id, must_change_password, business_id)
  values (
    admin_user_id, 'admin@theicons.co.ke', 'Dennis Kimanthi', 'admin', admin_provider_id, true, default_business_id
  )
  on conflict (id) do nothing;
end $$;

-- ============================================================
-- 11. updated_at TRIGGERS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$ begin create trigger set_updated_at before update on public.businesses for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.service_providers for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.services for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.customers for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.bookings for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 12. TRIGGER: auto-create staff_profiles on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
  values (new.id, coalesce(new.email, ''), coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), user_role, user_provider_id, default_business_id, true)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.businesses enable row level security;
alter table public.service_providers enable row level security;
alter table public.services enable row level security;
alter table public.provider_services enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_profiles enable row level security;

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer;

create or replace function public.is_staff() returns boolean as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid());
$$ language sql stable security definer;

create or replace function public.get_my_provider_id() returns uuid as $$
  select provider_id from public.staff_profiles where id = auth.uid();
$$ language sql stable security definer;-- 14. RLS POLICIES
create policy "Staff can view business" on public.businesses for select using (public.is_staff());
create policy "Admin can manage business" on public.businesses for all using (public.is_admin());

create policy "Staff can view service providers" on public.service_providers for select using (public.is_staff());
create policy "Admin can manage service providers" on public.service_providers for all using (public.is_admin());

create policy "Staff can view services" on public.services for select using (public.is_staff());
create policy "Admin can manage services" on public.services for all using (public.is_admin());

create policy "Staff can view provider_services" on public.provider_services for select using (public.is_staff());
create policy "Admin can manage provider_services" on public.provider_services for all using (public.is_admin());

create policy "Staff can view customers" on public.customers for select using (public.is_staff());
create policy "Staff can create customers" on public.customers for insert with check (public.is_staff());
create policy "Staff can update customers" on public.customers for update using (public.is_staff());

create policy "Staff can view bookings" on public.bookings for select using (
  public.is_admin() or provider_id = public.get_my_provider_id()
);
create policy "Staff can create bookings" on public.bookings for insert with check (
  public.is_admin() or provider_id = public.get_my_provider_id()
);
create policy "Admin can update bookings" on public.bookings for update using (public.is_admin());
create policy "Provider can update own bookings" on public.bookings for update using (
  provider_id = public.get_my_provider_id() and status in ('pending', 'confirmed')
);

create policy "Staff can view staff profiles" on public.staff_profiles for select using (public.is_staff());
create policy "Admin can manage staff profiles" on public.staff_profiles for all using (public.is_admin());
create policy "Users can update own profile" on public.staff_profiles for update using (auth.uid() = id);

-- 15. CONFLICT DETECTION TRIGGER
create or replace function public.prevent_provider_overlap()
returns trigger as $$
declare
  existing_start timestamptz; existing_end timestamptz;
  new_start timestamptz; new_end timestamptz;
begin
  if new.status = 'cancelled' or new.status = 'no-show' then return new; end if;
  new_start := (new.date::text || ' ' || new.time_slot)::timestamptz;
  new_end := new_start + (new.duration_minutes || ' minutes')::interval;
  select (b.date::text || ' ' || b.time_slot)::timestamptz,
         (b.date::text || ' ' || b.time_slot)::timestamptz + (b.duration_minutes || ' minutes')::interval
  into existing_start, existing_end
  from public.bookings b
  where b.provider_id = new.provider_id and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000')
    and b.status in ('pending', 'confirmed') and b.date = new.date
  limit 1;
  if existing_start is not null and new_start < existing_end and new_end > existing_start then
    raise exception 'Provider unavailable at this time. Existing booking overlaps.';
  end if;
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger prevent_double_booking before insert or update on public.bookings
    for each row execute procedure public.prevent_provider_overlap();
exception when duplicate_object then null;
end $$;

-- 16. STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('services', 'services', true), ('business', 'business', true)
on conflict (id) do nothing;

create policy "Staff can read images" on storage.objects for select using (bucket_id in ('avatars', 'services', 'business'));
create policy "Staff can upload images" on storage.objects for insert with check (
  bucket_id in ('avatars', 'services', 'business') and public.is_staff()
);
create policy "Admin can delete images" on storage.objects for delete using (public.is_admin());

-- 17. REALTIME
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.service_providers;
alter publication supabase_realtime add table public.services;
alter publication supabase_realtime add table public.customers;-- ============================================================
-- 18. SERVICE CATEGORIES
-- ============================================================
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_service_categories_business on public.service_categories(business_id);
create index if not exists idx_service_categories_active on public.service_categories(is_active);

do $$ begin create trigger set_updated_at before update on public.service_categories for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 19. PRODUCTS & PRODUCT REVIEWS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'scalp-care',
  short_description text,
  detailed_description text,
  price_ksh numeric(10,2) not null default 0,
  original_price_ksh numeric(10,2),
  availability text not null default 'in-stock',
  image_url text,
  secondary_images text[] default '{}',
  badge text,
  rating numeric(3,2) not null default 5.0,
  review_count int not null default 0,
  specifications jsonb default '{}'::jsonb,
  how_to_use text[] default '{}',
  suitable_for text,
  related_service_slugs text[] default '{}',
  related_product_slugs text[] default '{}',
  stock_quantity int not null default 10,
  low_stock_threshold int not null default 5,
  sku text,
  is_featured boolean not null default false,
  status text not null default 'active',
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_business on public.products(business_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_status on public.products(status);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  date date not null default current_date,
  verified_purchase boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_reviews_product on public.product_reviews(product_id);

do $$ begin create trigger set_updated_at before update on public.products for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 20. GALLERY ITEMS
-- ============================================================
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt text,
  category text not null default 'haircut',
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gallery_business on public.gallery_items(business_id);
create index if not exists idx_gallery_active on public.gallery_items(is_active);

do $$ begin create trigger set_updated_at before update on public.gallery_items for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 21. FAQS
-- ============================================================
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'Appointments',
  sort_order int not null default 0,
  is_featured_on_home boolean not null default false,
  internal_link_label text,
  internal_link_url text,
  is_active boolean not null default true,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_faqs_business on public.faqs(business_id);
create index if not exists idx_faqs_active on public.faqs(is_active);

do $$ begin create trigger set_updated_at before update on public.faqs for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 22. SCHEDULE BLOCKS (breaks / days off / holidays)
-- ============================================================
create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.service_providers(id) on delete cascade,
  date date not null,
  start_time text not null,
  end_time text not null,
  reason text not null default 'break',
  notes text,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_schedule_blocks_provider_date on public.schedule_blocks(provider_id, date);
create index if not exists idx_schedule_blocks_business on public.schedule_blocks(business_id);

-- ============================================================
-- 23. M-PESA PAYMENTS LOG
-- ============================================================
create table if not exists public.mpesa_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  phone_number text not null,
  amount_ksh numeric(10,2) not null,
  checkout_request_id text,
  merchant_request_id text,
  receipt_number text,
  transaction_date text,
  result_code int,
  result_desc text,
  status text not null default 'pending',
  raw_callback jsonb default '{}'::jsonb,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_mpesa_payments_booking on public.mpesa_payments(booking_id);
create index if not exists idx_mpesa_payments_checkout on public.mpesa_payments(checkout_request_id);
create index if not exists idx_mpesa_payments_status on public.mpesa_payments(status);

do $$ begin create trigger set_updated_at before update on public.mpesa_payments for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 24. PROVIDER AVAILABILITY OVERRIDES
-- ============================================================
create table if not exists public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.service_providers(id) on delete cascade,
  date date not null,
  is_available boolean not null default true,
  start_time text,
  end_time text,
  reason text,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, date)
);
create index if not exists idx_provider_avail_business on public.provider_availability(business_id);

do $$ begin create trigger set_updated_at before update on public.provider_availability for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;