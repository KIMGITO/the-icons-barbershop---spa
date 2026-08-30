// mpesa-callback Edge Function — Receives Daraja API STK Push callback
// Note: In sandbox env you must set the callback URL to a publicly reachable URL.
// In production, use the public URL of this edge function.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// Safaricom expects a plain ResponseCode 0 response body
const darajaSuccess = new Response(
  JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);

const darajaError = new Response(
  JSON.stringify({ ResultCode: 1, ResultDesc: 'Failed' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);

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

    // Use the database function — it updates the payment row AND, on a
    // completed deposit, confirms a previously-pending booking
    // (booking only "succeeds" once the M-Pesa payment is confirmed).
    const { error: fnErr } = await admin.rpc('update_mpesa_payment_status', {
      p_checkout_request_id: checkoutRequestId,
      p_status: status,
      p_receipt_number: receiptNumber,
      p_result_code: resultCode,
      p_result_desc: resultDesc,
      p_raw_callback: body
    });

    if (fnErr) {
      console.error('update_mpesa_payment_status failed, falling back to row update:', fnErr.message);
      // Fallback: update payment row directly
      await admin.from('mpesa_payments')
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
        .single()
        .catch(err => console.error('mpesa_payments fallback update failed:', err.message));
    }

    // If the database function wasn't available, apply the confirm-on-complete
    // logic directly as a fallback so pending bookings still get confirmed.
    if (fnErr && status === 'completed') {
      const { data: paymentRecord } = await admin.from('mpesa_payments')
        .select('booking_id')
        .eq('checkout_request_id', checkoutRequestId)
        .maybeSingle();

      if (paymentRecord?.booking_id) {
        // Confirm the pending payment-gated booking
        await admin.from('bookings').update({
          status: 'confirmed',
          payment_status: 'deposit-paid',
          payment_method: 'mpesa',
          mpesa_receipt_number: receiptNumber,
          deposit_paid_ksh: Number(amount || 0),
          remaining_balance_ksh: 0,
          updated_at: new Date().toISOString()
        }).eq('id', paymentRecord.booking_id).catch(err => console.error('booking confirm fallback failed:', err.message));
      }
    }

    return darajaSuccess;
  } catch (err) {
    console.error('M-Pesa callback error:', err.message);
    return darajaError;
  }
});