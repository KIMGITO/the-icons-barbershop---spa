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
notify pgrst, 'reload schema';