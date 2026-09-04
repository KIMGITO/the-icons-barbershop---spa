// send-sms Edge Function — Send SMS via Africa's Talking
// Sends a receipt/booking SMS to a customer and logs it in sms_messages.
// Only authenticated admin or staff users can invoke this.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const AT_API_KEY = Deno.env.get('AFRICASTALKING_API_KEY');
const AT_USERNAME = Deno.env.get('AFRICASTALKING_USERNAME') || 'sandbox';
const AT_SENDER_ID = Deno.env.get('AFRICASTALKING_SENDER_ID');
const AT_ENV = Deno.env.get('AFRICASTALKING_ENV') || 'sandbox';

function formatE164(phone: string): string {
  let p = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  if (/^0\d{9}$/.test(p)) p = '254' + p.substring(1);
  return p;
}

function buildReceiptMessage(booking: any): string {
  const total = Number(booking.total_price_ksh || 0).toLocaleString();
  const deposit = Number(booking.deposit_paid_ksh || 0).toLocaleString();
  const remaining = Number(booking.remaining_balance_ksh || 0).toLocaleString();
  const services = Array.isArray(booking.service_names) ? booking.service_names.join(', ') : 'Appointment';

  return [
    `THE ICONS Barber & Spa`,
    `Hi ${booking.customer_name}, your appointment is confirmed!`,
    ``,
    `Receipt Code: ${booking.receipt_code}`,
    `Services: ${services}`,
    `Barber: ${booking.provider_name}`,
    `Date: ${booking.date} @ ${booking.time_slot}`,
    ``,
    `Total: KSh ${total}`,
    `Deposit: KSh ${deposit}`,
    `Balance: KSh ${remaining}`,
    ``,
    `Show the Receipt Code at the chair to begin. See you soon!`
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

    // 2. Staff check
    const { data: profile } = await admin.from('staff_profiles').select('role').eq('id', user.id).single();
    if (!profile) return Response.json({ error: 'Staff access only' }, { status: 403, headers: corsHeaders });

    const { bookingId, receiptCode, phoneNumber, customerName, message, smsType, retryMessageId } = await req.json();

    let toPhone = phoneNumber;
    let msg = message;
    let rc = receiptCode || null;
    let bookingUuid = bookingId || null;
    let customer = customerName || null;

    if (retryMessageId) {
      const { data: oldMsg } = await admin.from('sms_messages').select('*').eq('id', retryMessageId).single();
      if (!oldMsg) return Response.json({ error: 'Original message not found' }, { status: 404, headers: corsHeaders });
      toPhone = oldMsg.to_phone;
      msg = oldMsg.message_body;
      rc = oldMsg.receipt_code;
      bookingUuid = oldMsg.booking_id;
      customer = oldMsg.customer_name;
    } else if (bookingId && !msg) {
      const { data: booking } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle();
      if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404, headers: corsHeaders });
      toPhone = booking.customer_phone;
      rc = booking.receipt_code;
      customer = booking.customer_name;
      msg = buildReceiptMessage(booking);
    }

    if (!toPhone || !msg) {
      return Response.json({ error: 'phoneNumber, message, bookingId, or retryMessageId is required' }, { status: 400, headers: corsHeaders });
    }

    if (!toPhone || !msg) {
      return Response.json({ error: 'phoneNumber and message (or bookingId) are required' }, { status: 400, headers: corsHeaders });
    }

    const formattedPhone = formatE164(toPhone);

    if (!AT_API_KEY) {
      await admin.rpc('log_sms_message', {
        p_booking_id: bookingUuid, p_receipt_code: rc, p_to_phone: formattedPhone,
        p_customer_name: customer, p_message_body: msg, p_sms_type: smsType || 'receipt',
        p_status: 'failed', p_provider: 'africastalking',
        p_provider_message_id: null,
        p_error_message: 'AFRICASTALKING_API_KEY not configured'
      }).catch(() => {});
      return Response.json(
        { error: `Africa's Talking is not configured. Set AFRICASTALKING_API_KEY secret.` },
        { status: 503, headers: corsHeaders }
      );
    }

    const baseUrl = AT_ENV === 'production'
      ? 'https://api.africastalking.com'
      : 'https://api.sandbox.africastalking.com';

    const smsBody: any = { username: AT_USERNAME, to: formattedPhone, message: msg };
    if (AT_SENDER_ID) smsBody.from = AT_SENDER_ID;

    const atRes = await fetch(`${baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        'apiKey': AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(smsBody).toString()
    });

    const atData = await atRes.json().catch(() => ({}));
    const responseCode = atData?.SMSMessageData?.Recipients?.[0]?.statusCode;
    const messageId = atData?.SMSMessageData?.Recipients?.[0]?.messageId || null;
    const delivered = atRes.ok && (!responseCode || responseCode === '101') ? 'sent' : 'failed';
    const errorMsg = delivered === 'failed' ? (atData?.SMSMessageData?.Message || `HTTP ${atRes.status}`) : null;

    if (retryMessageId && delivered === 'sent') {
      await admin.from('sms_messages').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: messageId,
        error_message: null
      }).eq('id', retryMessageId);
    } else {
      await admin.rpc('log_sms_message', {
        p_booking_id: bookingUuid, p_receipt_code: rc, p_to_phone: formattedPhone,
        p_customer_name: customer, p_message_body: msg, p_sms_type: smsType || 'receipt',
        p_status: delivered, p_provider: 'africastalking',
        p_provider_message_id: messageId, p_error_message: errorMsg
      }).catch((e) => console.error('Failed to log SMS:', e.message));
    }

    return Response.json({
      success: delivered === 'sent', status: delivered, messageId, error: errorMsg,
      message: delivered === 'sent' ? `SMS dispatched to ${formattedPhone}` : 'SMS failed'
    }, { status: atRes.ok ? 200 : 400, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});
