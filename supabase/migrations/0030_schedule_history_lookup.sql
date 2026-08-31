-- ============================================================
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