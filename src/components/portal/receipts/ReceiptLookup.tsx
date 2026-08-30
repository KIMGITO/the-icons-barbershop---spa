import React, { useState } from 'react';
import { ReceiptText, Search, CheckCircle2 } from 'lucide-react';
import { receiptService, ReceiptBooking } from '../../../services/receiptService';
import { smsService } from '../../../services/smsService';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';

export const ReceiptLookup: React.FC = () => {
  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<ReceiptBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Please enter a receipt code (4+ characters).');
      return;
    }
    setLoading(true);
    setError(null);
    setSmsResult(null);
    try {
      const found = await receiptService.getBookingByReceiptCode(code);
      setBooking(found);
      if (!found) setError(`No booking found for code "${code.trim().toUpperCase()}".`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Receipt Lookup</h1>
            <p className="text-xs text-muted-foreground">Enter the customer's 6-digit receipt code to instantly retrieve booking & payment details</p>
          </div>
        </div>
      </div>

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
                  <Badge variant="success" className="text-[10px] uppercase">{booking.payment_status}</Badge>
                  <Badge variant={booking.status === 'confirmed' ? 'primary' : 'neutral'} className="text-[10px] uppercase">{booking.status}</Badge>
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
              {smsSending ? 'Sending...' : 'Send Receipt SMS'}
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

      {!booking && !loading && !error && (
        <div className="p-8 text-center bg-card border border-border rounded-xl space-y-2">
          <ReceiptText className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No receipt looked up yet</h3>
          <p className="text-xs text-muted-foreground">Enter a customer's 6-digit receipt code above to retrieve their booking, service and payment details instantly.</p>
        </div>
      )}
    </div>
  );
};