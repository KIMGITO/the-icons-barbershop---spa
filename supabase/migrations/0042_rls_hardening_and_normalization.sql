-- ============================================================
-- 42. DATABASE NORMALIZATION + RLS HARDENING
--
-- Audit findings fixed here:
--
-- RLS / SECURITY
--   1. is_admin(), is_staff(), get_my_provider_id() are SECURITY
--      DEFINER without a pinned search_path — a search_path
--      hijack could bypass admin/staff checks. Pinned to public.
--   2. Sensitive tables had GRANT ALL TO anon (bookings,
--      customers, mpesa_payments, sms_messages, staff_profiles,
--      booking_resources, booking_services). RLS blocked rows,
--      but grants are now least-privilege: anon keeps access to
--      everything guests actually use (public content tables +
--      security-definer RPCs such as check_and_reserve,
--      get_booking_by_reference, get_customer_schedule_history,
--      get_available_slots) and NOTHING directly on sensitive
--      tables. Staff keep the operations their policies allow.
--   3. "Public can view booking services" exposed booking_id →
--      service_id links to anonymous callers (enumeration leak,
--      not needed by the guest flow which uses RPCs). Removed.
--
-- NORMALIZATION
--   4. provider_availability duplicated staff_schedule_exceptions
--      / schedule_blocks / staff_schedules and was referenced by
--      nothing but the legacy is_provider_available() (unused by
--      the app). Dropped both.
--   5. services.category (text) duplicated service_categories.
--      category_id is now the source of truth: FK added, rows
--      backfilled, and a trigger keeps the denormalized `category`
--      label in sync from service_categories.slug (the UI keeps
--      reading `category` without break).
--   6. services.business_id had no FK — added.
--   7. bookings denormalized snapshot columns (customer_name,
--      service_names, prices, time_slot...) are INTENTIONAL
--      historical records (prices/names change over time); the
--      normalized sources remain booking_services,
--      booking_resources and customers. Documented via COMMENT.
-- ============================================================

-- ------------------------------------------------------------
-- 42.1 Pin search_path on security-critical helper functions
-- ------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid());
$$;

create or replace function public.get_my_provider_id() returns uuid
language sql stable security definer set search_path = public as $$
  select provider_id from public.staff_profiles where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- 42.2 Least-privilege table grants
--      (anon keeps: public content tables + definer RPCs;
--       authenticated keeps: operations its policies allow;
--       service_role keeps ALL — edge functions rely on it)
-- ------------------------------------------------------------

-- Sensitive tables: no direct anonymous access at all.
-- Guests reach bookings/customers only through security-definer
-- RPCs (check_and_reserve, get_booking_by_reference,
-- get_customer_schedule_history) which is the audited path.
revoke all on table public.bookings from anon;
revoke all on table public.customers from anon;
revoke all on table public.mpesa_payments from anon;
revoke all on table public.sms_messages from anon;
revoke all on table public.staff_profiles from anon;
revoke all on table public.booking_resources from anon;
revoke all on table public.booking_services from anon;

-- booking_services: public SELECT exposed booking→service links
-- (enumeration leak); the guest flow uses RPCs instead.
drop policy if exists "Public can view booking services" on public.booking_services;

-- Staff (authenticated): grant exactly what their policies permit.
grant select, insert, update on table public.bookings to authenticated;
grant select, insert, update on table public.customers to authenticated;
grant select on table public.mpesa_payments to authenticated;
grant select on table public.sms_messages to authenticated;
grant select on table public.staff_profiles to authenticated;
grant select, insert, update, delete on table public.booking_resources to authenticated;
grant select, insert, update, delete on table public.booking_services to authenticated;

-- ------------------------------------------------------------
-- 42.3 Drop legacy provider_availability (duplicates
--      staff_schedules / schedule_blocks /
--      staff_schedule_exceptions; unused by the application)
-- ------------------------------------------------------------
drop function if exists public.is_provider_available(uuid, date, text, integer);
drop table if exists public.provider_availability;

-- ------------------------------------------------------------
-- 42.4 services.category_id — normalized source of truth
--      Backfill, FK, and sync trigger for the denormalized
--      `category` label (UI keeps reading `category`).
-- ------------------------------------------------------------
-- Backfill category_id from the legacy text slug where missing
update public.services s
set category_id = c.id
from public.service_categories c
where s.category_id is null and c.slug = s.category;

-- Backfill the label from the canonical category where they disagree
update public.services s
set category = c.slug
from public.service_categories c
where s.category_id = c.id and s.category is distinct from c.slug;

-- FK (added only if absent)
do $$ begin
  alter table public.services
    add constraint services_category_id_fkey
    foreign key (category_id) references public.service_categories(id) on delete set null;
exception when duplicate_object then null;
when duplicate_table then null;
end $$;

-- business_id FK (added only if absent)
do $$ begin
  alter table public.services
    add constraint services_business_id_fkey
    foreign key (business_id) references public.businesses(id) on delete cascade;
exception when duplicate_object then null;
when duplicate_table then null;
end $$;

-- Keep the denormalized `category` label in sync with the
-- canonical service_categories.slug (single source of truth).
create or replace function public.sync_service_category_label()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null then
    select c.slug into new.category
    from public.service_categories c
    where c.id = new.category_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_service_category_label on public.services;
create trigger trg_sync_service_category_label
  before insert or update of category_id on public.services
  for each row execute procedure public.sync_service_category_label();

-- ------------------------------------------------------------
-- 42.5 Document the intentional denormalization on bookings
-- ------------------------------------------------------------
comment on table public.bookings is
  'Bookings. Normalized relations: booking_services (services), booking_resources (providers), customers (client). The customer_name/service_names/price/time_slot columns are an intentional historical snapshot of the booking at creation time (prices and names change over time) and are kept in sync at write time by check_and_reserve.';
comment on column public.bookings.service_ids is
  'Historical snapshot; canonical relation is booking_services.';
comment on column public.bookings.service_names is
  'Historical snapshot of service names at booking time.';
comment on column public.bookings.provider_name is
  'Historical snapshot; canonical relation is booking_resources.';
