import { MpesaPaymentRequest, MpesaPaymentResult } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DepositBreakdown {
  totalKsh: number;
  minimumDepositKsh: number;
  remainingKsh: number;
  depositPercentage: number;
}

export const paymentService = {
  /**
   * Calculate exact deposit breakdown (default 50%)
   */
  calculateDeposit(totalPriceKsh: number, customDepositPaidKsh: number = 0): DepositBreakdown {
    const total = Math.max(0, Math.round(totalPriceKsh));
    const minimumDeposit = Math.round(total * 0.5); // Whole number 50%
    const paid = Math.max(0, Math.round(customDepositPaidKsh));
    const remaining = Math.max(0, total - paid);

    return {
      totalKsh: total,
      minimumDepositKsh: minimumDeposit,
      remainingKsh: remaining,
      depositPercentage: 50
    };
  },

  /**
   * Normalize and validate Kenyan phone number
   * Accepts: 0712345678, 0112345678, +254712345678, 254712345678
   */
  formatKenyanPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Check if starts with +254 or 254
    if (/^(\+?254)(7|1)\d{8}$/.test(cleaned)) {
      const standard = cleaned.replace(/^\+/, '');
      return { valid: true, formatted: standard };
    }

    // Check if starts with 07 or 01
    if (/^(07|01)\d{8}$/.test(cleaned)) {
      const standard = `254${cleaned.substring(1)}`;
      return { valid: true, formatted: standard };
    }

    return {
      valid: false,
      formatted: phone,
      error: 'Please enter a valid Safaricom/Airtel mobile number (e.g., 0712 345 678 or 254712345678).'
    };
  },

  /**
   * Initiate M-Pesa STK Push via Supabase Edge Function
   * Calls the mpesa-stk-push edge function which invokes Safaricom Daraja API
   */
  async initiateMpesaStkPush(request: MpesaPaymentRequest): Promise<MpesaPaymentResult> {
    const phoneCheck = this.formatKenyanPhone(request.phoneNumber);
    if (!phoneCheck.valid) {
      throw new Error(phoneCheck.error || 'Invalid phone number format.');
    }

    if (request.amountKsh < 1) {
      throw new Error('Payment amount must be greater than KSh 0.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. M-Pesa payments are unavailable.');
    }

    try {
      const session = await supabase.auth.getSession();
      const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/mpesa-stk-push';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token || ''}`
        },
        body: JSON.stringify({
          phoneNumber: phoneCheck.formatted,
          amountKsh: request.amountKsh,
          bookingId: request.bookingId,
          referenceNumber: request.referenceNumber,
          customerName: request.customerName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'M-Pesa STK push failed.');
      }

      return {
        success: true,
        checkoutRequestId: data.checkoutRequestId,
        receiptNumber: data.receiptNumber,
        amountKsh: data.amountKsh || request.amountKsh,
        message: data.message || 'M-Pesa STK push initiated successfully.'
      };
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Format a phone number for M-Pesa STK push display (Safaricom +254).
   * Accepts 07XX..., 01XX..., 2547XX..., +2547XX...
   * Returns { valid, formatted } where formatted is the +254 international.
   */
  formatSafaricomDisplayPhone(phone: string): { valid: boolean; formatted: string; local?: string } {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    let normalized: string;

    if (/^07\d{8}$/.test(cleaned)) {
      normalized = `254${cleaned.substring(1)}`;
    } else if (/^01\d{8}$/.test(cleaned)) {
      normalized = `254${cleaned.substring(1)}`;
    } else if (/^2547\d{8}$/.test(cleaned) || /^2541\d{8}$/.test(cleaned)) {
      normalized = cleaned;
    } else if (/^\+2547\d{8}$/.test(cleaned) || /^\+2541\d{8}$/.test(cleaned)) {
      normalized = cleaned.substring(1);
    } else {
      return { valid: false, formatted: phone };
    }

    return {
      valid: true,
      formatted: `+${normalized}`,
      local: `0${normalized.substring(3)}`
    };
  },

  /**
   * Query STK Push payment status from Supabase mpesa_payments table.
   * Public edge endpoint — guests (no login) poll this during booking.
   */
  async checkPaymentStatus(checkoutRequestId: string): Promise<{ completed: boolean; receiptNumber: string; status?: string }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Payment status is unavailable.');
    }

    try {
      const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/mpesa-status';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check payment status.');
      }

      return {
        completed: data.status === 'completed',
        receiptNumber: data.receiptNumber || '',
        status: data.status
      };
    } catch (err: any) {
      throw err;
    }
  }
};