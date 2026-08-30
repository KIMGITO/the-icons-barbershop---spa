-- ============================================================
-- 53. SMS MESSAGES LOG TABLE
--     Records every SMS sent (Africa's Talking) with customer,
--     receipt linkage, provider status, and admin audit fields.
-- ============================================================
create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  receipt_code text,
  to_phone text not null,
  customer_name text,
  message_body text not null,
  sms_type text not null default 'receipt',
  status text not null default 'pending',
  provider text not null default 'africastalking',
  provider_message_id text,
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_sms_messages_booking on public.sms_messages(booking_id);
create index if not exists idx_sms_messages_phone on public.sms_messages(to_phone);
create index if not exists idx_sms_messages_receipt on public.sms_messages(receipt_code);
create index if not exists idx_sms_messages_created on public.sms_messages(created_at desc);

alter table public.sms_messages enable row level security;

drop policy if exists "Staff can view sms_messages" on public.sms_messages;
create policy "Staff can view sms_messages" on public.sms_messages
  for select using (public.is_staff());

drop policy if exists "Admin can manage sms_messages" on public.sms_messages;
create policy "Admin can manage sms_messages" on public.sms_messages
  for all using (public.is_admin());

-- ============================================================
-- 54. RECEIPT LOOKUP -- instant retrieval by 6-char code
-- ============================================================
create or replace function public.get_booking_by_receipt(p_receipt_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_services jsonb;
begin
  if p_receipt_code is null or length(trim(p_receipt_code)) < 4 then
    return null;
  end if;

  select * into v_booking
  from public.bookings
  where upper(trim(receipt_code)) = upper(trim(p_receipt_code))
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'duration_minutes', s.duration_minutes,
    'price_ksh', s.price_ksh
  ) order by s.name), '[]'::jsonb)
  into v_services
  from public.services s
  where s.id = any(v_booking.service_ids);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'reference_number', v_booking.reference_number,
    'receipt_code', v_booking.receipt_code,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'customer_email', v_booking.customer_email,
    'provider_id', v_booking.provider_id,
    'provider_name', v_booking.provider_name,
    'date', v_booking.date,
    'time_slot', v_booking.time_slot,
    'end_time', v_booking.end_time,
    'duration_minutes', v_booking.duration_minutes,
    'service_names', v_booking.service_names,
    'services', v_services,
    'total_price_ksh', v_booking.total_price_ksh,
    'deposit_paid_ksh', v_booking.deposit_paid_ksh,
    'remaining_balance_ksh', v_booking.remaining_balance_ksh,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status,
    'special_requests', v_booking.special_requests,
    'mpesa_receipt_number', v_booking.mpesa_receipt_number
  );
end;
$$;

grant execute on function public.get_booking_by_receipt(text) to anon, authenticated;

-- ============================================================
-- 55. HELPER: Store an SMS log row (used by send-sms edge fn)
-- ============================================================
create or replace function public.log_sms_message(
  p_booking_id uuid,
  p_receipt_code text,
  p_to_phone text,
  p_customer_name text,
  p_message_body text,
  p_sms_type text default 'receipt',
  p_status text default 'pending',
  p_provider text default 'africastalking',
  p_provider_message_id text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.sms_messages (
    booking_id, receipt_code, to_phone, customer_name, message_body,
    sms_type, status, provider, provider_message_id, error_message,
    sent_by, business_id, sent_at
  )
  values (
    p_booking_id, p_receipt_code, p_to_phone, p_customer_name, p_message_body,
    p_sms_type, p_status, p_provider, p_provider_message_id, p_error_message,
    auth.uid(), v_business_id,
    case when p_status = 'sent' then now() else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_sms_message(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
