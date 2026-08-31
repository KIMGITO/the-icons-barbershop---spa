-- ============================================================
-- 71. REMOVE ALL SEEDED BUSINESS DATA
--     Production cleanup: ensure the application starts with an
--     empty database state. The admin account (auth.users +
--     staff_profiles + admin service_provider) created by 0003 and
--     preserved by 0027 remains untouched.
--
--     WARNING: This deletes ALL services, products, bookings,
--     reviews, gallery items, FAQs, categories, schedules, and
--     hours. It is intentional — the database is the source of
--     truth and business data is created by the admin through
--     the management UI.
-- ============================================================

-- Disable FK triggers temporarily to allow clean cascade without
-- dependency ordering issues.
set session_replication_role = 'replica';

-- Delete junction / join tables first
delete from public.booking_resources;
delete from public.booking_services;
delete from public.provider_services;

-- Delete bookings & related payments
delete from public.bookings;
delete from public.mpesa_payments;

-- Delete reviews
delete from public.product_reviews;
delete from public.service_reviews;

-- Delete products
delete from public.products;

-- Delete services + service requirements
delete from public.service_requirements;
delete from public.services;

-- Delete categories
delete from public.service_categories;

-- Delete gallery
delete from public.gallery_items;

-- Delete FAQs
delete from public.faqs;

-- Delete schedule-related data
delete from public.staff_schedule_exceptions;
delete from public.staff_breaks;
delete from public.staff_schedules;
delete from public.schedule_blocks;
delete from public.provider_availability;
delete from public.business_hours;

-- Re-enable FK triggers
set session_replication_role = 'origin';

-- ============================================================
-- SAFETY NET: Prevent accidental re-seeding
-- (All tables use UUID primary keys — no serial sequences exist.)
-- Comment out or remove the old seed migration files (0005, 0009,
-- 0028, 0029 content) from the migration history, or keep them for
-- new installs that run all migrations in order. On a fresh clone,
-- these seeds run first, then this migration wipes them — leaving
-- the production state clean.
-- ============================================================
