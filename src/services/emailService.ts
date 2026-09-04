import { supabase } from '../lib/supabase';

export interface EmailLogRecord {
  id: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  email_type: string;
  status: 'pending' | 'sent' | 'failed';
  provider: string;
  provider_message_id?: string;
  error_message?: string;
  metadata?: any;
  created_at: string;
  sent_at?: string;
}

export const emailService = {
  async getLogs(filters: {
    search?: string;
    status?: string;
    emailType?: string;
  } = {}) {
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.emailType && filters.emailType !== 'all') {
      query = query.eq('email_type', filters.emailType);
    }

    if (filters.search) {
      query = query.or(`recipient_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return data as EmailLogRecord[];
  },

  async resendEmail(logId: string) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { retryLogId: logId }
    });
    if (error) throw error;
    return data;
  },

  async sendCustomEmail(to: string, subject: string, content: string, cta?: { text: string, url: string }) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, content, cta }
    });
    if (error) throw error;
    return data;
  }
};
