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

export interface ScheduleBooking {
  id: string;
  reference_number: string;
  receipt_code: string | null;
  customer_name?: string;
  customer_phone?: string;
  date: string;
  time_slot: string;
  end_time: string;
  duration_minutes: number;
  service_names: string[];
  provider_name: string;
  total_price_ksh: number;
  deposit_paid_ksh: number;
  remaining_balance_ksh: number;
  status: string;
  payment_status: string;
  mpesa_receipt_number: string | null;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  total_visits: number;
  total_spend_ksh: number;
  last_visit_date: string | null;
  vip_status: boolean;
}

export interface ScheduleHistory {
  customer: CustomerInfo | null;
  upcoming: ScheduleBooking[];
  past: ScheduleBooking[];
}

export interface ProviderScheduleSummary {
  upcoming: ScheduleBooking[];
  past: ScheduleBooking[];
  stats: {
    total_past: number;
    completed: number;
    cancelled: number;
    no_show: number;
    total_revenue_ksh: number;
    upcoming_count: number;
  };
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
  },

  /**
   * STAFF: Retrieve a customer's full schedule history (upcoming + past)
   * by phone number.
   */
  async getCustomerScheduleHistory(phone: string, limit: number = 50): Promise<ScheduleHistory> {
    if (!isSupabaseConfigured) {
      return { customer: null, upcoming: [], past: [] };
    }
    const { data, error } = await supabase.rpc('get_customer_schedule_history', {
      p_phone: phone.trim(),
      p_limit: limit
    });
    if (error) throw new Error(error.message);
    return {
      customer: data?.customer || null,
      upcoming: data?.upcoming || [],
      past: data?.past || []
    };
  },

  /**
   * STAFF: Provider schedule summary — upcoming + past bookings + stats.
   */
  async getProviderScheduleSummary(providerId: string, daysBack: number = 30): Promise<ProviderScheduleSummary> {
    if (!isSupabaseConfigured) {
      return {
        upcoming: [],
        past: [],
        stats: { total_past: 0, completed: 0, cancelled: 0, no_show: 0, total_revenue_ksh: 0, upcoming_count: 0 }
      };
    }
    const { data, error } = await supabase.rpc('get_provider_schedule_summary', {
      p_provider_id: providerId,
      p_days_back: daysBack
    });
    if (error) throw new Error(error.message);
    return {
      upcoming: data?.upcoming || [],
      past: data?.past || [],
      stats: data?.stats || { total_past: 0, completed: 0, cancelled: 0, no_show: 0, total_revenue_ksh: 0, upcoming_count: 0 }
    };
  }
};