-- ============================================================
-- 68. PRODUCTS ADMIN MANAGEMENT + REVIEW APPROVAL WORKFLOW
-- ============================================================

-- Add review moderation status to product reviews.
-- 'pending' = submitted by customer, awaiting admin approval.
-- 'approved' = visible on the public product detail page.
-- 'rejected' / 'archived' = hidden from public.
alter table public.product_reviews
  add column if not exists review_status text not null default 'approved'
  check (review_status in ('pending', 'approved', 'rejected', 'archived'));

create index if not exists idx_product_reviews_status on public.product_reviews(review_status);


-- Public select policy for product_reviews must only expose approved reviews.
drop policy if exists "Public can view product reviews" on public.product_reviews;
create policy "Public can view product reviews" on public.product_reviews
  for select using (
    review_status = 'approved' and exists (
      select 1 from public.products p
      where p.id = product_reviews.product_id and p.status = 'active'
    )
  );

-- Staff can view all reviews (including pending).
drop policy if exists "Staff can view product reviews" on public.product_reviews;
create policy "Staff can view product reviews" on public.product_reviews
  for select using (public.is_staff());

-- Admin can manage all reviews (approve / reject / archive).
drop policy if exists "Admin can manage product reviews" on public.product_reviews;
create policy "Admin can manage product reviews" on public.product_reviews
  for all using (public.is_admin());

-- Add 'products' storage bucket for product imagery (RLS inherited via staff policies).
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Allow public read + staff write on the products bucket (consistent with other buckets).
drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "Staff can upload product images" on storage.objects;
create policy "Staff can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'products' and public.is_staff()
  );

drop policy if exists "Admin can delete product images" on storage.objects;
create policy "Admin can delete product images" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

-- ============================================================
-- DATABASE FUNCTIONS for product admin CRUD + review management
-- (security definer, admin-only, service-role equivalent)
-- ============================================================

-- List all products (admin — includes drafts & archived)
create or replace function public.admin_list_products()
returns setof public.products
language sql
security definer
set search_path = public
as $$
  select * from public.products
  order by created_at desc;
$$;

-- Create a product (admin only)
create or replace function public.admin_create_product(
  p_slug text,
  p_name text,
  p_category text,
  p_short_description text default '',
  p_detailed_description text default '',
  p_price_ksh numeric default 0,
  p_original_price_ksh numeric default null,
  p_availability text default 'in-stock',
  p_image_url text default '',
  p_secondary_images text[] default '{}',
  p_badge text default null,
  p_rating numeric default 5.0,
  p_specifications jsonb default '{}'::jsonb,
  p_how_to_use text[] default '{}',
  p_suitable_for text default '',
  p_related_service_slugs text[] default '{}',
  p_related_product_slugs text[] default '{}',
  p_stock_quantity int default 10,
  p_low_stock_threshold int default 5,
  p_sku text default null,
  p_is_featured boolean default false,
  p_status text default 'active'
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  insert into public.products (
    slug, name, category, short_description, detailed_description,
    price_ksh, original_price_ksh, availability, image_url, secondary_images,
    badge, rating, review_count, specifications, how_to_use, suitable_for,
    related_service_slugs, related_product_slugs, stock_quantity, low_stock_threshold,
    sku, is_featured, status, business_id
  )
  values (
    p_slug, p_name, p_category, p_short_description, p_detailed_description,
    p_price_ksh, p_original_price_ksh, p_availability, p_image_url, p_secondary_images,
    p_badge, p_rating, 0, p_specifications, p_how_to_use, p_suitable_for,
    p_related_service_slugs, p_related_product_slugs, p_stock_quantity, p_low_stock_threshold,
    p_sku, p_is_featured, p_status, v_business_id
  )
  returning * into v_product;

  return v_product;
end;
$$;

-- Update a product (admin only)
create or replace function public.admin_update_product(
  p_id uuid,
  p_updates jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  update public.products set
    slug = coalesce(p_updates->>'slug', slug),
    name = coalesce(p_updates->>'name', name),
    category = coalesce(p_updates->>'category', category),
    short_description = coalesce(p_updates->>'short_description', short_description),
    detailed_description = coalesce(p_updates->>'detailed_description', detailed_description),
    price_ksh = coalesce((p_updates->>'price_ksh')::numeric, price_ksh),
    original_price_ksh = case when p_updates ? 'original_price_ksh' then (p_updates->>'original_price_ksh')::numeric else original_price_ksh end,
    availability = coalesce(p_updates->>'availability', availability),
    image_url = coalesce(p_updates->>'image_url', image_url),
    secondary_images = case
      when p_updates ? 'secondary_images' then
        coalesce(array(select jsonb_array_elements_text(p_updates->'secondary_images')), '{}'::text[])
      else secondary_images
    end,
    badge = coalesce(p_updates->>'badge', badge),
    rating = coalesce((p_updates->>'rating')::numeric, rating),
    specifications = coalesce(p_updates->'specifications', specifications),
    how_to_use = case
      when p_updates ? 'how_to_use' then
        coalesce(array(select jsonb_array_elements_text(p_updates->'how_to_use')), '{}'::text[])
      else how_to_use
    end,
    suitable_for = coalesce(p_updates->>'suitable_for', suitable_for),
    related_service_slugs = case
      when p_updates ? 'related_service_slugs' then
        coalesce(array(select jsonb_array_elements_text(p_updates->'related_service_slugs')), '{}'::text[])
      else related_service_slugs
    end,
    related_product_slugs = case
      when p_updates ? 'related_product_slugs' then
        coalesce(array(select jsonb_array_elements_text(p_updates->'related_product_slugs')), '{}'::text[])
      else related_product_slugs
    end,
    stock_quantity = coalesce((p_updates->>'stock_quantity')::int, stock_quantity),
    low_stock_threshold = coalesce((p_updates->>'low_stock_threshold')::int, low_stock_threshold),
    sku = case when p_updates ? 'sku' then p_updates->>'sku' else sku end,
    is_featured = coalesce((p_updates->>'is_featured')::boolean, is_featured),
    status = coalesce(p_updates->>'status', status),
    updated_at = now()
  where id = p_id
  returning * into v_product;

  if not found then
    raise exception 'Product not found: %', p_id;
  end if;

  return v_product;
end;
$$;

-- Delete a product (admin only — cascades reviews)
create or replace function public.admin_delete_product(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  delete from public.products where id = p_id;
  return found;
end;
$$;

-- Toggle product status (active / draft / archived) — admin only
create or replace function public.admin_set_product_status(p_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  update public.products set status = p_status, updated_at = now() where id = p_id;
  return found;
end;
$$;

-- List all reviews (admin — including pending / rejected)
create or replace function public.admin_list_reviews()
returns setof public.product_reviews
language sql
security definer
set search_path = public
as $$
  select * from public.product_reviews
  order by date desc, created_at desc;
$$;

-- Update review moderation status (approve / reject / archive) — admin only
create or replace function public.admin_set_review_status(
  p_review_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.product_reviews;
  v_approved_count int;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  update public.product_reviews
  set review_status = p_status
  where id = p_review_id
  returning * into v_review;

  if not found then
    raise exception 'Review not found: %', p_review_id;
  end if;

  -- Keep product aggregate rating & review count in sync when status changes.
  if v_review.product_id is not null then
    select count(*) into v_approved_count
    from public.product_reviews
    where product_id = v_review.product_id and review_status = 'approved';

    update public.products
    set review_count = v_approved_count,
        rating = coalesce((
          select round(avg(rating)::numeric, 2)
          from public.product_reviews
          where product_id = v_review.product_id and review_status = 'approved'
        ), 5.0),
        updated_at = now()
    where id = v_review.product_id;
  end if;

  return true;
end;
$$;

-- Delete a review permanently (admin only)
create or replace function public.admin_delete_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.product_reviews;
  v_approved_count int;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  select * into v_review from public.product_reviews where id = p_review_id;
  if not found then
    raise exception 'Review not found: %', p_review_id;
  end if;

  delete from public.product_reviews where id = p_review_id;

  if v_review.product_id is not null then
    select count(*) into v_approved_count
    from public.product_reviews
    where product_id = v_review.product_id and review_status = 'approved';

    update public.products
    set review_count = v_approved_count,
        rating = coalesce((
          select round(avg(rating)::numeric, 2)
          from public.product_reviews
          where product_id = v_review.product_id and review_status = 'approved'
        ), 5.0),
        updated_at = now()
    where id = v_review.product_id;
  end if;

  return true;
end;
$$;

-- Grant execute to authenticated staff so the portal can call these
grant execute on function public.admin_list_products() to authenticated;
grant execute on function public.admin_create_product(text,text,text,text,text,numeric,numeric,text,text,text[],text,numeric,jsonb,text[],text,text[],text[],int,int,text,boolean,text) to authenticated;
grant execute on function public.admin_update_product(uuid,jsonb) to authenticated;
grant execute on function public.admin_delete_product(uuid) to authenticated;
grant execute on function public.admin_set_product_status(uuid,text) to authenticated;
grant execute on function public.admin_list_reviews() to authenticated;
grant execute on function public.admin_set_review_status(uuid,text) to authenticated;
grant execute on function public.admin_delete_review(uuid) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPC functions
-- are immediately visible to the client (fixes "function not found in schema cache").
notify pgrst, 'reload schema';
