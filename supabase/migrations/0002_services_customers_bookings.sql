-- 5. SERVICES
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
create index if not exists idx_staff_profiles_business on public.staff_profiles(business_id);