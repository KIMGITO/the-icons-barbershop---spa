-- ============================================================
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