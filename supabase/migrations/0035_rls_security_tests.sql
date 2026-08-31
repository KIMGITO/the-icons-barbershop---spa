-- ============================================================
-- 75. RLS SECURITY TEST SUITE
--     Run against a local/CI Supabase instance to verify that
--     Row Level Security correctly ALLOWS and DENIES operations
--     for anonymous users, providers, and admins.
--
--     Execute with:  psql "..." -f supabase/migrations/0035_rls_security_tests.sql
--     (or via supabase db test / pgTAP if configured).
--
--     IMPORTANT: These tests run INSIDE a transaction and ROLL
--     BACK at the end so they never mutate real data.
-- ============================================================

begin;

-- ============================================================
-- 75.0 SETUP — require a business row + basic test records
--     (These are test fixtures created WITHIN the transaction and
--      rolled back — never persist to production.)
-- ============================================================
-- Ensure default business exists for FK constraints
insert into public.businesses (id, name, city, country)
values ('00000000-0000-0000-0000-000000000001', 'Test Business', 'Nairobi', 'Kenya')
on conflict (id) do nothing;

-- Create two test providers for scoping checks
do $$
declare
  v_p1 uuid := gen_random_uuid();
  v_p2 uuid := gen_random_uuid();
  v_svc uuid := gen_random_uuid();
  v_cust uuid := gen_random_uuid();
  v_booking uuid;
begin
  insert into public.service_providers (id, slug, first_name, last_name, full_name, provider_type, status, business_id)
  values (v_p1, 'test-provider-a', 'Test', 'Provider A', 'Test Provider A', 'barber', 'active', '00000000-0000-0000-0000-000000000001');
  insert into public.service_providers (id, slug, first_name, last_name, full_name, provider_type, status, business_id)
  values (v_p2, 'test-provider-b', 'Test', 'Provider B', 'Test Provider B', 'barber', 'active', '00000000-0000-0000-0000-000000000001');

  insert into public.services (id, slug, name, category, price_ksh, duration_minutes, status, business_id)
  values (v_svc, 'test-service', 'Test Service', 'haircuts', 1000, 30, 'active', '00000000-0000-0000-0000-000000000001');

  insert into public.customers (id, name, phone, business_id)
  values (v_cust, 'Test Customer', '+254712345678', '00000000-0000-0000-0000-000000000001');

  insert into public.bookings (
    id, reference_number, customer_id, customer_name, customer_phone,
    service_ids, service_names, provider_id, provider_name,
    date, time_slot, duration_minutes, total_price_ksh,
    deposit_paid_ksh, remaining_balance_ksh, status, payment_status,
    business_id
  ) values (
    gen_random_uuid(), 'TEST-REF-1', v_cust, 'Test Customer', '+254712345678',
    array[v_svc], array['Test Service'], v_p1, 'Test Provider A',
    current_date, '10:00 AM', 30, 1000, 500, 500, 'confirmed', 'deposit-paid',
    '00000000-0000-0000-0000-000000000001'
  );
end $$;

-- ============================================================
-- 75.1 ANONYMOUS USER TESTS
-- ============================================================
-- Run as anon role (no auth)
set role anon;

-- ALLOWED: can read public services view
do $$
begin
  perform * from public.v_public_services limit 1;
exception when others then
  raise exception 'ANON should be able to read v_public_services: %', sqlerrm;
end $$;

-- ALLOWED: can read public providers view
do $$
begin
  perform * from public.v_public_providers limit 1;
exception when others then
  raise exception 'ANON should be able to read v_public_providers: %', sqlerrm;
end $$;

-- ALLOWED: can read public products view (empty)
do $$
begin
  perform * from public.v_public_products limit 1;
exception when others then
  raise exception 'ANON should be able to read v_public_products: %', sqlerrm;
end $$;

-- ALLOWED: can read public gallery view (empty)
do $$
begin
  perform * from public.v_public_gallery limit 1;
exception when others then
  raise exception 'ANON should be able to read v_public_gallery: %', sqlerrm;
end $$;

-- ALLOWED: can read public FAQs view (empty)
do $$
begin
  perform * from public.v_public_faqs limit 1;
exception when others then
  raise exception 'ANON should be able to read v_public_faqs: %', sqlerrm;
end $$;

-- ALLOWED: can insert a pending product review
do $$
begin
  insert into public.product_reviews (product_id, author_name, rating, comment, review_status)
  values (null, 'Anon Tester', 5, 'Test review', 'pending');
exception when others then
  raise exception 'ANON should be able to insert pending product review: %', sqlerrm;
end $$;

-- DENIED: cannot insert an approved product review (self-approval)
do $$
begin
  begin
    insert into public.product_reviews (product_id, author_name, rating, comment, review_status)
    values (null, 'Anon Tester', 5, 'Should fail', 'approved');
    raise exception 'ANON must NOT be able to insert approved review';
  exception when insufficient_privilege or sqlstate '42501' then
    null; -- expected denial
  end;
end $$;

-- DENIED: cannot read all bookings directly
do $$
begin
  begin
    perform * from public.bookings limit 1;
    raise exception 'ANON must NOT be able to read bookings directly';
  exception when insufficient_privilege or sqlstate '42501' then
    null; -- expected denial
  end;
end $$;

-- DENIED: cannot update services
do $$
begin
  begin
    update public.services set price_ksh = 9999 where slug = 'test-service';
    raise exception 'ANON must NOT be able to update services';
  exception when insufficient_privilege or sqlstate '42501' then
    null; -- expected denial
  end;
end $$;

-- DENIED: cannot delete services
do $$
begin
  begin
    delete from public.services where slug = 'test-service';
    raise exception 'ANON must NOT be able to delete services';
  exception when insufficient_privilege or sqlstate '42501' then
    null; -- expected denial
  end;
end $$;

-- DENIED: cannot read staff profiles
do $$
begin
  begin
    perform * from public.staff_profiles limit 1;
    raise exception 'ANON must NOT be able to read staff_profiles';
  exception when insufficient_privilege or sqlstate '42501' then
    null; -- expected denial
  end;
end $$;

reset role;

-- ============================================================
-- 75.2 PROVIDER TESTS
--     Simulate a provider by setting auth.uid() to a made-up uuid
--     and calling get_my_provider_id() indirectly — we can't trivially
--     mock auth in plain SQL, so the tests below use the function
--     checks to verify the POLICY definitions exist and behave.
--     (Full auth-user simulation requires the Supabase test
--      framework / pgTAP with auth.uid() stubbed.)
-- ============================================================

-- Verify the is_admin() helper works
do $$
begin
  -- is_admin() should return false for no auth (anon context)
  if public.is_admin() then
    raise exception 'is_admin() should be false in anon context';
  end if;
end $$;

-- Verify the provider-scoped policy for staff_schedules exists with correct shape
do $$
declare
  v_policy_exists boolean;
begin
  select exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_schedules'
      and policyname = 'Staff can view staff schedules'
  ) into v_policy_exists;
  if not v_policy_exists then
    raise exception 'Staff can view staff schedules policy is missing';
  end if;
end $$;

-- Verify the column-level revoke on service_providers (email/phone/etc.)
do $$
declare
  v_has_update_priv boolean;
begin
  -- authenticated role should NOT have update privilege on email column
  select has_column_privilege('authenticated', 'public.service_providers', 'email', 'UPDATE')
  into v_has_update_priv;
  if v_has_update_priv then
    raise exception 'authenticated should NOT be able to UPDATE service_providers.email';
  end if;
end $$;

-- ============================================================
-- 75.3 ADMIN TESTS
--     Verify the admin RPC functions exist and are executable by
--     authenticated (they self-check is_admin() inside).
-- ============================================================
select exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'admin_list_products'
) as admin_list_products_exists;

select exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'admin_set_review_status'
) as admin_set_review_status_exists;

select exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'admin_list_service_reviews'
) as admin_list_service_reviews_exists;

-- ============================================================
-- 75.4 DATABASE CONSTRAINT TESTS
--     Verify the constraints we added actually reject bad data.
-- ============================================================
set role postgres;

-- DENIED: negative service price
do $$
begin
  begin
    insert into public.services (slug, name, category, price_ksh, duration_minutes, status)
    values ('neg-price-test', 'Neg Price', 'haircuts', -1, 30, 'active');
    raise exception 'Negative service price should be rejected';
  exception when check_violation then
    null; -- expected
  end;
end $$;

-- DENIED: zero-duration service
do $$
begin
  begin
    insert into public.services (slug, name, category, price_ksh, duration_minutes, status)
    values ('zero-dur-test', 'Zero Dur', 'haircuts', 1000, 0, 'active');
    raise exception 'Zero-duration service should be rejected';
  exception when check_violation then
    null; -- expected
  end;
end $$;

-- DENIED: booking with inconsistent balance math
do $$
begin
  begin
    insert into public.bookings (
      reference_number, customer_name, provider_name, date, time_slot,
      service_ids, service_names, total_price_ksh, deposit_paid_ksh,
      remaining_balance_ksh, status, payment_status
    ) values (
      'BAD-BAL-1', 'Bad', 'Bad', current_date, '11:00 AM',
      '{}', '{}', 1000, 200, 200, 'confirmed', 'paid'
    );
    raise exception 'Balance math mismatch should be rejected';
  exception when check_violation then
    null; -- expected
  end;
end $$;

-- DENIED: invalid product review rating (outside 1-5)
do $$
begin
  begin
    insert into public.product_reviews (author_name, rating, comment, review_status)
    values ('Bad', 6, 'Bad rating', 'pending');
    raise exception 'Rating > 5 should be rejected';
  exception when check_violation then
    null; -- expected
  end;
end $$;

-- ============================================================
-- 75.5 CLEANUP — roll back ALL test data, never persist.
-- ============================================================
rollback;

-- ============================================================
-- NOTE: This file ends with rollback — safe for CI and local runs.
-- If a migration runner applies files transactionally, the
-- rollback ensures no test fixtures leak into production.
-- ============================================================