import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AvailableSlot, CheckAndReserveResult } from '../types/booking';

export const bookingEngineService = {
  /**
   * Get available slots for a service on a date.
   * Each slot includes the assigned staff member.
   */
  async getAvailableSlots(
    serviceId: string,
    date: string,
    preferredStaffIds?: string[]
  ): Promise<AvailableSlot[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_service_id: serviceId,
      p_date: date,
      p_preferred_staff_ids: preferredStaffIds || null
    });
    if (error) {
      console.error('Failed to get available slots:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      startTs: row.start_ts,
      endTs: row.end_ts,
      staffId: row.staff_id,
      staffName: row.staff_name
    }));
  },

  /**
   * Check if a specific slot is available (dry-run).
   */
  async checkAvailability(
    customerId: string,
    serviceId: string,
    desiredStartTs: string,
    preferredStaffIds?: string[]
  ): Promise<CheckAndReserveResult> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.rpc('check_and_reserve', {
      p_customer_id: customerId,
      p_service_id: serviceId,
      p_desired_start_ts: desiredStartTs,
      p_preferred_staff_ids: preferredStaffIds || null,
      p_check_only: true
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return data as CheckAndReserveResult;
  },

  /**
   * Create a booking atomically with full availability validation.
   */
  async createBooking(payload: {
    customerId: string;
    serviceId: string;
    desiredStartTs: string;
    preferredStaffIds?: string[];
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    specialRequests?: string;
    requirePayment?: boolean;
    paymentMethod?: string;
    paymentRef?: string;
  }): Promise<CheckAndReserveResult> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.rpc('check_and_reserve', {
      p_customer_id: payload.customerId,
      p_service_id: payload.serviceId,
      p_desired_start_ts: payload.desiredStartTs,
      p_preferred_staff_ids: payload.preferredStaffIds || null,
      p_check_only: false,
      p_customer_name: payload.customerName || null,
      p_customer_phone: payload.customerPhone || null,
      p_customer_email: payload.customerEmail || null,
      p_special_requests: payload.specialRequests || null,
      p_require_payment: payload.requirePayment || false,
      p_payment_method: payload.paymentMethod || 'unpaid',
      p_payment_ref: payload.paymentRef || null
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return data as CheckAndReserveResult;
  },

  /**
   * Get all staff qualified to perform a service (regardless of availability).
   * Used to suggest alternatives when no one is available at the chosen time.
   */
  async getQualifiedStaff(serviceId: string): Promise<{ staffId: string; staffName: string; providerType: string }[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('get_qualified_staff', {
      p_service_id: serviceId
    });
    if (error) {
      console.error('Failed to get qualified staff:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      staffId: row.staff_id,
      staffName: row.staff_name,
      providerType: row.provider_type
    }));
  },

  /**
   * Map error codes to user-friendly messages.
   */
  mapError(error: string): string {
    const messages: Record<string, string> = {
      'SERVICE_NOT_FOUND': 'The selected service is no longer available.',
      'BUSINESS_CLOSED': 'The business is closed at this time. Please choose another time.',
      'CUSTOMER_CONFLICT': 'You already have a booking at this time. Please choose another slot.',
      'SLOT_UNAVAILABLE': 'This slot is no longer available. Please choose another time.',
      'ROLE_UNAVAILABLE': 'No qualified master is available at this time. Try another date or pick a specific master below.'
    };
    return messages[error] || error || 'An unexpected error occurred. Please try again.';
  }
};
