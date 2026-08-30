import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SmsMessageRecord {
  id: string;
  booking_id: string | null;
  receipt_code: string | null;
  to_phone: string;
  customer_name: string | null;
  message_body: string;
  sms_type: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export const smsService = {
  async sendSms(params: {
    bookingId?: string;
    receiptCode?: string;
    phoneNumber?: string;
    customerName?: string;
    message?: string;
    smsType?: string;
  }): Promise<{ success: boolean; status: string; messageId?: string; message?: string; error?: string }> {
    if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, 600));
      return { success: true, status: 'sent', message: 'SMS simulated in local dev (Africa\'s Talking not configured).' };
    }
    const session = await supabase.auth.getSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/send-sms';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send SMS.');
    return data;
  },

  async getMessages(filter?: { search?: string; status?: string; smsType?: string }): Promise<SmsMessageRecord[]> {
    if (!isSupabaseConfigured) return [];
    let query = supabase.from('sms_messages').select('*').order('created_at', { ascending: false }).limit(500);
    if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);
    if (filter?.smsType && filter.smsType !== 'all') query = query.eq('sms_type', filter.smsType);
    let { data, error } = await query;
    if (error) throw new Error(error.message);
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.toLowerCase();
      data = (data || []).filter(m =>
        (m.to_phone || '').toLowerCase().includes(q) ||
        (m.customer_name || '').toLowerCase().includes(q) ||
        (m.receipt_code || '').toLowerCase().includes(q) ||
        (m.message_body || '').toLowerCase().includes(q)
      );
    }
    return data || [];
  },

  async sendReceiptByBooking(bookingId: string): Promise<{ success: boolean; status: string; messageId?: string; message?: string; error?: string }> {
    return this.sendSms({ bookingId, smsType: 'receipt' });
  }
};