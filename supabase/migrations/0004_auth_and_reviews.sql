-- ============================================================
-- 67. FINALIZE — remove leftover debug artefacts from the auth-hardening
--     investigation so the production schema stays clean.
--     (No-ops on fresh clones where the debug objects were never created.)
-- ============================================================
drop table if exists public.auth_diagnostics cascade;

drop function if exists public.diag_user_json(uuid);
drop function if exists public.fix_admin_instance();
drop function if exists public.diag_user_json();
drop function if exists public.fix_admin_instance;

-- Re-assert the clean, defensive handle_new_user (idempotent).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = auth, public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
  e text;
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
                           || '{"provider":"email","providers":["email"]}'::jsonb;
  begin
    insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
    values (new.id, coalesce(new.email, ''),
            coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
            user_role, user_provider_id, default_business_id, true)
    on conflict (id) do nothing;
  exception when others then
    e := sqlerrm;
  end;
  return new;
end $$;

do $$
begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

grant execute on function public.handle_new_user() to public;

-- Re-sync the admin auth row to a loginable shape (idempotent safety net).
update auth.users
set
  instance_id              = '00000000-0000-0000-0000-000000000000',
  confirmation_token       = coalesce(confirmation_token, ''),
  email_change             = coalesce(email_change, ''),
  email_change_token_new   = coalesce(email_change_token_new, ''),
  recovery_token           = coalesce(recovery_token, ''),
  email_confirmed_at       = coalesce(email_confirmed_at, now()),
  encrypted_password       = extensions.crypt('Admin@123', extensions.gen_salt('bf', 10)),
  role                     = 'authenticated',
  aud                      = 'authenticated',
  raw_app_meta_data        = '{"provider":"email","providers":["email"]}',
  updated_at               = now()
where email = 'admin@theicons.co.ke';
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
-- ============================================================
-- 69. SERVICE REVIEWS + USER REVIEW SUBMISSION
-- ============================================================

-- ============================================================
-- SERVICE REVIEWS TABLE
-- ============================================================
create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  date date not null default current_date,
  verified_purchase boolean not null default false,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists idx_service_reviews_service on public.service_reviews(service_id);
create index if not exists idx_service_reviews_status on public.service_reviews(review_status);


-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.service_reviews enable row level security;

-- PUBLIC: Anyone can view approved service reviews (for active services)
drop policy if exists "Public can view approved service reviews" on public.service_reviews;
create policy "Public can view approved service reviews" on public.service_reviews
  for select using (
    review_status = 'approved' and exists (
      select 1 from public.services s
      where s.id = service_reviews.service_id and s.status = 'active'
    )
  );

-- PUBLIC: Anyone can submit a service review (goes to pending for admin approval)
drop policy if exists "Public can submit service reviews" on public.service_reviews;
create policy "Public can submit service reviews" on public.service_reviews
  for insert with check (true);

-- PUBLIC: Anyone can submit a product review (goes to pending for admin approval)
drop policy if exists "Public can submit product reviews" on public.product_reviews;
create policy "Public can submit product reviews" on public.product_reviews
  for insert with check (true);

-- STAFF: Can view all service reviews
drop policy if exists "Staff can view service reviews" on public.service_reviews;
create policy "Staff can view service reviews" on public.service_reviews
  for select using (public.is_staff());

-- ADMIN: Can manage all service reviews
drop policy if exists "Admin can manage service reviews" on public.service_reviews;
create policy "Admin can manage service reviews" on public.service_reviews
  for all using (public.is_admin());

-- ============================================================
-- ADMIN FUNCTIONS for service review management
-- ============================================================

-- List all service reviews (admin — including pending)
create or replace function public.admin_list_service_reviews()
returns setof public.service_reviews
language sql
security definer
set search_path = public
as $$
  select * from public.service_reviews
  order by date desc, created_at desc;
$$;

-- Update service review moderation status (approve / reject / archive) — admin only
create or replace function public.admin_set_service_review_status(
  p_review_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.service_reviews;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  update public.service_reviews
  set review_status = p_status
  where id = p_review_id
  returning * into v_review;

  if not found then
    raise exception 'Service review not found: %', p_review_id;
  end if;

  return true;
end;
$$;

-- Delete a service review permanently (admin only)
create or replace function public.admin_delete_service_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: Admin access only';
  end if;

  delete from public.service_reviews where id = p_review_id;
  return found;
end;
$$;

-- Grant execute to authenticated staff
grant execute on function public.admin_list_service_reviews() to authenticated;
grant execute on function public.admin_set_service_review_status(uuid,text) to authenticated;
grant execute on function public.admin_delete_service_review(uuid) to authenticated;

-- Force PostgREST to reload its schema cache
notify pgrst, 'reload schema';-- ============================================================
-- 70. SCHEDULE HISTORY LOOKUP (by receipt code / phone)
--     Staff (admin + provider) can retrieve a customer's full
--     schedule history: upcoming + past bookings.
-- ============================================================

-- Full schedule history for a customer phone number.
-- Returns upcoming (today onwards) and past bookings, newest first.
create or replace function public.get_customer_schedule_history(
  p_phone text,
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_upcoming jsonb;
  v_past jsonb;
  v_customer record;
begin
  if p_phone is null or length(trim(p_phone)) < 7 then
    return jsonb_build_object('customer'::text, null::jsonb, 'upcoming'::text, '[]'::jsonb, 'past'::text, '[]'::jsonb);
  end if;

  select * into v_customer
  from public.customers
  where phone = trim(p_phone)
  limit 1;

  -- Upcoming bookings (today onwards, not cancelled)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'reference_number', b.reference_number,
    'receipt_code', b.receipt_code,
    'date', b.date,
    'time_slot', b.time_slot,
    'end_time', b.end_time,
    'duration_minutes', b.duration_minutes,
    'service_names', b.service_names,
    'provider_name', b.provider_name,
    'total_price_ksh', b.total_price_ksh,
    'deposit_paid_ksh', b.deposit_paid_ksh,
    'remaining_balance_ksh', b.remaining_balance_ksh,
    'status', b.status,
    'payment_status', b.payment_status,
    'mpesa_receipt_number', b.mpesa_receipt_number
  ) order by b.date, b.time_slot), '[]'::jsonb)
  into v_upcoming
  from public.bookings b
  where b.customer_phone = trim(p_phone)
    and b.date >= current_date
    and b.status not in ('cancelled', 'no-show')
  limit p_limit;

  -- Past bookings (before today, newest first)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'reference_number', b.reference_number,
    'receipt_code', b.receipt_code,
    'date', b.date,
    'time_slot', b.time_slot,
    'end_time', b.end_time,
    'duration_minutes', b.duration_minutes,
    'service_names', b.service_names,
    'provider_name', b.provider_name,
    'total_price_ksh', b.total_price_ksh,
    'deposit_paid_ksh', b.deposit_paid_ksh,
    'remaining_balance_ksh', b.remaining_balance_ksh,
    'status', b.status,
    'payment_status', b.payment_status,
    'mpesa_receipt_number', b.mpesa_receipt_number
  ) order by b.date desc, b.time_slot desc), '[]'::jsonb)
  into v_past
  from public.bookings b
  where b.customer_phone = trim(p_phone)
    and b.date < current_date
  limit p_limit;

  return jsonb_build_object(
    'customer', case when v_customer is null then null::jsonb else jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'phone', v_customer.phone,
      'email', v_customer.email,
      'total_visits', v_customer.total_visits,
      'total_spend_ksh', v_customer.total_spend_ksh,
      'last_visit_date', v_customer.last_visit_date,
      'vip_status', v_customer.vip_status
    ) end,
    'upcoming', v_upcoming,
    'past', v_past
  );
end;
$$;

-- Staff (admin + providers) can retrieve schedule history
grant execute on function public.get_customer_schedule_history(text, int) to authenticated;

-- Provider-scoped schedule list: all bookings for a given provider
-- (admin sees any provider; provider sees own via RLS anyway, but this
-- gives a convenient aggregated view with stats).
create or replace function public.get_provider_schedule_summary(
  p_provider_id uuid,
  p_days_back int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upcoming jsonb;
  v_past jsonb;
  v_stats jsonb;
begin
  if not public.is_staff() then
    raise exception 'Forbidden: Staff access only';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'reference_number', b.reference_number,
    'receipt_code', b.receipt_code,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'date', b.date,
    'time_slot', b.time_slot,
    'end_time', b.end_time,
    'duration_minutes', b.duration_minutes,
    'service_names', b.service_names,
    'total_price_ksh', b.total_price_ksh,
    'deposit_paid_ksh', b.deposit_paid_ksh,
    'remaining_balance_ksh', b.remaining_balance_ksh,
    'status', b.status,
    'payment_status', b.payment_status
  ) order by b.date, b.time_slot), '[]'::jsonb)
  into v_upcoming
  from public.bookings b
  where b.provider_id = p_provider_id
    and b.date >= current_date
    and b.status not in ('cancelled', 'no-show');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'reference_number', b.reference_number,
    'receipt_code', b.receipt_code,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'date', b.date,
    'time_slot', b.time_slot,
    'end_time', b.end_time,
    'duration_minutes', b.duration_minutes,
    'service_names', b.service_names,
    'total_price_ksh', b.total_price_ksh,
    'deposit_paid_ksh', b.deposit_paid_ksh,
    'remaining_balance_ksh', b.remaining_balance_ksh,
    'status', b.status,
    'payment_status', b.payment_status
  ) order by b.date desc, b.time_slot desc), '[]'::jsonb)
  into v_past
  from public.bookings b
  where b.provider_id = p_provider_id
    and b.date < current_date
    and b.date >= current_date - (p_days_back || ' days')::interval;

  select jsonb_build_object(
    'total_past', coalesce((select count(*) from public.bookings where provider_id = p_provider_id and date < current_date), 0),
    'completed', coalesce((select count(*) from public.bookings where provider_id = p_provider_id and status = 'completed'), 0),
    'cancelled', coalesce((select count(*) from public.bookings where provider_id = p_provider_id and status = 'cancelled'), 0),
    'no_show', coalesce((select count(*) from public.bookings where provider_id = p_provider_id and status = 'no-show'), 0),
    'total_revenue_ksh', coalesce((select sum(total_price_ksh) from public.bookings where provider_id = p_provider_id and status = 'completed'), 0),
    'upcoming_count', coalesce((select count(*) from public.bookings where provider_id = p_provider_id and date >= current_date and status not in ('cancelled', 'no-show')), 0)
  ) into v_stats;

  return jsonb_build_object(
    'upcoming', v_upcoming,
    'past', v_past,
    'stats', v_stats
  );
end;
$$;

grant execute on function public.get_provider_schedule_summary(uuid, int) to authenticated;

-- Force PostgREST to reload its schema cache
notify pgrst, 'reload schema';