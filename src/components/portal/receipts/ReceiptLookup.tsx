// ReceiptLookup.tsx
import React, { useState, useEffect } from 'react';
import {
  ReceiptText, Search, CheckCircle2, History, CalendarClock,
  Loader2, Clock, AlertTriangle
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
import { Badge, Input, Button, StatCard, Price } from '../../ui';
import { ThemeSelect } from '../../ui/ThemeSelect';
import { ScheduleSection } from '../ui/ScheduleSection';
import { DetailField } from '../ui/DetailField';

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
  <div className="p-2.5 sm:p-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 hover:bg-muted/30 transition-colors">
    <div className="space-y-1 min-w-0 flex-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="text-[9px]">{booking.reference_number}</Badge>
        {booking.receipt_code && (
          <Badge variant="neutral" className="text-[9px]">{booking.receipt_code}</Badge>
        )}
        <Badge variant={STATUS_VARIANT[booking.status] || 'neutral'} className="text-[9px] uppercase font-bold">
          {booking.status}
        </Badge>
        <Badge variant={PAYMENT_VARIANT[booking.payment_status] || 'neutral'} className="text-[9px] uppercase font-bold">
          {booking.payment_status}
        </Badge>
      </div>
      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        {showCustomer && booking.customer_name && (
          <span className="font-semibold text-foreground">{booking.customer_name}</span>
        )}
        <span className="font-mono">{booking.date} @ {booking.time_slot}</span>
        <span className="truncate max-w-[140px]">{booking.service_names.join(', ')}</span>
        <span>· {booking.provider_name}</span>
      </div>
    </div>
    <div className="text-right shrink-0">
      <Price amount={booking.total_price_ksh} className="text-xs font-bold text-foreground" />
      <div className="text-[9px] text-muted-foreground whitespace-nowrap">
        Paid <Price amount={booking.deposit_paid_ksh} /> · Bal <Price amount={booking.remaining_balance_ksh} />
      </div>
    </div>
  </div>
);

export const ReceiptLookup: React.FC = () => {
  const { user, role } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');

  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<ReceiptBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  const [history, setHistory] = useState<ScheduleHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [providerSummary, setProviderSummary] = useState<ProviderScheduleSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [scheduleTab, setScheduleTab] = useState<'upcoming' | 'past'>('upcoming');

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
    <div className="space-y-3.5">
      {/* Header — single compact row, title+toggle share a line, wraps only if truly needed */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <ReceiptText className="w-4 h-4 text-primary shrink-0" />
          <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Receipt & Schedule Lookup</h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('lookup')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'lookup' ? 'bg-primary text-black' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Code Lookup
          </button>
          <button
            type="button"
            onClick={() => setViewMode('provider-schedule')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'provider-schedule' ? 'bg-primary text-black' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            My Schedule
          </button>
        </div>
      </div>

      {/* ============ CODE LOOKUP VIEW ============ */}
      {viewMode === 'lookup' && (
        <div className="space-y-3.5">
          <form onSubmit={handleLookup} className="p-3 rounded-xl  space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Receipt code (e.g. AB3CD4)"
                maxLength={10}
                className="flex-1 rounded-lg py-2 text-sm font-mono font-bold tracking-widest uppercase min-w-0"
                icon={<Search className="w-4 h-4" />}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-2 rounded-lg bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                {loading ? '...' : 'Retrieve'}
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
              <div className="p-3 sm:p-4 bg-secondary border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground truncate">{booking.customer_name}</span>
                      <Badge variant={PAYMENT_VARIANT[booking.payment_status] || 'neutral'} className="text-[9px] uppercase">{booking.payment_status}</Badge>
                      <Badge variant={STATUS_VARIANT[booking.status] || 'neutral'} className="text-[9px] uppercase">{booking.status}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {booking.reference_number} • <span className="text-primary font-bold">{booking.receipt_code}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={smsSending}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
                >
                  {smsSending ? 'Sending...' : 'Resend SMS'}
                </button>
              </div>

              {smsResult && (
                <div className="px-3.5 py-1.5 bg-primary/10 border-b border-primary/20 text-[11px] text-primary">
                  {smsResult}
                </div>
              )}

              {/* Details — 2 columns even on mobile, using shared DetailField */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 p-3.5">
                <DetailField label="Customer" value={booking.customer_name} />
                <DetailField
                  label="Phone"
                  value={<a href={`tel:${booking.customer_phone}`} className="hover:text-primary">{booking.customer_phone}</a>}
                  mono
                />
                <DetailField label="Appointment" value={`${booking.date} @ ${booking.time_slot}`} mono />
                <DetailField label="Barber" value={booking.provider_name} />
                <DetailField label="Total" value={`KSh ${Number(booking.total_price_ksh).toLocaleString()}`} valueClassName="text-primary font-mono" />
                <DetailField label="Paid" value={`KSh ${Number(booking.deposit_paid_ksh).toLocaleString()}`} valueClassName="text-success font-mono" />
                <DetailField label="Balance" value={`KSh ${Number(booking.remaining_balance_ksh).toLocaleString()}`} valueClassName="text-destructive font-mono" />
                {booking.mpesa_receipt_number && (
                  <DetailField label="M-Pesa Ref" value={booking.mpesa_receipt_number} mono />
                )}
              </div>
            </div>
          )}

          {/* Customer Schedule History */}
          {booking && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">Customer History</h3>
                {historyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              {historyLoading ? (
                <p className="p-6 text-center text-xs text-muted-foreground">Loading schedule history...</p>
              ) : history ? (
                <div className="divide-y divide-border/60">
                  {history.customer && (
                    <div className="p-3 bg-muted/20 grid grid-cols-4 gap-2 text-xs">
                      <DetailField label="Visits" value={history.customer.total_visits} />
                      <DetailField label="Spend" value={`KSh ${Number(history.customer.total_spend_ksh).toLocaleString()}`} valueClassName="text-primary font-mono" />
                      <DetailField label="Last Visit" value={history.customer.last_visit_date || '—'} mono />
                      <DetailField
                        label="VIP"
                        value={history.customer.vip_status ? '★ VIP' : 'Standard'}
                        valueClassName={history.customer.vip_status ? 'text-primary' : 'text-muted-foreground'}
                      />
                    </div>
                  )}

                  <div className="p-3">
                    <ScheduleSection
                      icon={<CalendarClock className="w-3.5 h-3.5 text-primary" />}
                      title="Upcoming"
                      count={history.upcoming.length}
                      emptyMessage="No upcoming appointments."
                    >
                      {history.upcoming.map(b => <ScheduleRow key={b.id} booking={b} />)}
                    </ScheduleSection>
                  </div>

                  <div className="p-3">
                    <ScheduleSection
                      icon={<History className="w-3.5 h-3.5 text-muted-foreground" />}
                      title="Past Visits"
                      count={history.past.length}
                      emptyMessage="No past visits on record."
                      scrollable
                    >
                      {history.past.map(b => <ScheduleRow key={b.id} booking={b} />)}
                    </ScheduleSection>
                  </div>
                </div>
              ) : (
                <p className="p-5 text-center text-xs text-muted-foreground">Schedule history unavailable for this customer.</p>
              )}
            </div>
          )}

          {!booking && !loading && !error && (
            <div className="p-6 text-center bg-card border border-border rounded-xl space-y-1.5">
              <ReceiptText className="w-7 h-7 text-muted-foreground mx-auto" />
              <h3 className="text-xs font-bold text-foreground">No receipt looked up yet</h3>
              <p className="text-[11px] text-muted-foreground">
                Enter a customer's 6-char receipt code above to retrieve their booking and schedule history.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============ PROVIDER SCHEDULE HISTORY VIEW ============ */}
      {viewMode === 'provider-schedule' && (
        <div className="space-y-3.5">
          {!user?.providerId ? (
            <div className="p-6 text-center bg-card border border-border rounded-xl">
              <AlertTriangle className="w-7 h-7 text-warning mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">
                No provider profile linked to your account. Contact the admin to link your provider profile.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-card p-2.5 rounded-xl border border-border flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <ThemeSelect
                  value={String(daysBack)}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className="w-full sm:w-56   px-2.5 py-1.5 text-xs text-foreground focus:outline-none "
                >
                  <option value="7">Past 7 days</option>
                  <option value="30">Past 30 days</option>
                  <option value="90">Past 90 days</option>
                  <option value="365">Past year</option>
                </ThemeSelect>
              </div>

              {summaryError && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
                  {summaryError}
                </div>
              )}

              {/* Stats — 3 columns on mobile (2 rows) instead of 2 columns (3 rows) */}
              {providerSummary && (
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                  <StatCard label="Upcoming" value={providerSummary.stats.upcoming_count} valueClassName="text-primary" />
                  <StatCard label="Completed" value={providerSummary.stats.completed} valueClassName="text-success" />
                  <StatCard label="Cancelled" value={providerSummary.stats.cancelled} valueClassName="text-destructive" />
                  <StatCard label="No-Shows" value={providerSummary.stats.no_show} valueClassName="text-warning" />
                  <StatCard label="Revenue" value={<Price amount={providerSummary.stats.total_revenue_ksh} />} />
                  <StatCard label="Total Past" value={providerSummary.stats.total_past} />
                </div>
              )}

              {summaryLoading ? (
  <div className="p-8 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-1.5">
    <Loader2 className="w-5 h-5 animate-spin text-primary" />
    <p className="text-xs text-muted-foreground">Loading schedule history...</p>
  </div>
) : providerSummary ? (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    {/* Tab bar */}
    <div className="flex border-b border-border">
      <button
        type="button"
        onClick={() => setScheduleTab('upcoming')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors ${
          scheduleTab === 'upcoming'
            ? 'text-primary border-b-2 border-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <CalendarClock className="w-3.5 h-3.5" />
        Upcoming ({providerSummary.upcoming.length})
      </button>
      <button
        type="button"
        onClick={() => setScheduleTab('past')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors ${
          scheduleTab === 'past'
            ? 'text-primary border-b-2 border-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <History className="w-3.5 h-3.5" />
        History ({providerSummary.past.length})
      </button>
    </div>

    {/* Tab content */}
    {scheduleTab === 'upcoming' ? (
      providerSummary.upcoming.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">No upcoming appointments scheduled.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {providerSummary.upcoming.map(b => <ScheduleRow key={b.id} booking={b} showCustomer />)}
        </div>
      )
    ) : (
      providerSummary.past.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">No historical bookings in this period.</p>
      ) : (
        <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
          {providerSummary.past.map(b => <ScheduleRow key={b.id} booking={b} showCustomer />)}
        </div>
      )
    )}
  </div>
) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};