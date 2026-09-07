// mpesa-callback Edge Function — Receives Daraja API STK Push callback
// On successful payment: updates the payment + booking, then triggers
// notifications (customer + admin SMS) via the confirm-booking-notification function.
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

    console.log(`Processing callback for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}, Desc: ${resultDesc}`);

    // Extract metadata items - Daraja returns an array of { Name, Value }
    const metaItems: Record<string, string> = {};
    if (callbackMetadata && Array.isArray(callbackMetadata.Item)) {
      for (const item of callbackMetadata.Item) {
        if (item && item.Name) {
          metaItems[item.Name] = item.Value !== undefined ? String(item.Value) : '';
        }
      }
    }

    const amount = metaItems.Amount ? parseFloat(metaItems.Amount) : null;
    const receiptNumber = metaItems.MpesaReceiptNumber || null;
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
      console.error(`CRITICAL: No booking linked to checkoutRequestId: ${checkoutRequestId}. MerchantRequestID: ${merchantRequestId}`);
      return darajaSuccess;
    }

    if (status === 'completed') {
      console.log(`Payment successful for booking ${bookingId}. Updating status and triggering notifications...`);
      
      try {
        // 1. Fetch current booking state for accurate balance math
        const { data: booking, error: fetchErr } = await admin.from('bookings')
          .select('total_price_ksh, deposit_paid_ksh')
          .eq('id', bookingId)
          .single();

        if (fetchErr || !booking) {
          throw new Error(`Could not fetch booking ${bookingId}: ${fetchErr?.message}`);
        }

        const totalPaid = (booking.deposit_paid_ksh || 0) + Number(amount || 0);
        const remaining = Math.max(0, booking.total_price_ksh - totalPaid);
        const paymentStatus = remaining === 0 ? 'paid' : 'deposit-paid';

        // 2. Confirm the booking and update balance
        const { data: bookingRow, error: confirmErr } = await admin.from('bookings')
          .update({
            status: 'confirmed',
            payment_status: paymentStatus,
            payment_method: 'mpesa',
            mpesa_receipt_number: receiptNumber,
            receipt_code: receiptNumber || undefined, // Use M-Pesa receipt as the official receipt code
            deposit_paid_ksh: totalPaid,
            remaining_balance_ksh: remaining,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .select('id')
          .maybeSingle();

        if (confirmErr) {
          throw confirmErr;
        }

        if (bookingRow) {
          // 3. Trigger notifications via another Edge Function
          const notificationUrl = `${supabaseUrl}/functions/v1/confirm-booking-notification`;
          try {
            await fetch(notificationUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                bookingId: bookingRow.id,
                amountPaid: amount
              })
            });
            console.log(`Notification trigger sent for booking ${bookingRow.id}`);
          } catch (err) {
            console.error('Failed to trigger notifications:', err.message);
          }
        }
      } catch (err) {
        console.error('Failed to process successful payment:', err.message);
        // If we failed to update the booking (e.g. constraint violation), 
        // we remove it to free the slot as requested by the user, 
        // even though this is a successful payment (manual intervention might be needed).
        await admin.from('bookings').delete().eq('id', bookingId);
        return darajaError;
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