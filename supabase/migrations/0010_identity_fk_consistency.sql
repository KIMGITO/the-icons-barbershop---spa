-- ============================================================
-- FIX: IDENTITY & FK CONSISTENCY
-- 1. services.category_id uuid FK → service_categories(id)
--    (services.category remains as a denormalized display slug)
-- 2. booking_services junction table (proper many-to-many)
-- 3. Missing columns: customers.last_visit_date,
--    services.is_popular, services.recommended_for
-- ============================================================

-- ============================================================
-- 39. MISSING COLUMNS
-- ============================================================

-- customers.last_visit_date is referenced by create_booking()
alter table public.customers
  add column if not exists last_visit_date date;

-- services.is_popular / recommended_for are used by the frontend serviceService
alter table public.services
  add column if not exists is_popular boolean not null default false,
  add column if not exists recommended_for text;

-- ============================================================
-- 40. services.category_id — REAL FK (not slug-as-ID)
-- ============================================================

-- Add the proper UUID FK column. ON DELETE RESTRICT enforces the
-- business rule: a category with associated services cannot be deleted.
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id) on delete restrict;

-- Backfill category_id from the denormalized category slug
update public.services s
set category_id = sc.id
from public.service_categories sc
where s.category = sc.slug
  and s.category_id is null;

-- Index for FK lookups
create index if not exists idx_services_category_id on public.services(category_id);

-- ============================================================
-- 41. TRIGGER: keep services.category slug in sync with category_id
--     The slug remains a denormalized display/business value.
--     The UUID is the single source of truth for the relationship.
-- ============================================================
create or replace function public.sync_service_category_slug()
returns trigger as $$
declare
  v_slug text;
begin
  if new.category_id is not null then
    select slug into v_slug from public.service_categories where id = new.category_id;
    new.category := coalesce(v_slug, 'haircuts');
  else
    new.category := 'haircuts';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_service_category_slug on public.services;
create trigger sync_service_category_slug
  before insert or update of category_id on public.services
  for each row execute procedure public.sync_service_category_slug();

-- Keep display slug updated if a category slug is ever renamed
create or replace function public.sync_service_category_slug_rename()
returns trigger as $$
begin
  update public.services set category = new.slug
  where category_id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_service_category_slug_rename on public.service_categories;
create trigger sync_service_category_slug_rename
  after update of slug on public.service_categories
  for each row execute procedure public.sync_service_category_slug_rename();

-- ============================================================
-- 42. delete_service_category — use the real FK, drop slug lookup
--     The FK (ON DELETE RESTRICT) now enforces the business rule
--     at the database level.
-- ============================================================
create or replace function public.delete_service_category(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The services.category_id FK with ON DELETE RESTRICT raises an
  -- exception if any service still references this category.
  delete from public.service_categories where id = p_id;
  return found;
end;
$$;

-- ============================================================
-- 43. booking_services — proper many-to-many junction table
--     bookings.service_ids/service_names remain as denormalized
--     historical snapshots for display & data integrity.
-- ============================================================
create table if not exists public.booking_services (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  primary key (booking_id, service_id)
);

-- Backfill from existing booking.service_ids arrays
insert into public.booking_services (booking_id, service_id)
select b.id, unnest(b.service_ids)
from public.bookings b
where b.service_ids is not null
  and array_length(b.service_ids, 1) > 0
on conflict do nothing;

create index if not exists idx_booking_services_service on public.booking_services(service_id);

-- RLS
alter table public.booking_services enable row level security;

drop policy if exists "Public can view booking services" on public.booking_services;
create policy "Public can view booking services" on public.booking_services
  for select using (true);

drop policy if exists "Staff can view booking services" on public.booking_services;
create policy "Staff can view booking services" on public.booking_services
  for select using (public.is_staff());

drop policy if exists "Admin can manage booking services" on public.booking_services;
create policy "Admin can manage booking services" on public.booking_services
  for all using (public.is_admin());

-- ============================================================
-- 44. create_booking — also record canonical junction rows
-- ============================================================
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids uuid[],
  p_provider_id uuid,
  p_date date,
  p_time_slot text,
  p_special_requests text default null,
  p_deposit_paid_ksh numeric default 0,
  p_payment_method text default 'unpaid'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals jsonb;
  v_booking public.bookings;
  v_reference text;
  v_customer_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_duration int;
  v_price numeric(10,2);
  v_remaining numeric(10,2);
  v_end_time text;
  v_service_id uuid;
begin
  -- Calculate totals
  v_totals := public.calculate_booking_totals(p_service_ids, p_provider_id);
  v_duration := (v_totals->>'total_duration_minutes')::int;
  v_price := (v_totals->>'total_price_ksh')::numeric;

  -- Generate end time
  v_end_time := to_char(to_timestamp(p_time_slot, 'HH12:MI AM') + (v_duration || ' minutes')::interval, 'HH24:MI');

  -- Generate reference
  v_reference := 'ICN-' || floor(1000 + random() * 9000)::text;

  -- Find or create customer
  select id into v_customer_id from public.customers
  where phone = p_customer_phone and business_id = v_business_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, business_id, total_visits)
    values (p_customer_name, p_customer_phone, p_customer_email, v_business_id, 1)
    returning id into v_customer_id;
  else
    update public.customers set
      total_visits = total_visits + 1,
      last_visit_date = p_date,
      updated_at = now()
    where id = v_customer_id;
  end if;

  -- Calculate remaining balance
  v_remaining := greatest(0, v_price - coalesce(p_deposit_paid_ksh, 0));

  -- Insert booking
  insert into public.bookings (
    reference_number, customer_id, customer_name, customer_phone, customer_email,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, end_time, duration_minutes,
    total_price_ksh, deposit_paid_ksh, remaining_balance_ksh,
    status, payment_status, payment_method,
    special_requests, business_id
  )
  values (
    v_reference, v_customer_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_ids, (v_totals->>'service_names')::text[], p_provider_id,
    coalesce((select full_name from public.service_providers where id = p_provider_id), ''),
    p_date, p_time_slot, v_end_time, v_duration,
    v_price, coalesce(p_deposit_paid_ksh, 0), v_remaining,
    'confirmed',
    case when v_remaining = 0 then 'paid'
         when coalesce(p_deposit_paid_ksh, 0) > 0 then 'deposit-paid'
         else 'unpaid' end,
    p_payment_method,
    p_special_requests, v_business_id
  )
  returning * into v_booking;

  -- Record canonical many-to-many junction rows (snapshot columns remain)
  if v_booking.id is not null and p_service_ids is not null then
    foreach v_service_id in array p_service_ids loop
      insert into public.booking_services (booking_id, service_id)
      values (v_booking.id, v_service_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_booking;
end;
$$;

-- ============================================================
-- 45. REALTIME
-- ============================================================
alter publication supabase_realtime add table public.booking_services;