import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AvailableSlot, CheckAndReserveResult } from '../types/booking';

/** Normalize a single service id and/or a list into one deduped list. */
function resolveServiceIds(
  serviceId?: string,
  serviceIds?: string[],
  extraIds?: string[]
): string[] {
  const all = [...(serviceIds || []), ...(extraIds || [])];
  if (serviceId) all.push(serviceId);
  return Array.from(new Set(all.filter(Boolean)));
}

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
   * Accepts a single serviceId or a list of serviceIds (multi-service).
   */
  async checkAvailability(
    customerId: string,
    serviceId: string,
    desiredStartTs: string,
    preferredStaffIds?: string[],
    serviceIds?: string[]
  ): Promise<CheckAndReserveResult> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }
    const ids = resolveServiceIds(serviceId, undefined, serviceIds);
    const { data, error } = await supabase.rpc('check_and_reserve', {
      p_customer_id: customerId,
      p_service_id: ids[0] || null,
      p_desired_start_ts: desiredStartTs,
      p_preferred_staff_ids: preferredStaffIds || null,
      p_check_only: true,
      p_service_ids: ids.length ? ids : null
    });
    if (error) {
      return { success: false, error: error.message };
    }
    const row = data as any;
    return {
      success: !!row.success,
      error: row.error,
      bookingId: row.booking_id,
      referenceNumber: row.reference_number,
      receiptCode: row.receipt_code,
      staffId: row.staff_id,
      staffName: row.staff_name,
      startTs: row.start_ts,
      endTs: row.end_ts,
      totalPriceKsh: Number(row.total_price_ksh || 0),
      depositPaidKsh: Number(row.deposit_paid_ksh || 0),
      remainingBalanceKsh: Number(row.remaining_balance_ksh || 0),
      status: row.status,
      paymentStatus: row.payment_status
    };
  },

  /**
   * Create a booking atomically with full availability validation.
    if (error) {
      return { success: false, error: error.message };
    }
    const row = data as any;
    return {
      success: !!row.success,
      error: row.error,
      bookingId: row.booking_id,
      referenceNumber: row.reference_number,
      receiptCode: row.receipt_code,
      staffId: row.staff_id,
      staffName: row.staff_name,
      startTs: row.start_ts,
      endTs: row.end_ts,
      totalPriceKsh: Number(row.total_price_ksh || 0),
      depositPaidKsh: Number(row.deposit_paid_ksh || 0),
      remainingBalanceKsh: Number(row.remaining_balance_ksh || 0),
      status: row.status,
      paymentStatus: row.payment_status
    };
  },

  /**
   * Create a booking atomically with full availability validation.
   * All selected services are submitted in one atomic booking —
   * the RPC prices and sizes the slot across the whole list.
   */
  async createBooking(payload: {
    customerId?: string | null;
    serviceIds?: string[];
    serviceId?: string;
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
    const serviceIds = resolveServiceIds(payload.serviceId, payload.serviceIds);
    if (serviceIds.length === 0) {
      return { success: false, error: 'SERVICE_NOT_FOUND' };
    }
    const { data, error } = await supabase.rpc('check_and_reserve', {
      p_customer_id: payload.customerId || null,
      p_service_id: serviceIds[0],
      p_desired_start_ts: payload.desiredStartTs,
      p_preferred_staff_ids: payload.preferredStaffIds || null,
      p_check_only: false,
      p_customer_name: payload.customerName || null,
      p_customer_phone: payload.customerPhone || null,
      p_customer_email: payload.customerEmail || null,
      p_special_requests: payload.specialRequests || null,
      p_require_payment: payload.requirePayment || false,
      p_payment_method: payload.paymentMethod || 'unpaid',
      p_payment_ref: payload.paymentRef || null,
      p_service_ids: serviceIds
    });
    if (error) {
      return { success: false, error: error.message };
    }
    const row = data as any;
    return {
      success: !!row.success,
      error: row.error,
      bookingId: row.booking_id,
      referenceNumber: row.reference_number,
      receiptCode: row.receipt_code,
      staffId: row.staff_id,
      staffName: row.staff_name,
      startTs: row.start_ts,
      endTs: row.end_ts,
      totalPriceKsh: Number(row.total_price_ksh || 0),
      depositPaidKsh: Number(row.deposit_paid_ksh || 0),
      remainingBalanceKsh: Number(row.remaining_balance_ksh || 0),
      status: row.status,
      paymentStatus: row.payment_status
    };
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
