// mpesa-stk-push Edge Function — Initiate M-Pesa STK Push
// Calls Daraja API to send a payment prompt to the customer's phone
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getMpesaConfig,
  getAccessToken,
  generatePassword,
  getTimestamp,
  formatPhoneForDaraja,
} from '../_shared/mpesa.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const AccountReference = 'THE_ICONS_BARBER';
const TransactionDesc = 'The Icons Barber & Spa Payment';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { phoneNumber, amountKsh, bookingId, referenceNumber, customerName } = await req.json();
    if (!phoneNumber || !amountKsh || !bookingId) {
      return Response.json({ error: 'phoneNumber, amountKsh, bookingId are required' }, { status: 400, headers: corsHeaders });
    }
    if (amountKsh < 1) {
      return Response.json({ error: 'Amount must be greater than 0' }, { status: 400, headers: corsHeaders });
    }

    // Lazy config: secrets may not be set yet — return a clear config error
    // instead of failing at module load (which blocks deployment).
    let config;
    try {
      config = getMpesaConfig();
    } catch (e: any) {
      return Response.json(
        { error: 'M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY secrets.' },
        { status: 503, headers: corsHeaders }
      );
    }

    const accessToken = await getAccessToken(config);
    const timestamp = getTimestamp();
    const password = generatePassword(config.shortcode, config.passkey, timestamp);
    const formattedPhone = formatPhoneForDaraja(phoneNumber);

    // Validate phone number is Safaricom (07 or 2547)
    if (!/^2547\d{8}$/.test(formattedPhone)) {
      return Response.json({ error: 'M-Pesa STK Push requires a Safaricom number (07XX or 2547XX)' }, { status: 400, headers: corsHeaders });
    }

    const res = await fetch(`${config.env === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke'}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: String(Math.round(amountKsh)),
        PartyA: formattedPhone,
        PartyB: config.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: (referenceNumber || AccountReference).slice(0, 12),
        TransactionDesc: TransactionDesc.slice(0, 13)
      })
    });

    const data = await res.json();

    if (!res.ok || (data.ResponseCode && data.ResponseCode !== '0')) {
      // Log the failed attempt
      await admin.from('mpesa_payments').insert({
        booking_id: bookingId,
        phone_number: formattedPhone,
        amount_ksh: amountKsh,
        status: 'failed',
        merchant_request_id: data.MerchantRequestID || null,
        result_code: data.ResponseCode ? parseInt(data.ResponseCode) : null,
        result_desc: data.ResponseDescription || 'Unknown error'
      }).select().single().catch(() => {});

      return Response.json({
        error: data.ResponseDescription || 'M-Pesa STK push failed',
        ResponseCode: data.ResponseCode
      }, { status: 400, headers: corsHeaders });
    }

    // Log the successful initiation
    const { data: payment, error: insertErr } = await admin.from('mpesa_payments').insert({
      booking_id: bookingId,
      phone_number: formattedPhone,
      amount_ksh: amountKsh,
      checkout_request_id: data.CheckoutRequestID || null,
      merchant_request_id: data.MerchantRequestID || null,
      status: 'pending'
    }).select().single();

    if (insertErr) {
      console.error('Failed to log M-Pesa payment:', insertErr.message);
    }

    return Response.json({
      success: true,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      amountKsh,
      message: `M-Pesa STK push prompt dispatched to ${formattedPhone}. Customer enters M-Pesa PIN to complete payment.`,
      paymentId: payment?.id
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});