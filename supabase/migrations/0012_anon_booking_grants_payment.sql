-- ============================================================
-- 51. GUEST BOOKING WITHOUT LOGIN — grant anon/authenticated
--     execute on the booking + availability + payment functions.
--     All functions are SECURITY DEFINER so RLS on tables is
--     bypassed intentionally for these bounded operations.
-- ============================================================

grant execute on function public.create_booking(text, text, text, uuid[], uuid, date, text, text, numeric, text, boolean, text) to anon, authenticated;
grant execute on function public.calculate_booking_totals(uuid[], uuid) to anon, authenticated;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_time_slots(uuid, date) to anon, authenticated;
grant execute on function public.is_provider_available(uuid, date, text, int) to anon, authenticated;

-- ============================================================
-- 52. M-PESA PAYMENTS — unique checkout request + index
-- ============================================================
create unique index if not exists uq_mpesa_payments_checkout_request_id
  on public.mpesa_payments(checkout_request_id)
  where checkout_request_id is not null;

-- ============================================================
-- 53. PAYMENT-CONFIRMED BOOKING LOOKUP for the public
--     "my booking" status check (no auth / no login).
--     Returns only the essentials + payment state.
-- ============================================================
create or replace function public.get_booking_by_reference(p_reference text)
returns table (
  id uuid,
  reference_number text,
  date date,
  time_slot text,
  status booking_status,
  payment_status payment_status,
  total_price_ksh numeric,
  deposit_paid_ksh numeric,
  remaining_balance_ksh numeric,
  mpesa_receipt_number text,
  provider_name text,
  service_names text[]
)
language sql
security definer
set search_path = public
as $$
  select b.id, b.reference_number, b.date, b.time_slot, b.status, b.payment_status,
         b.total_price_ksh, b.deposit_paid_ksh, b.remaining_balance_ksh,
         b.mpesa_receipt_number, b.provider_name, b.service_names
  from public.bookings b
  where b.reference_number = p_reference
  limit 1;
$$;

grant execute on function public.get_booking_by_reference(text) to anon, authenticated;