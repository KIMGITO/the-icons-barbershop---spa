-- ============================================================
-- 47. PRODUCT CATEGORIES
-- ============================================================
create table if not exists public.product_categories (
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

create index if not exists idx_product_categories_business on public.product_categories(business_id);
create index if not exists idx_product_categories_active on public.product_categories(is_active);

-- Enable RLS
alter table public.product_categories enable row level security;

-- Policies
create policy "Allow public read access to active product categories"
on public.product_categories for select
using (is_active = true);

create policy "Allow all access to admins"
on public.product_categories for all
using (public.is_admin());

-- Realtime
alter publication supabase_realtime add table public.product_categories;

-- Trigger for updated_at
do $$ begin
  create trigger set_updated_at
  before update on public.product_categories
  for each row execute procedure public.handle_updated_at();
exception
  when duplicate_object then null;
end $$;

-- Seed some default categories
insert into public.product_categories (slug, name, sort_order)
values
  ('scalp-care', 'Scalp Care', 1),
  ('beard-grooming', 'Beard Grooming', 2),
  ('styling', 'Styling & Finishing', 3),
  ('skincare', 'Skincare', 4)
on conflict (slug) do nothing;