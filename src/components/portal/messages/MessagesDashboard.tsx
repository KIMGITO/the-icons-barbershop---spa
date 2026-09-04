import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, RefreshCw, CheckCircle2, XCircle, Clock, Phone, User, ReceiptText, Send } from 'lucide-react';
import { smsService, SmsMessageRecord } from '../../../services/smsService';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';

export const MessagesDashboard: React.FC = () => {
  const [messages, setMessages] = useState<SmsMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [smsTypeFilter, setSmsTypeFilter] = useState('all');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await smsService.getMessages({
        search: searchQuery,
        status: statusFilter,
        smsType: smsTypeFilter
      });
      setMessages(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, smsTypeFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

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

  const handleResend = async (msgId: string) => {
    setResendingId(msgId);
    try {
      await smsService.resendSms(msgId);
      await loadMessages();
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
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">SMS Messages Log</h1>
            <p className="text-xs text-muted-foreground">All receipt & booking SMS sent to customers via Africa's Talking</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by phone, name, receipt code..."
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
          value={smsTypeFilter}
          onChange={e => setSmsTypeFilter(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          <option value="receipt">Receipt</option>
          <option value="booking">Booking</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-muted-foreground">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No SMS messages found</h3>
          <p className="text-xs text-muted-foreground">Receipt and booking SMS will appear here once sent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
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
          ))}
        </div>
      )}
    </div>
  );
};