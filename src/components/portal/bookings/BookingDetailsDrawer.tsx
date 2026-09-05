import React, { useState } from 'react';
import { 
  X, Calendar, Clock, User, Phone, Mail, Scissors, CreditCard, 
  CheckCircle2, XCircle, AlertCircle, FileText, Smartphone 
} from 'lucide-react';
import { StaffBooking, StaffBookingStatus } from '../../../types/staff';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { paymentService } from '../../../services/paymentService';
import { MpesaPaymentModal } from '../payments/MpesaPaymentModal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface BookingDetailsDrawerProps {
  booking: StaffBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingDetailsDrawer: React.FC<BookingDetailsDrawerProps> = ({
  booking,
  isOpen,
  onClose
}) => {
  if (!isOpen || !booking) return null;

  const { role, user } = useAuthStore();
  const { updateBookingStatus, cancelBooking, recordPayment } = useBookingStore();
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [cancelPromptOpen, setCancelPromptOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isAdmin = role === 'admin';
  const isAssignedProvider = user?.providerId === booking.providerId;
  const canUpdateStatus = isAdmin || isAssignedProvider;

  const depositBreakdown = paymentService.calculateDeposit(
    booking.totalPriceKsh, 
    booking.depositPaidKsh || 0
  );

  const getStatusBadge = (status: StaffBookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Confirmation</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'no-show':
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid in Full</Badge>;
      case 'deposit-paid':
        return <Badge variant="primary">50% Deposit Paid</Badge>;
      case 'unpaid':
      default:
        return <Badge variant="warning">Unpaid</Badge>;
    }
  };

  const handleConfirm = async () => {
    await updateBookingStatus(booking.id, 'confirmed');
  };

  const handleComplete = async () => {
    await updateBookingStatus(booking.id, 'completed');
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await cancelBooking(booking.id, cancelReason);
    setCancelPromptOpen(false);
    setCancelReason('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
        <div 
          className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">
                  {booking.referenceNumber}
                </span>
                {getStatusBadge(booking.status)}
              </div>
              <h2 className="text-base font-bold text-foreground">
                Appointment Details
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-5 flex-1">
            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5">
              <div className="text-[10px]  uppercase tracking-wider text-muted-foreground">
                Client Information
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {booking.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {booking.customerName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {booking.customerEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border/60 text-xs">
                <a 
                  href={`tel:${booking.customerPhone}`}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{booking.customerPhone}</span>
                </a>
                <a
                  href={`mailto:${booking.customerEmail}`}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>

              {booking.specialRequests && (
                <div className="mt-2 text-xs bg-card p-2 rounded-lg border border-border/80">
                  <span className="font-semibold text-primary block text-[10px] uppercase">Special Notes:</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{booking.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Service & Provider */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Service & Assignment
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      {booking.serviceNames.join(' + ')}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-primary" />
                      Assigned Provider: <strong className="text-foreground">{booking.providerName}</strong>
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">
                    KSh {booking.totalPriceKsh.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-foreground">{booking.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-foreground">{booking.timeSlot} ({booking.durationMinutes} min)</span>
                </div>
              </div>
            </div>

            {/* Financials & 50% Deposit Status */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Financials & Deposit
                </span>
                {getPaymentBadge(booking.paymentStatus)}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Service Fee:</span>
                  <span className="font-bold text-foreground">KSh {booking.totalPriceKsh.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Required 50% Deposit:</span>
                  <span className="font-semibold text-foreground">KSh {depositBreakdown.minimumDepositKsh.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deposit Collected:</span>
                  <span className={`font-semibold ${booking.depositPaidKsh > 0 ? 'text-success' : 'text-foreground'}`}>
                    KSh {(booking.depositPaidKsh || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
                  <span className="text-foreground">Remaining at Checkout:</span>
                  <span className={`font-mono ${booking.remainingBalanceKsh === 0 ? 'text-success' : 'text-primary'}`}>
                    KSh {(booking.remainingBalanceKsh || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {booking.mpesaReceiptNumber && (
                <div className="bg-input p-2 rounded-lg border border-border text-[11px] font-mono flex items-center justify-between">
                  <span className="text-muted-foreground">M-Pesa Receipt:</span>
                  <span className="text-primary font-bold">{booking.mpesaReceiptNumber}</span>
                </div>
              )}

              {/* Deposit Payment Button */}
              {booking.remainingBalanceKsh > 0 && isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMpesaModalOpen(true)}
                  className="w-full text-xs mt-2"
                >
                  <Smartphone className="w-3.5 h-3.5 text-success mr-1.5" />
                  <span>Record M-Pesa Deposit / Payment</span>
                </Button>
              )}
            </div>

            {/* Cancel reason prompt if open */}
            {cancelPromptOpen && (
              <form onSubmit={handleCancelSubmit} className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2.5">
                <span className="text-xs font-bold text-destructive block">
                  Provide Cancellation Reason:
                </span>
                <Input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Client requested reschedule via phone"
                  className="text-xs rounded-lg p-2"
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelPromptOpen(false)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    Confirm Cancellation
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="sticky bottom-0 bg-card border-t border-border p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAdmin && booking.status !== 'cancelled' && !cancelPromptOpen && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelPromptOpen(true)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canUpdateStatus && booking.status === 'pending' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  className="text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Confirm Booking
                </Button>
              )}

              {canUpdateStatus && booking.status === 'confirmed' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleComplete}
                  className="text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Mark Completed
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* M-Pesa Modal */}
      <MpesaPaymentModal
        isOpen={isMpesaModalOpen}
        onClose={() => setIsMpesaModalOpen(false)}
        bookingId={booking.id}
        referenceNumber={booking.referenceNumber}
        customerName={booking.customerName}
        customerPhone={booking.customerPhone}
        totalPriceKsh={booking.totalPriceKsh}
        depositPaidKsh={booking.depositPaidKsh || 0}
        onPaymentCompleted={(receipt, amount) => {
          recordPayment(booking.id, amount, 'mpesa', receipt);
        }}
      />
    </>
  );
};
