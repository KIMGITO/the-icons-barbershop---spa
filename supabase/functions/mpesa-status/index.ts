// mpesa-status Edge Function — Query M-Pesa STK Push payment status
// Checks the mpesa_payments table for the current status of a checkout request
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // Public endpoint: guests (no login) in the booking flow poll payment status
    // by checkoutRequestId. The booking only becomes 'confirmed' after the
    // M-Pesa callback verifies the deposit, so exposing status is safe.
    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) {
      return Response.json({ error: 'checkoutRequestId is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: payment, error } = await admin.from('mpesa_payments')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    if (!payment) {
      return Response.json({
        success: false,
        status: 'not-found',
        message: 'No payment record found for this checkout request.'
      }, { status: 404, headers: corsHeaders });
    }

    return Response.json({
      success: true,
      status: payment.status,
      receiptNumber: payment.receipt_number,
      amountKsh: Number(payment.amount_ksh || 0),
      resultCode: payment.result_code,
      resultDesc: payment.result_desc,
      checkoutRequestId: payment.checkout_request_id,
      updatedAt: payment.updated_at
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});