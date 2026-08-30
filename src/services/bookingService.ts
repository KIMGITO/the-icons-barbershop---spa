import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StaffBooking, StaffBookingStatus } from '../types/staff';
import { paymentService } from './paymentService';

const BOOKINGS_STORAGE_KEY = 'theicons_staff_bookings';

const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const createInitialStaffBookings = (): StaffBooking[] => {
  const today = getRelativeDate(0);
  const tomorrow = getRelativeDate(1);
  const nextDay = getRelativeDate(2);
  const yesterday = getRelativeDate(-1);

  return [
    {
      id: 'staff-bk-101',
      referenceNumber: 'ICN-9201',
      customerName: 'John Kamau',
      customerPhone: '0722 100 200',
      customerEmail: 'john.kamau@gmail.com',
      serviceIds: ['serv-1'],
      serviceNames: ['Classic Icon Haircut'],
      providerId: 'provider-1',
      providerName: 'Samuel Mwangi',
      date: today,
      timeSlot: '10:00 AM',
      durationMinutes: 45,
      totalPriceKsh: 1500,
      depositPaidKsh: 750,
      remainingBalanceKsh: 750,
      status: 'confirmed',
      paymentStatus: 'deposit-paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88219L',
      specialRequests: 'Prefers low taper and cooling scalp tonic.',
      createdAt: `${today}T08:15:00Z`
    },
    {
      id: 'staff-bk-102',
      referenceNumber: 'ICN-9202',
      customerName: 'Mary Wanjiku',
      customerPhone: '0733 456 789',
      customerEmail: 'mary.wanjiku@safari.ke',
      serviceIds: ['serv-5'],
      serviceNames: ['Executive Manicure & Hand Therapy'],
      providerId: 'provider-3',
      providerName: 'David Njenga',
      date: today,
      timeSlot: '11:30 AM',
      durationMinutes: 40,
      totalPriceKsh: 1800,
      depositPaidKsh: 900,
      remainingBalanceKsh: 900,
      status: 'confirmed',
      paymentStatus: 'deposit-paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88244M',
      specialRequests: 'First time visitor; requested quiet suite.',
      createdAt: `${today}T09:00:00Z`
    },
    {
      id: 'staff-bk-103',
      referenceNumber: 'ICN-9203',
      customerName: 'Kiplagat Tanui',
      customerPhone: '0712 998 877',
      customerEmail: 'kiplagat.t@outlook.com',
      serviceIds: ['serv-3', 'serv-8'],
      serviceNames: ['Royal Hot Towel Beard Sculpting', 'Traditional Straight Razor Hot Lather Shave'],
      providerId: 'provider-2',
      providerName: 'James Mwangi',
      date: today,
      timeSlot: '02:00 PM',
      durationMinutes: 60,
      totalPriceKsh: 2800,
      depositPaidKsh: 1400,
      remainingBalanceKsh: 1400,
      status: 'pending',
      paymentStatus: 'deposit-paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88301T',
      specialRequests: 'Allergic to synthetic scents, use organic sandalwood only.',
      createdAt: `${today}T10:30:00Z`
    },
    {
      id: 'staff-bk-104',
      referenceNumber: 'ICN-9204',
      customerName: 'Brian Kiprono',
      customerPhone: '0720 554 433',
      customerEmail: 'b.kiprono@apex.ke',
      serviceIds: ['serv-4'],
      serviceNames: ['Moroccan Scalp Detox & Hair Spa'],
      providerId: 'provider-4',
      providerName: 'Brian Mutua',
      date: today,
      timeSlot: '04:30 PM',
      durationMinutes: 50,
      totalPriceKsh: 2800,
      depositPaidKsh: 2800,
      remainingBalanceKsh: 0,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88390P',
      specialRequests: 'Full session prepaid.',
      createdAt: `${today}T11:00:00Z`
    },
    {
      id: 'staff-bk-105',
      referenceNumber: 'ICN-9205',
      customerName: 'Eng. Joshua Kamau',
      customerPhone: '0722 888 999',
      customerEmail: 'joshua.kamau@horizontech.ke',
      serviceIds: ['serv-6'],
      serviceNames: ['The CEO Signature Experience'],
      providerId: 'provider-1',
      providerName: 'Samuel Mwangi',
      date: tomorrow,
      timeSlot: '11:00 AM',
      durationMinutes: 100,
      totalPriceKsh: 6500,
      depositPaidKsh: 3250,
      remainingBalanceKsh: 3250,
      status: 'confirmed',
      paymentStatus: 'deposit-paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88450K',
      specialRequests: 'Board meeting preparation. Executive espresso on arrival.',
      createdAt: `${today}T12:00:00Z`
    },
    {
      id: 'staff-bk-106',
      referenceNumber: 'ICN-9206',
      customerName: 'Dennis Mutunga',
      customerPhone: '0711 223 344',
      customerEmail: 'dennis.m@gmail.com',
      serviceIds: ['serv-2'],
      serviceNames: ['Executive Skin Fade & Taper'],
      providerId: 'provider-4',
      providerName: 'Brian Mutua',
      date: nextDay,
      timeSlot: '01:30 PM',
      durationMinutes: 50,
      totalPriceKsh: 1800,
      depositPaidKsh: 900,
      remainingBalanceKsh: 900,
      status: 'confirmed',
      paymentStatus: 'deposit-paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88510A',
      createdAt: `${today}T13:00:00Z`
    },
    {
      id: 'staff-bk-107',
      referenceNumber: 'ICN-9200',
      customerName: 'Felix Ouma',
      customerPhone: '0724 112 233',
      customerEmail: 'felix.ouma@gmail.com',
      serviceIds: ['serv-1', 'serv-3'],
      serviceNames: ['Classic Icon Haircut', 'Royal Hot Towel Beard Sculpting'],
      providerId: 'provider-2',
      providerName: 'James Mwangi',
      date: yesterday,
      timeSlot: '03:00 PM',
      durationMinutes: 80,
      totalPriceKsh: 2700,
      depositPaidKsh: 2700,
      remainingBalanceKsh: 0,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: 'ICN88100Q',
      createdAt: `${yesterday}T09:00:00Z`
    }
  ];
};

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
   * Used by the client-facing booking flow to disable taken times.
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
   * Public booking lookup by reference (no login) for "my booking" status.
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
   * Get all bookings, optionally filtered
   * Drop-in replacement for supabase.from('bookings').select('*')
   */
  async getBookings(filter?: { 
    date?: string; 
    providerId?: string; 
    status?: StaffBookingStatus | 'all'; 
  }): Promise<StaffBooking[]> {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: false });
      if (filter?.date) query = query.eq('date', filter.date);
      if (filter?.providerId && filter.providerId !== 'all') query = query.eq('provider_id', filter.providerId);
      if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const mapped = (data || []).map(mapDbBooking);
      return mapped;
    }
    await new Promise(r => setTimeout(r, 150));
    let list: StaffBooking[] = [];
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch {}

    if (list.length === 0) {
      list = createInitialStaffBookings();
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(list));
    }

    if (filter) {
      if (filter.date) {
        list = list.filter(b => b.date === filter.date);
      }
      if (filter.providerId && filter.providerId !== 'all') {
        list = list.filter(b => b.providerId === filter.providerId);
      }
      if (filter.status && filter.status !== 'all') {
        list = list.filter(b => b.status === filter.status);
      }
    }

    // Sort descending by date & time
    return list.sort((a, b) => `${b.date} ${b.timeSlot}`.localeCompare(`${a.date} ${a.timeSlot}`));
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
    if (isSupabaseConfigured) {
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
        // Fall back to direct insert if RPC not available
        console.warn('create_booking RPC failed, falling back to direct insert:', err.message);
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        return this.persistToSupabase('insert', undefined, {
          reference_number: 'ICN-' + randomCode,
          customer_name: bookingData.customerName,
          customer_phone: bookingData.customerPhone,
          customer_email: bookingData.customerEmail,
          service_ids: bookingData.serviceIds,
          service_names: bookingData.serviceNames,
          provider_id: bookingData.providerId,
          provider_name: bookingData.providerName,
          date: bookingData.date,
          time_slot: bookingData.timeSlot,
          duration_minutes: bookingData.durationMinutes,
          total_price_ksh: bookingData.totalPriceKsh,
          deposit_paid_ksh: bookingData.depositPaidKsh,
          remaining_balance_ksh: bookingData.remainingBalanceKsh,
          status: bookingData.status,
          payment_status: bookingData.paymentStatus,
          payment_method: bookingData.paymentMethod
        });
      }
    }
    await new Promise(r => setTimeout(r, 250));
    const all = await this.getBookings();
    const id = `staff-bk-${Date.now()}`;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `ICN-${randomCode}`;

    const depositCalc = paymentService.calculateDeposit(bookingData.totalPriceKsh, bookingData.depositPaidKsh);

    const newBooking: StaffBooking = {
      ...bookingData,
      id,
      referenceNumber,
      depositPaidKsh: depositCalc.totalKsh - depositCalc.remainingKsh,
      remainingBalanceKsh: depositCalc.remainingKsh,
      paymentStatus: depositCalc.remainingKsh === 0 
        ? 'paid' 
        : depositCalc.totalKsh - depositCalc.remainingKsh > 0 
        ? 'deposit-paid' 
        : 'unpaid',
      createdAt: new Date().toISOString()
    };

    const updated = [newBooking, ...all];
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
    return newBooking;
  },

  async updateBooking(id: string, updates: Partial<StaffBooking>): Promise<StaffBooking> {
    if (isSupabaseConfigured) {
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
    }
    await new Promise(r => setTimeout(r, 200));
    const all = await this.getBookings();
    const index = all.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Booking record not found');

    const current = all[index];
    const updatedBooking: StaffBooking = {
      ...current,
      ...updates
    };

    all[index] = updatedBooking;
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(all));
    return updatedBooking;
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
