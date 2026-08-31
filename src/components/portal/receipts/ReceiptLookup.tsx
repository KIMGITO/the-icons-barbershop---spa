import React, { useState, useEffect } from 'react';
import {
  ReceiptText, Search, CheckCircle2, History, CalendarClock,
  User, Phone, Loader2, TrendingUp, Clock, AlertTriangle
} from 'lucide-react';
import {
  receiptService,
  ReceiptBooking,
  ScheduleHistory,
  ScheduleBooking,
  ProviderScheduleSummary
} from '../../../services/receiptService';
import { smsService } from '../../../services/smsService';
import { useAuthStore } from '../../../stores/authStore';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { ThemeSelect } from '../../ui/ThemeSelect';

type ViewMode = 'lookup' | 'provider-schedule';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral' | 'primary'> = {
  confirmed: 'primary',
  completed: 'success',
  pending: 'warning',
  cancelled: 'destructive',
  'no-show': 'destructive',
};

const PAYMENT_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  paid: 'success',
  'deposit-paid': 'warning',
  unpaid: 'destructive',
  pending: 'warning',
  refunded: 'neutral',
};

const ScheduleRow: React.FC<{ booking: ScheduleBooking; showCustomer?: boolean }> = ({ booking, showCustomer }) => (
  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors">
    <div className="space-y-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px] font-bold text-primary bg-secondary px-2 py-0.5 rounded border border-border">
          {booking.reference_number}
        </span>
        {booking.receipt_code && (
          <span className="font-mono text-[10px] text-foreground bg-muted px-1.5 py-0.5 rounded">
            {booking.receipt_code}
          </span>
        )}
        <Badge variant={STATUS_VARIANT[booking.status] || 'neutral'} className="text-[9px] uppercase font-bold">
          {booking.status}
        </Badge>
        <Badge variant={PAYMENT_VARIANT[booking.payment_status] || 'neutral'} className="text-[9px] uppercase font-bold">
          {booking.payment_status}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {showCustomer && booking.customer_name && (
          <span className="font-semibold text-foreground">{booking.customer_name}</span>
        )}
        <span className="font-mono">{booking.date} @ {booking.time_slot}</span>
        <span>{booking.duration_minutes} min</span>
        <span className="truncate">{booking.service_names.join(', ')}</span>
        <span>with {booking.provider_name}</span>
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="text-xs font-mono font-bold text-foreground">
        KSh {Number(booking.total_price_ksh).toLocaleString()}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Paid: KSh {Number(booking.deposit_paid_ksh).toLocaleString()} · Bal: KSh {Number(booking.remaining_balance_ksh).toLocaleString()}
      </div>
    </div>
  </div>
);

export const ReceiptLookup: React.FC = () => {
  const { user, role } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');

  // Lookup state
  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<ReceiptBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  // Schedule history state (auto-loaded after a successful lookup)
  const [history, setHistory] = useState<ScheduleHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Provider schedule summary state
  const [providerSummary, setProviderSummary] = useState<ProviderScheduleSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  // Load provider schedule summary when the tab is opened
  useEffect(() => {
    if (viewMode !== 'provider-schedule' || !user?.providerId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    receiptService.getProviderScheduleSummary(user.providerId, daysBack)
      .then(setProviderSummary)
      .catch(err => setSummaryError(err.message || 'Failed to load schedule summary.'))
      .finally(() => setSummaryLoading(false));
  }, [viewMode, user?.providerId, daysBack]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Please enter a receipt code (4+ characters).');
      return;
    }
    setLoading(true);
    setError(null);
    setSmsResult(null);
    setHistory(null);
    try {
      const found = await receiptService.getBookingByReceiptCode(code);
      setBooking(found);
      if (!found) {
        setError(`No booking found for code "${code.trim().toUpperCase()}".`);
      } else if (found.customer_phone) {
        // Auto-load the customer's schedule history
        setHistoryLoading(true);
        receiptService.getCustomerScheduleHistory(found.customer_phone)
          .then(setHistory)
          .catch(() => setHistory(null))
          .finally(() => setHistoryLoading(false));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to look up receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async () => {
    if (!booking) return;
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await smsService.sendReceiptByBooking(booking.booking_id);
      setSmsResult(res.success ? `Receipt SMS sent (${res.message || 'success'})` : 'Receipt SMS failed to send.');
    } catch (err: any) {
      setSmsResult(err.message || 'Failed to send SMS.');
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Receipt & Schedule Lookup</h1>
            <p className="text-xs text-muted-foreground">
              Enter the customer's 6-char code to retrieve booking details and their full schedule history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('lookup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'lookup' ? 'bg-primary text-black' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Code Lookup
          </button>
          <button
            type="button"
            onClick={() => setViewMode('provider-schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'provider-schedule' ? 'bg-primary text-black' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            My Schedule History
          </button>
        </div>
      </div>

      {/* ============ CODE LOOKUP VIEW ============ */}
      {viewMode === 'lookup' && (
        <div className="space-y-4">
          <form onSubmit={handleLookup} className="bg-card p-4 rounded-xl border border-border space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Enter receipt code (e.g. AB3CD4)"
                maxLength={10}
                className="flex-1 rounded-lg py-2 text-sm font-mono font-bold tracking-widest uppercase"
                icon={<Search className="w-4 h-4" />}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Looking up...' : 'Retrieve'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>

          {booking && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 bg-secondary border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{booking.customer_name}</span>
                      <Badge variant={PAYMENT_VARIANT[booking.payment_status] || 'neutral'} className="text-[10px] uppercase">{booking.payment_status}</Badge>
                      <Badge variant={STATUS_VARIANT[booking.status] || 'neutral'} className="text-[10px] uppercase">{booking.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {booking.reference_number} • Receipt: <span className="text-primary font-bold">{booking.receipt_code}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={smsSending}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  {smsSending ? 'Sending...' : 'Resend Receipt SMS'}
                </button>
              </div>

              {smsResult && (
                <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-primary">
                  {smsResult}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-xs">
                <div className="space-y-2.5">
                  <div><span className="text-muted-foreground">Customer:</span> <span className="font-semibold text-foreground">{booking.customer_name}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${booking.customer_phone}`} className="font-mono font-semibold text-foreground hover:text-primary">{booking.customer_phone}</a></div>
                  <div><span className="text-muted-foreground">Appointment:</span> <span className="font-mono font-semibold text-foreground">{booking.date} @ {booking.time_slot} ({booking.duration_minutes} min)</span></div>
                  <div><span className="text-muted-foreground">Barber:</span> <span className="font-semibold text-foreground">{booking.provider_name}</span></div>
                </div>
                <div className="space-y-2.5">
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-mono font-bold text-primary">KSh {Number(booking.total_price_ksh).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Paid:</span> <span className="font-mono font-bold text-success">KSh {Number(booking.deposit_paid_ksh).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-mono font-bold text-destructive">KSh {Number(booking.remaining_balance_ksh).toLocaleString()}</span></div>
                  {booking.mpesa_receipt_number && <div><span className="text-muted-foreground">M-Pesa Ref:</span> <span className="font-mono text-foreground">{booking.mpesa_receipt_number}</span></div>}
                </div>
              </div>
            </div>
          )}

          {/* Customer Schedule History */}
          {booking && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2.5">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Customer Schedule History</h3>
                {historyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              {historyLoading ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">Loading schedule history...</p>
                </div>
              ) : history ? (
                <div className="divide-y divide-border/60">
                  {/* Customer profile summary */}
                  {history.customer && (
                    <div className="p-4 bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Total Visits</span>
                        <span className="font-mono font-bold text-foreground">{history.customer.total_visits}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Lifetime Spend</span>
                        <span className="font-mono font-bold text-primary">KSh {Number(history.customer.total_spend_ksh).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Last Visit</span>
                        <span className="font-mono font-semibold text-foreground">{history.customer.last_visit_date || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">VIP</span>
                        <span className={`font-bold ${history.customer.vip_status ? 'text-primary' : 'text-muted-foreground'}`}>
                          {history.customer.vip_status ? '★ VIP Client' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Upcoming */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarClock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        Upcoming ({history.upcoming.length})
                      </span>
                    </div>
                    {history.upcoming.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No upcoming appointments.</p>
                    ) : (
                      <div className="bg-card border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
                        {history.upcoming.map(b => <ScheduleRow key={b.id} booking={b} />)}
                      </div>
                    )}
                  </div>

                  {/* Past */}
                  <div className="p-4 pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        Past Visits ({history.past.length})
                      </span>
                    </div>
                    {history.past.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No past visits on record.</p>
                    ) : (
                      <div className="bg-card border border-border rounded-xl divide-y divide-border/60 overflow-hidden max-h-72 overflow-y-auto">
                        {history.past.map(b => <ScheduleRow key={b.id} booking={b} />)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">Schedule history unavailable for this customer.</p>
                </div>
              )}
            </div>
          )}

          {!booking && !loading && !error && (
            <div className="p-8 text-center bg-card border border-border rounded-xl space-y-2">
              <ReceiptText className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No receipt looked up yet</h3>
              <p className="text-xs text-muted-foreground">
                Enter a customer's 6-char receipt code above to retrieve their booking, payment details,
                and full schedule history instantly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============ PROVIDER SCHEDULE HISTORY VIEW ============ */}
      {viewMode === 'provider-schedule' && (
        <div className="space-y-4">
          {!user?.providerId ? (
            <div className="p-8 text-center bg-card border border-border rounded-xl">
              <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No provider profile linked to your account. Contact the admin to link your provider profile.
              </p>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="bg-card p-3.5 rounded-xl border border-border flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <ThemeSelect
                  value={String(daysBack)}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className="w-full sm:w-56 bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="7">Past 7 days</option>
                  <option value="30">Past 30 days</option>
                  <option value="90">Past 90 days</option>
                  <option value="365">Past year</option>
                </ThemeSelect>
              </div>

              {summaryError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
                  {summaryError}
                </div>
              )}

              {/* Stats */}
              {providerSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming</span>
                    <div className="text-xl font-mono font-extrabold text-primary">{providerSummary.stats.upcoming_count}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
                    <div className="text-xl font-mono font-extrabold text-success">{providerSummary.stats.completed}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancelled</span>
                    <div className="text-xl font-mono font-extrabold text-destructive">{providerSummary.stats.cancelled}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No-Shows</span>
                    <div className="text-xl font-mono font-extrabold text-warning">{providerSummary.stats.no_show}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
                    <div className="text-xl font-mono font-extrabold text-foreground">
                      KSh {Number(providerSummary.stats.total_revenue_ksh).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Past</span>
                    <div className="text-xl font-mono font-extrabold text-foreground">{providerSummary.stats.total_past}</div>
                  </div>
                </div>
              )}

              {summaryLoading ? (
                <div className="p-10 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading schedule history...</p>
                </div>
              ) : providerSummary ? (
                <>
                  {/* Upcoming schedule */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2.5">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Upcoming Schedule ({providerSummary.upcoming.length})</h3>
                    </div>
                    {providerSummary.upcoming.length === 0 ? (
                      <p className="p-6 text-center text-xs text-muted-foreground">No upcoming appointments scheduled.</p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {providerSummary.upcoming.map(b => <ScheduleRow key={b.id} booking={b} showCustomer />)}
                      </div>
                    )}
                  </div>

                  {/* Past schedule */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2.5">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-bold text-foreground">Historical Schedule ({providerSummary.past.length})</h3>
                    </div>
                    {providerSummary.past.length === 0 ? (
                      <p className="p-6 text-center text-xs text-muted-foreground">No historical bookings in this period.</p>
                    ) : (
                      <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                        {providerSummary.past.map(b => <ScheduleRow key={b.id} booking={b} showCustomer />)}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};