import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, RefreshCw, CheckCircle2, XCircle, Clock, Phone, User, ReceiptText, Send, Mail, Info } from 'lucide-react';
import { smsService, SmsMessageRecord } from '../../../services/smsService';
import { emailService, EmailLogRecord } from '../../../services/emailService';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';

export const MessagesDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms');
  const [messages, setMessages] = useState<SmsMessageRecord[]>([]);
  const [emails, setEmails] = useState<EmailLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'sms') {
        const list = await smsService.getMessages({
          search: searchQuery,
          status: statusFilter,
          smsType: typeFilter
        });
        setMessages(list);
      } else {
        const list = await emailService.getLogs({
          search: searchQuery,
          status: statusFilter,
          emailType: typeFilter
        });
        setEmails(list);
      }
    } catch (err: any) {
      setError(err.message || `Failed to load ${activeTab} messages.`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatPhone = (p: string) => {
    if (!p) return '—';
    if (p.startsWith('254')) return `+${p}`;
    return p;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      if (activeTab === 'sms') {
        await smsService.resendSms(id);
      } else {
        await emailService.resendEmail(id);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resend message');
    } finally {
      setResendingId(null);
    }
  };

  const statusBadge = (status: string) => (
    <Badge
      variant={status === 'sent' ? 'success' : status === 'failed' ? 'destructive' : 'neutral'}
      className="text-[10px] uppercase font-bold"
    >
      {status === 'sent' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : status === 'failed' ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {activeTab === 'sms' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Communications Log</h1>
            <p className="text-xs text-muted-foreground">All receipt, booking & invitation messages sent to customers & staff</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-1 bg-muted/50 rounded-xl border border-border w-fit">
        <button
          onClick={() => { setActiveTab('sms'); setTypeFilter('all'); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'sms' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          SMS
        </button>
        <button
          onClick={() => { setActiveTab('email'); setTypeFilter('all'); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'email' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'sms' ? "Search by phone, name, receipt code..." : "Search by email, subject..."}
          className="rounded-lg py-1.5 text-xs"
          icon={<Search className="w-3.5 h-3.5" />}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          {activeTab === 'sms' ? (
            <>
              <option value="receipt">Receipt</option>
              <option value="booking">Booking</option>
            </>
          ) : (
            <>
              <option value="invitation">Invitation</option>
              <option value="notification">Notification</option>
              <option value="receipt">Receipt</option>
            </>
          )}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-muted-foreground">Loading {activeTab} messages...</div>
      ) : activeTab === 'sms' && messages.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No SMS messages found</h3>
          <p className="text-xs text-muted-foreground">Receipt and booking SMS will appear here once sent.</p>
        </div>
      ) : activeTab === 'email' && emails.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <Mail className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Emails found</h3>
          <p className="text-xs text-muted-foreground">Invitation and notification emails will appear here once sent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'sms' ? messages.map(msg => (
            <div key={msg.id} className="p-4 bg-card border border-border rounded-xl space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(msg.status)}
                    <Badge variant="neutral" className="text-[10px] uppercase">
                      {msg.sms_type || 'receipt'}
                    </Badge>
                    {msg.receipt_code && (
                      <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        <ReceiptText className="w-3 h-3 inline mr-1" />
                        {msg.receipt_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3 h-3 text-primary" />
                    <span className="font-semibold text-foreground">{msg.customer_name || 'Guest'}</span>
                    <Phone className="w-3 h-3 text-primary ml-1" />
                    <a href={`tel:${msg.to_phone}`} className="font-mono text-muted-foreground hover:text-primary">{formatPhone(msg.to_phone)}</a>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(msg.created_at)}</span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 border border-border/60 rounded-lg p-2.5 whitespace-pre-line">
                {msg.message_body}
              </p>

              <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  {msg.provider_message_id && <span className="font-mono">ID: {msg.provider_message_id}</span>}
                  {msg.error_message && <span className="text-destructive">{msg.error_message}</span>}
                </div>
                {msg.status === 'failed' && (
                  <button
                    onClick={() => handleResend(msg.id)}
                    disabled={resendingId === msg.id}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {resendingId === msg.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Resend
                  </button>
                )}
              </div>
            </div>
          )) : emails.map(email => (
            <div key={email.id} className="p-4 bg-card border border-border rounded-xl space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(email.status)}
                    <Badge variant="neutral" className="text-[10px] uppercase">
                      {email.email_type || 'notification'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3 h-3 text-primary" />
                    <span className="font-semibold text-foreground truncate">{email.recipient_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Info className="w-3 h-3" />
                    {email.subject}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(email.created_at)}</span>
              </div>

              {/* Email Content Preview (Raw HTML stripped or handled) */}
              <div 
                className="text-xs text-muted-foreground leading-relaxed bg-muted/30 border border-border/60 rounded-lg p-2.5 max-h-32 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />

              <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  {email.provider_message_id && <span className="font-mono">ID: {email.provider_message_id}</span>}
                  {email.error_message && <span className="text-destructive font-semibold">Error: {email.error_message}</span>}
                </div>
                {email.status === 'failed' && (
                  <button
                    onClick={() => handleResend(email.id)}
                    disabled={resendingId === email.id}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {resendingId === email.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Resend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
