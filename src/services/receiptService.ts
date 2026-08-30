import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ReceiptBooking {
  booking_id: string;
  reference_number: string;
  receipt_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  provider_id: string;
  provider_name: string;
  date: string;
  time_slot: string;
  end_time: string;
  duration_minutes: number;
  service_names: string[];
  services: { id: string; name: string; duration_minutes: number; price_ksh: number }[];
  total_price_ksh: number;
  deposit_paid_ksh: number;
  remaining_balance_ksh: number;
  status: string;
  payment_status: string;
  special_requests: string | null;
  mpesa_receipt_number: string | null;
}

export const receiptService = {
  /**
   * Lookup booking by 6-char receipt code (public — barber retrieves at the chair).
   */
  async getBookingByReceiptCode(code: string): Promise<ReceiptBooking | null> {
    if (!isSupabaseConfigured) return null;
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return null;

    const { data, error } = await supabase.rpc('get_booking_by_receipt', { p_receipt_code: clean });
    if (error) throw new Error(error.message);
    return data || null;
  }
};