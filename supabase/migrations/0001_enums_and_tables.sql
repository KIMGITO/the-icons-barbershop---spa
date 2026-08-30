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
create index if not exists idx_providers_status on public.service_providers(status);