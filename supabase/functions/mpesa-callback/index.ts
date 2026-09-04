// mpesa-callback Edge Function — Receives Daraja API STK Push callback
// On successful payment: updates the payment + booking, then sends the
// customer an SMS (Africa's Talking) containing their 6-char receipt code.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const AT_API_KEY = Deno.env.get('AFRICASTALKING_API_KEY');
const AT_USERNAME = Deno.env.get('AFRICASTALKING_USERNAME') || 'sandbox';
const AT_SENDER_ID = Deno.env.get('AFRICASTALKING_SENDER_ID');
const AT_ENV = Deno.env.get('AFRICASTALKING_ENV') || 'sandbox';

// Safaricom expects a plain ResponseCode 0 response body
const darajaSuccess = new Response(
  JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);

const darajaError = new Response(
  JSON.stringify({ ResultCode: 1, ResultDesc: 'Failed' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);

function formatE164(phone: string): string {
  let p = (phone || '').replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  if (/^0\d{9}$/.test(p)) p = '254' + p.substring(1);
  return p;
}

function buildPaymentConfirmationMessage(booking: any, amount: number, mpesaReceipt: string | null): string {
  const services = Array.isArray(booking.service_names) ? booking.service_names.join(', ') : 'Appointment';
  const remaining = Number(booking.remaining_balance_ksh || 0).toLocaleString();
  const lines = [
    `THE ICONS Barber & Spa`,
    `Hi ${booking.customer_name}, deposit of KSh ${Number(amount || 0).toLocaleString()} received!`,
    `Ticket: ${booking.receipt_code}`,
    `Date: ${booking.date}`,
    `Time: ${booking.time_slot}`,
    `Services: ${services}`,
    `Barber: ${booking.provider_name}`,
    `Balance: KSh ${remaining}`,
    ``,
    `Your appointment is CONFIRMED. Show this ticket at the chair. See you soon!`,
  ];
  return lines.join('\n');
}

/** Send the receipt-code SMS via Africa's Talking and log it. */
async function sendReceiptSms(booking: any, amount: number, mpesaReceipt: string | null) {
  const toPhone = formatE164(booking.customer_phone);
  const msg = buildPaymentConfirmationMessage(booking, amount, mpesaReceipt);

  try {
    if (!AT_API_KEY) {
      await admin.rpc('log_sms_message', {
        p_booking_id: booking.id, p_receipt_code: booking.receipt_code, p_to_phone: toPhone,
        p_customer_name: booking.customer_name, p_message_body: msg, p_sms_type: 'payment_confirmation',
        p_status: 'failed', p_provider: 'africastalking',
        p_provider_message_id: null,
        p_error_message: 'AFRICASTALKING_API_KEY not configured'
      }).catch(() => {});
      console.warn('Africa\'s Talking not configured — payment SMS skipped.');
      return;
    }

    const baseUrl = AT_ENV === 'production'
      ? 'https://api.africastalking.com'
      : 'https://api.sandbox.africastalking.com';

    const smsBody: any = { username: AT_USERNAME, to: toPhone, message: msg };
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

    await admin.rpc('log_sms_message', {
      p_booking_id: booking.id, p_receipt_code: booking.receipt_code, p_to_phone: toPhone,
      p_customer_name: booking.customer_name, p_message_body: msg, p_sms_type: 'payment_confirmation',
      p_status: delivered, p_provider: 'africastalking',
      p_provider_message_id: messageId, p_error_message: errorMsg
    }).catch((e) => console.error('Failed to log payment SMS:', e.message));

    console.log(`Payment confirmation SMS ${delivered} to ${toPhone} (code: ${booking.receipt_code})`);
  } catch (smsErr: any) {
    console.error('Payment SMS dispatch failed:', smsErr.message);
    await admin.rpc('log_sms_message', {
      p_booking_id: booking.id, p_receipt_code: booking.receipt_code, p_to_phone: toPhone,
      p_customer_name: booking.customer_name, p_message_body: msg, p_sms_type: 'payment_confirmation',
      p_status: 'failed', p_provider: 'africastalking',
      p_provider_message_id: null, p_error_message: smsErr.message
    }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(body));

    // Structure: body.Body.stkCallback = { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata }
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Invalid callback payload — missing stkCallback');
      return darajaError;
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    const callbackMetadata = stkCallback.CallbackMetadata || { Item: [] };

    // Extract metadata items
    const metaItems: Record<string, string> = {};
    for (const item of callbackMetadata.Item || []) {
      metaItems[item.Name] = item.Value !== undefined ? String(item.Value) : '';
    }

    const amount = metaItems.Amount ? parseFloat(metaItems.Amount) : null;
    const receiptNumber = metaItems.MpeasReceiptNumber || metaItems.MpesaReceiptNumber || null;
    const transactionDate = metaItems.TransactionDate || null;
    const phoneNumber = metaItems.PhoneNumber || null;

    // Determine status
    const status = resultCode === 0 ? 'completed' : 'failed';

    // Update the payment record
    const { data: paymentRecord, error: updateErr } = await admin.from('mpesa_payments')
      .update({
        status,
        receipt_number: receiptNumber,
        transaction_date: transactionDate,
        result_code: resultCode,
        result_desc: resultDesc,
        raw_callback: body,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_request_id', checkoutRequestId)
      .select('booking_id')
      .maybeSingle();

    if (updateErr) {
      console.error('Failed to update mpesa_payments:', updateErr.message);
    }

    const bookingId = paymentRecord?.booking_id;
    if (!bookingId) {
      console.error('No booking linked to checkoutRequestId:', checkoutRequestId);
      return darajaSuccess;
    }

    if (status === 'completed') {
      // 1. Confirm the booking
      const { data: bookingRow, error: confirmErr } = await admin.from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'deposit-paid',
          payment_method: 'mpesa',
          mpesa_receipt_number: receiptNumber,
          deposit_paid_ksh: Number(amount || 0),
          // We don't zero out balance here because it's only a 50% deposit
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select('*')
        .maybeSingle();

      if (confirmErr) {
        console.error('Failed to confirm booking:', confirmErr.message);
      } else if (bookingRow) {
        // 2. Send detailed SMS
        await sendReceiptSms(bookingRow, amount, receiptNumber);
      }
    } else {
      // Payment failed — remove the pending booking record to free up the slot
      console.log(`Payment failed for booking ${bookingId}, removing booking record.`);
      const { error: deleteErr } = await admin.from('bookings').delete().eq('id', bookingId);
      if (deleteErr) {
        console.error('Failed to delete booking after payment failure:', deleteErr.message);
      }
    }

    return darajaSuccess;
  } catch (err) {
    console.error('M-Pesa callback error:', err.message);
    return darajaError;
  }
});