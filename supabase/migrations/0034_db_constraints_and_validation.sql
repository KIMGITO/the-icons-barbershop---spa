-- ============================================================
-- 74. DATABASE CONSTRAINTS & VALIDATION
--     Enforce business rules at the database level so a malicious
--     or buggy client cannot persist invalid data.
-- ============================================================

-- ============================================================
-- 74.1 SERVICES — positive price & duration
-- ============================================================
alter table public.services drop constraint if exists chk_services_price_positive;
alter table public.services add constraint chk_services_price_positive
  check (price_ksh >= 0);

alter table public.services drop constraint if exists chk_services_duration_positive;
alter table public.services add constraint chk_services_duration_positive
  check (duration_minutes > 0);

-- ============================================================
-- 74.2 PRODUCTS — positive price, non-negative stock
-- ============================================================
alter table public.products drop constraint if exists chk_products_price_positive;
alter table public.products add constraint chk_products_price_positive
  check (price_ksh >= 0);

alter table public.products drop constraint if exists chk_products_original_price;
alter table public.products add constraint chk_products_original_price
  check (original_price_ksh is null or original_price_ksh >= price_ksh);

alter table public.products drop constraint if exists chk_products_stock_nonneg;
alter table public.products add constraint chk_products_stock_nonneg
  check (stock_quantity >= 0);

-- Products availability must be one of the known values
alter table public.products drop constraint if exists chk_products_availability;
alter table public.products add constraint chk_products_availability
  check (availability in ('in-stock', 'low-stock', 'out-of-stock'));

-- ============================================================
-- 74.3 BOOKINGS — payment invariants
--     total = deposit + remaining (server-side truth).
-- ============================================================
alter table public.bookings drop constraint if exists chk_bookings_prices_nonneg;
alter table public.bookings add constraint chk_bookings_prices_nonneg
  check (
    total_price_ksh >= 0
    and deposit_paid_ksh >= 0
    and remaining_balance_ksh >= 0
  );

alter table public.bookings drop constraint if exists chk_bookings_balance_math;
alter table public.bookings add constraint chk_bookings_balance_math
  check (deposit_paid_ksh + remaining_balance_ksh = total_price_ksh);

alter table public.bookings drop constraint if exists chk_bookings_deposit_not_over_total;
alter table public.bookings add constraint chk_bookings_deposit_not_over_total
  check (deposit_paid_ksh <= total_price_ksh);

-- ============================================================
-- 74.4 M-PESA PAYMENTS — positive amount
-- ============================================================
alter table public.mpesa_payments drop constraint if exists chk_mpesa_amount_positive;
alter table public.mpesa_payments add constraint chk_mpesa_amount_positive
  check (amount_ksh > 0);

-- ============================================================
-- 74.5 REVIEWS — rating range enforced at DB level
--     (product_reviews and service_reviews already have
--      check (rating between 1 and 5) from creation.)
--     Re-assert defensively:
-- ============================================================
alter table public.product_reviews drop constraint if exists chk_product_reviews_rating;
alter table public.product_reviews add constraint chk_product_reviews_rating
  check (rating between 1 and 5);

alter table public.product_reviews drop constraint if exists chk_product_reviews_status;
alter table public.product_reviews add constraint chk_product_reviews_status
  check (review_status in ('pending', 'approved', 'rejected', 'archived'));

alter table public.service_reviews drop constraint if exists chk_service_reviews_rating;
alter table public.service_reviews add constraint chk_service_reviews_rating
  check (rating between 1 and 5);

alter table public.service_reviews drop constraint if exists chk_service_reviews_status;
alter table public.service_reviews add constraint chk_service_reviews_status
  check (review_status in ('pending', 'approved', 'rejected', 'archived'));

-- ============================================================
-- 74.6 BOOKINGS — required relationships
--     A booking must reference an existing service/provider.
--     (FKs already exist; add NOT NULL on the critical ones
--      that were previously nullable.)
-- ============================================================
alter table public.bookings alter column provider_id set not null;
alter table public.bookings alter column provider_name set not null;
alter table public.bookings alter column service_ids set not null;
alter table public.bookings alter column service_names set not null;

-- ============================================================
-- 74.7 CUSTOMERS from guest bookings need business_id
-- ============================================================
alter table public.customers alter column name set not null;

-- ============================================================
-- 74.8 DEPLOY DEACTIVATE-INSTEAD-OF-DELETE PATTERN
--     Service providers already use status enum
--     ('active' / 'inactive'). Services use 'active'/'inactive'/
--     'archived'. This keeps historical bookings intact.
--     (No extra schema change required — documented here.)
-- ============================================================

-- Force PostgREST to reload its schema cache.
notify pgrst, 'reload schema';