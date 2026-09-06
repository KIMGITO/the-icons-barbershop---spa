import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const AT_API_KEY = Deno.env.get('AFRICASTALKING_API_KEY');
const AT_USERNAME = Deno.env.get('AFRICASTALKING_USERNAME') || 'sandbox';
const AT_SENDER_ID = Deno.env.get('AFRICASTALKING_SENDER_ID');
const AT_ENV = Deno.env.get('AFRICASTALKING_ENV') || 'sandbox';
const ADMIN_PHONE = Deno.env.get('ADMIN_PHONE_NUMBER');

function formatE164(phone: string): string {
  let p = (phone || '').replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  if (/^0\d{9}$/.test(p)) p = '254' + p.substring(1);
  return p;
}

async function sendAtSms(phone: string, message: string) {
  const isProd = AT_ENV === 'production';
  const baseUrl = isProd
    ? 'https://api.africastalking.com'
    : 'https://api.sandbox.africastalking.com';
  const username = isProd ? AT_USERNAME : 'sandbox';

  if (!AT_API_KEY) {
    return {
      delivered: 'failed' as const,
      errorMsg: 'AFRICASTALKING_API_KEY not configured',
    };
  }

  const body: any = { username, to: phone, message };
  if (isProd && AT_SENDER_ID) body.from = AT_SENDER_ID;

  try {
    const res = await fetch(`${baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        apiKey: AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    });
    const data = await res.json().catch(() => ({}));
    const code = data?.SMSMessageData?.Recipients?.[0]?.statusCode;
    const mid = data?.SMSMessageData?.Recipients?.[0]?.messageId || null;
    const delivered = code === 101 || code === '101' ? 'sent' : 'failed';
    return {
      delivered,
      messageId: mid,
      errorMsg: delivered === 'failed' ? JSON.stringify(data) : null,
    };
  } catch (err) {
    return { delivered: 'failed' as const, errorMsg: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { bookingId, amountPaid } = await req.json();

    if (!bookingId) {
      return Response.json(
        { error: 'bookingId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Fetch booking details
    const { data: booking, error: fetchErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !booking) {
      console.error('Booking not found:', fetchErr);
      return Response.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    const services = Array.isArray(booking.service_names)
      ? booking.service_names.join(', ')
      : 'Appointment';
    const total = Number(booking.total_price_ksh || 0).toLocaleString();
    const deposit = Number(booking.deposit_paid_ksh || 0).toLocaleString();
    const remaining = Number(
      booking.remaining_balance_ksh || 0,
    ).toLocaleString();

    // 2. Build Customer SMS
    const customerMsg =
      `Hi ${booking.customer_name}, your appointment is confirmed!\n\n` +
      `Receipt Code: ${booking.mpesa_receipt_number || booking.receipt_code}\n` +
      `Services: ${services}\n` +
      `Barber: ${booking.provider_name}\n` +
      `Date: ${booking.date} @ ${booking.time_slot}\n\n` +
      `Total: KSh ${total}\n` +
      `Deposit: KSh ${deposit}\n` +
      `Balance: KSh ${remaining}\n\n` +
      `Show the Receipt Code at the chair to begin. See you soon!`;

    // 3. Build Admin SMS
    const adminMsg = [
      `NEW BOOKING: ${booking.mpesa_receipt_number || booking.receipt_code}`,
      `Customer: ${booking.customer_name}`,
      `Paid: KSh ${Number(amountPaid || 0).toLocaleString()}`,
      `Date: ${booking.date} @ ${booking.time_slot}`,
      `Services: ${services}`,
      `Provider: ${booking.provider_name}`,
    ].join('\n');

    // 4. Send Customer SMS
    const customerPhone = formatE164(booking.customer_phone);
    const customerResult = await sendAtSms(customerPhone, customerMsg);
    await admin.rpc('log_sms_message', {
      p_booking_id: booking.id,
      p_receipt_code: booking.mpesa_receipt_number || booking.receipt_code,
      p_to_phone: customerPhone,
      p_customer_name: booking.customer_name,
      p_message_body: customerMsg,
      p_sms_type: 'payment_confirmation',
      p_status: customerResult.delivered,
      p_provider: 'africastalking',
      p_provider_message_id: customerResult.messageId,
      p_error_message: customerResult.errorMsg,
    });

    // 5. Send Admin SMS if configured
    if (ADMIN_PHONE) {
      const adminPhone = formatE164(ADMIN_PHONE);
      const adminResult = await sendAtSms(adminPhone, adminMsg);
      await admin.rpc('log_sms_message', {
        p_booking_id: booking.id,
        p_receipt_code: booking.receipt_code,
        p_to_phone: adminPhone,
        p_customer_name: 'Admin Notification',
        p_message_body: adminMsg,
        p_sms_type: 'admin_notification',
        p_status: adminResult.delivered,
        p_provider: 'africastalking',
        p_provider_message_id: adminResult.messageId,
        p_error_message: adminResult.errorMsg,
      });
    }

    return Response.json(
      { success: true, customerStatus: customerResult.delivered },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('Confirmation notification error:', err.message);
    return Response.json(
      { error: err.message },
      { status: 500, headers: corsHeaders },
    );
  }
});
