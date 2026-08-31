import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StaffBooking, StaffBookingStatus } from '../types/staff';
import { paymentService } from './paymentService';

const mapDbBooking = (row: any): StaffBooking => ({
  id: row.id,
  referenceNumber: row.reference_number,
  customerName: row.customer_name,
  customerPhone: row.customer_phone || '',
  customerEmail: row.customer_email || '',
  serviceIds: row.service_ids || [],
  serviceNames: row.service_names || [],
  providerId: row.provider_id,
  providerName: row.provider_name,
  date: row.date,
  timeSlot: row.time_slot,
  endTime: row.end_time,
  durationMinutes: row.duration_minutes,
  totalPriceKsh: Number(row.total_price_ksh || 0),
  depositPaidKsh: Number(row.deposit_paid_ksh || 0),
  remainingBalanceKsh: Number(row.remaining_balance_ksh || 0),
  status: row.status,
  paymentStatus: row.payment_status,
  paymentMethod: row.payment_method || 'unpaid',
  mpesaReceiptNumber: row.mpesa_receipt_number,
  specialRequests: row.special_requests,
  staffNotes: row.staff_notes,
  createdAt: row.created_at
});

export interface GuestBookingPayout {
  bookingId: string;
  referenceNumber: string;
  depositKsh: number;
  totalKsh: number;
  remainingKsh: number;
  checkoutRequestId?: string;
}

export const bookingService = {
  /**
   * Create a guest (no-login) booking via the create_booking RPC.
   * When requirePayment is true the booking is created 'pending'/'unpaid'
   * and the slot is HELD but NOT confirmed until M-Pesa deposit completes.
   * The 50% deposit is calculated in the database.
   */
  async createGuestBooking(payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceIds: string[];
    providerId: string;
    date: string;
    timeSlot: string;
    specialRequests?: string;
    requirePayment?: boolean;
    paymentRef?: string | null;
  }): Promise<GuestBookingPayout> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { data, error } = await supabase.rpc('create_booking', {
      p_customer_name: payload.customerName,
      p_customer_phone: payload.customerPhone,
      p_customer_email: payload.customerEmail || null,
      p_service_ids: payload.serviceIds,
      p_provider_id: payload.providerId,
      p_date: payload.date,
      p_time_slot: payload.timeSlot,
      p_special_requests: payload.specialRequests || null,
      p_deposit_paid_ksh: 0,
      p_payment_method: payload.requirePayment ? 'mpesa' : 'unpaid',
      p_require_payment: payload.requirePayment ?? false,
      p_payment_ref: payload.paymentRef || null
    });
    if (error) throw new Error(error.message);

    return {
      bookingId: data.id,
      referenceNumber: data.reference_number,
      depositKsh: Number(data.deposit_paid_ksh || 0),
      totalKsh: Number(data.total_price_ksh || 0),
      remainingKsh: Number(data.remaining_balance_ksh || 0),
      checkoutRequestId: data.mpesa_receipt_number || undefined
    };
  },

  /**
   * Get all booked time slots for a provider on a date (public helper).
   */
  async getBookedSlots(providerId: string, date: string): Promise<{ time_slot: string; end_time: string; status: string }[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('get_booked_slots', {
      p_provider_id: providerId,
      p_date: date
    });
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Public booking lookup by reference (no login).
   */
  async getBookingByReference(reference: string): Promise<any> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_booking_by_reference', {
      p_reference: reference
    });
    if (error) throw new Error(error.message);
    return data || null;
  },

  /**
   * Get bookings from the database (Supabase only — no local fallback).
   */
  async getBookings(filter?: { 
    date?: string; 
    providerId?: string; 
    status?: StaffBookingStatus | 'all'; 
  }): Promise<StaffBooking[]> {
    if (!isSupabaseConfigured) return [];

    let query = supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: false });
    if (filter?.date) query = query.eq('date', filter.date);
    if (filter?.providerId && filter.providerId !== 'all') query = query.eq('provider_id', filter.providerId);
    if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbBooking);
  },

  async getBookingById(id: string): Promise<StaffBooking | null> {
    const all = await this.getBookings();
    return all.find(b => b.id === id) || null;
  },

  async persistToSupabase(op: 'insert' | 'update', id: string | undefined, data: any) {
    if (op === 'insert') {
      const { data: inserted, error } = await supabase.from('bookings').insert(data).select().single();
      if (error) throw new Error(error.message);
      return mapDbBooking(inserted);
    }
    const { data: updated, error } = await supabase.from('bookings').update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapDbBooking(updated);
  },

  async createBooking(bookingData: Omit<StaffBooking, 'id' | 'referenceNumber' | 'createdAt'>): Promise<StaffBooking> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    // Use create_booking RPC which automatically calculates duration, price, end_time, and reference
    try {
      const { data: created, error } = await supabase.rpc('create_booking', {
        p_customer_name: bookingData.customerName,
        p_customer_phone: bookingData.customerPhone,
        p_customer_email: bookingData.customerEmail || null,
        p_service_ids: bookingData.serviceIds,
        p_provider_id: bookingData.providerId,
        p_date: bookingData.date,
        p_time_slot: bookingData.timeSlot,
        p_special_requests: bookingData.specialRequests || null,
        p_deposit_paid_ksh: bookingData.depositPaidKsh || 0,
        p_payment_method: bookingData.paymentMethod || 'unpaid'
      });
      if (error) throw new Error(error.message);
      return mapDbBooking(created);
    } catch (err: any) {
      // Map raw DB errors to user-friendly messages; do not fall back to local data
      const msg = err?.message || '';
      if (msg.includes('row-level security') || msg.includes('new row violates')) {
        throw new Error('We couldn\'t create your booking. Please try again.');
      }
      throw err;
    }
  },

  async updateBooking(id: string, updates: Partial<StaffBooking>): Promise<StaffBooking> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const db: any = {};
    if (updates.customerName !== undefined) db.customer_name = updates.customerName;
    if (updates.customerPhone !== undefined) db.customer_phone = updates.customerPhone;
    if (updates.customerEmail !== undefined) db.customer_email = updates.customerEmail;
    if (updates.serviceNames !== undefined) db.service_names = updates.serviceNames;
    if (updates.providerName !== undefined) db.provider_name = updates.providerName;
    if (updates.timeSlot !== undefined) db.time_slot = updates.timeSlot;
    if (updates.durationMinutes !== undefined) db.duration_minutes = updates.durationMinutes;
    if (updates.status !== undefined) db.status = updates.status as string;
    if (updates.paymentStatus !== undefined) db.payment_status = updates.paymentStatus as string;
    if (updates.depositPaidKsh !== undefined) db.deposit_paid_ksh = updates.depositPaidKsh;
    if (updates.remainingBalanceKsh !== undefined) db.remaining_balance_ksh = updates.remainingBalanceKsh;
    if (updates.specialRequests !== undefined) db.special_requests = updates.specialRequests;
    return this.persistToSupabase('update', id, db);
  },

  async updateBookingStatus(id: string, status: StaffBookingStatus): Promise<StaffBooking> {
    return this.updateBooking(id, { status });
  },

  async recordPayment(
    bookingId: string, 
    amountKsh: number, 
    method: 'mpesa' | 'cash' | 'card' = 'mpesa',
    receiptNumber?: string
  ): Promise<StaffBooking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const newDepositPaid = (booking.depositPaidKsh || 0) + amountKsh;
    const newRemaining = Math.max(0, booking.totalPriceKsh - newDepositPaid);
    const newPaymentStatus = newRemaining === 0 ? 'paid' : 'deposit-paid';

    return this.updateBooking(bookingId, {
      depositPaidKsh: newDepositPaid,
      remainingBalanceKsh: newRemaining,
      paymentStatus: newPaymentStatus,
      paymentMethod: method,
      mpesaReceiptNumber: receiptNumber || booking.mpesaReceiptNumber
    });
  },

  async cancelBooking(id: string, reason?: string): Promise<StaffBooking> {
    const booking = await this.getBookingById(id);
    if (!booking) throw new Error('Booking not found');

    return this.updateBooking(id, {
      status: 'cancelled',
      staffNotes: reason ? `${booking.staffNotes || ''} [Cancellation: ${reason}]`.trim() : booking.staffNotes
    });
  },

  async completeBooking(id: string): Promise<StaffBooking> {
    return this.updateBooking(id, { status: 'completed' });
  }
};