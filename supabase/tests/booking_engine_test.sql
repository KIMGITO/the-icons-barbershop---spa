-- ============================================================
-- BOOKING ENGINE — TEST SUITE
-- Run against the database to verify RPC functions.
-- ============================================================

-- Test 1: fn_subtract_windows
select 'Test 1: fn_subtract_windows' as test_name;
select public.fn_subtract_windows(
  array[tstzrange('2026-01-01 08:00:00+03', '2026-01-01 18:00:00+03', '[)')],
  array[tstzrange('2026-01-01 12:00:00+03', '2026-01-01 13:00:00+03', '[)')]
) as result;
-- Expected: [08:00-12:00), [13:00-18:00)

-- Test 2: fn_get_staff_free_windows (normal day)
select 'Test 2: fn_get_staff_free_windows (normal day)' as test_name;
select * from public.fn_get_staff_free_windows(
  '00000000-0000-0000-0000-00000000000a',
  '2026-08-31'::date  -- Monday
);

-- Test 3: fn_get_staff_free_windows (with break)
select 'Test 3: fn_get_staff_free_windows (with break)' as test_name;
-- Insert a test break
insert into public.staff_breaks (provider_id, date, start_time, end_time, reason)
values ('00000000-0000-0000-0000-00000000000a', '2026-08-31', '15:00', '15:30', 'test-break')
on conflict do nothing;

select * from public.fn_get_staff_free_windows(
  '00000000-0000-0000-0000-00000000000a',
  '2026-08-31'::date
);

-- Test 4: fn_get_staff_free_windows (with absence)
select 'Test 4: fn_get_staff_free_windows (with absence)' as test_name;
insert into public.staff_schedule_exceptions (provider_id, date, exception_type, reason)
values ('00000000-0000-0000-0000-00000000000a', '2026-09-01', 'ABSENT', 'test-absence')
on conflict (provider_id, date) do update set exception_type = 'ABSENT';

select * from public.fn_get_staff_free_windows(
  '00000000-0000-0000-0000-00000000000a',
  '2026-09-01'::date
);
-- Expected: no rows (absent)

-- Test 5: get_available_slots
select 'Test 5: get_available_slots' as test_name;
select * from public.get_available_slots(
  '00000000-0000-0000-0000-0000000000a1',  -- Classic Icon Haircut
  '2026-08-31'::date
) limit 5;

-- Test 6: check_and_reserve (check_only)
select 'Test 6: check_and_reserve (check_only)' as test_name;
select public.check_and_reserve(
  '00000000-0000-0000-0000-000000000000',  -- guest
  '00000000-0000-0000-0000-0000000000a1',  -- Classic Icon Haircut
  '2026-08-31 10:00:00+03'::timestamptz,
  null,  -- no preferred staff
  true   -- check_only
);

-- Test 7: check_and_reserve (create booking)
select 'Test 7: check_and_reserve (create booking)' as test_name;
select public.check_and_reserve(
  '00000000-0000-0000-0000-000000000000',  -- guest
  '00000000-0000-0000-0000-0000000000a1',  -- Classic Icon Haircut
  '2026-08-31 10:00:00+03'::timestamptz,
  null,
  false,
  'Test Customer',
  '+254712345678',
  'test@example.com',
  'Test booking',
  false,
  'unpaid'
);

-- Test 8: check_and_reserve (customer conflict)
select 'Test 8: check_and_reserve (customer conflict)' as test_name;
-- First create a booking
select public.check_and_reserve(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000000a1',
  '2026-08-31 11:00:00+03'::timestamptz,
  null, false, 'Test Customer 2', '+254712345679', null, null, false, 'unpaid'
);
-- Then try to book overlapping time for same customer
select public.check_and_reserve(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000000a1',
  '2026-08-31 11:30:00+03'::timestamptz,
  null, false, 'Test Customer 2', '+254712345679', null, null, false, 'unpaid'
);
-- Expected: CUSTOMER_CONFLICT

-- Test 9: check_and_reserve (business closed)
select 'Test 9: check_and_reserve (business closed)' as test_name;
select public.check_and_reserve(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000000a1',
  '2026-08-31 22:00:00+03'::timestamptz,
  null, false, 'Test Customer 3', '+254712345680', null, null, false, 'unpaid'
);
-- Expected: BUSINESS_CLOSED

-- Cleanup test data
delete from public.staff_breaks where reason = 'test-break';
delete from public.staff_schedule_exceptions where reason = 'test-absence';
delete from public.bookings where customer_phone in ('+254712345678', '+254712345679', '+254712345680');