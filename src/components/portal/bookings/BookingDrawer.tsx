import React, { useState } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Calendar, Clock, User, Phone, 
  Scissors, CreditCard, CheckCircle2, AlertCircle, Edit3, 
  Smartphone, Minimize2, Maximize2, ExternalLink
} from 'lucide-react';
import { StaffBooking, StaffBookingStatus } from '../../../types/staff';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { paymentService } from '../../../services/paymentService';
import { MpesaPaymentModal } from '../payments/MpesaPaymentModal';
import { BookingForm } from './BookingForm';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';

export const BookingDrawer: React.FC = () => {
  const { role, user } = useAuthStore();
  const { 
    isDrawerOpen, 
    drawerMode, 
    isDrawerCollapsed,
    selectedBooking,
    prefilledDate,
    prefilledTime,
    prefilledProviderId,
    closeDrawer,
    toggleDrawerCollapsed,
    openEditDrawer,
    openViewDrawer,
    updateBookingStatus,
    cancelBooking,
    recordPayment
  } = useBookingStore();

  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [cancelPromptOpen, setCancelPromptOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isDrawerOpen) return null;

  const isAdmin = role === 'admin';
  const isAssignedProvider = user?.providerId === selectedBooking?.providerId;
  const canUpdateStatus = isAdmin || isAssignedProvider;

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

  const depositBreakdown = selectedBooking 
    ? paymentService.calculateDeposit(selectedBooking.totalPriceKsh, selectedBooking.depositPaidKsh || 0)
    : null;

  const handleConfirm = async () => {
    if (selectedBooking) {
      await updateBookingStatus(selectedBooking.id, 'confirmed');
    }
  };

  const handleComplete = async () => {
    if (selectedBooking) {
      await updateBookingStatus(selectedBooking.id, 'completed');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBooking) {
      await cancelBooking(selectedBooking.id, cancelReason);
      setCancelPromptOpen(false);
      setCancelReason('');
    }
  };

  return (
    <>
      {/* Background Overlay */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          isDrawerCollapsed ? 'bg-transparent pointer-events-none' : 'bg-black/60 backdrop-blur-xs'
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer Container */}
      <div 
        className={`fixed z-50 transition-all duration-300 ease-out shadow-2xl flex flex-col bg-card border-border ${
          'bottom-0 left-0 right-0 sm:bottom-0 sm:top-0 sm:left-auto sm:right-0'
        } ${
          isDrawerCollapsed 
            ? 'h-14 sm:h-full sm:w-16 border-t sm:border-t-0 sm:border-l' 
            : 'max-h-[88vh] sm:max-h-full sm:w-[480px] rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl border-t sm:border-t-0 sm:border-l'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {isDrawerCollapsed ? (
          <div className="h-full flex sm:flex-col items-center justify-between p-3 sm:py-6 text-foreground">
            <button
              type="button"
              onClick={toggleDrawerCollapsed}
              title="Expand drawer"
              className="p-2 rounded-xl bg-input hover:bg-primary/20 text-primary border border-border transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 hidden sm:block" />
              <Maximize2 className="w-4 h-4 sm:hidden" />
            </button>
            <div className="hidden sm:block text-xs font-bold uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              {drawerMode === 'create' ? 'Create Appointment' : selectedBooking?.customerName || 'Booking'}
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              title="Close drawer"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-card/95 backdrop-blur-md border-b border-border p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded shrink-0">
                    {drawerMode === 'create' ? 'New Booking' : drawerMode === 'edit' ? 'Edit Booking' : 'Booking Details'}
                  </span>
                  {selectedBooking && drawerMode === 'view' && (
                    <span className="font-mono text-xs font-bold text-muted-foreground truncate">
                      {selectedBooking.referenceNumber}
                    </span>
                  )}  
                </div>
                <h3 className="text-base font-bold text-foreground truncate mt-1">
                  {drawerMode === 'create' 
                    ? 'Schedule Client Appointment' 
                    : drawerMode === 'edit'
                    ? `Edit: ${selectedBooking?.customerName}`
                    : selectedBooking?.customerName}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleDrawerCollapsed}
                  title="Minimize drawer to scan calendar"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {drawerMode === 'create' || drawerMode === 'edit' ? (
                <BookingForm
                  mode={drawerMode}
                  initialBooking={selectedBooking}
                  prefilledDate={prefilledDate}
                  prefilledTime={prefilledTime}
                  prefilledProviderId={prefilledProviderId}
                  onSubmitSuccess={(saved) => {
                    openViewDrawer(saved);
                  }}
                  onCancel={drawerMode === 'edit' && selectedBooking ? () => openViewDrawer(selectedBooking) : closeDrawer}
                />
              ) : selectedBooking ? (
                <div className="space-y-4 text-xs">
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Status</div>
                      <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Payment</div>
                      <div className="font-mono font-bold text-primary mt-1">
                        {selectedBooking.paymentStatus === 'paid' ? 'Paid in Full' : 
                         selectedBooking.paymentStatus === 'deposit-paid' ? '50% Deposit Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Client Profile
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold shrink-0">
                        {selectedBooking.customerName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-foreground truncate">
                          {selectedBooking.customerName}
                        </div>
                        <div className="text-muted-foreground font-mono truncate">
                          {selectedBooking.customerPhone} • {selectedBooking.customerEmail}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service & Specialist Details */}
                  <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Service & Specialist
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Scissors className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">
                            {selectedBooking.serviceNames.join(', ')}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Duration: {selectedBooking.durationMinutes} min
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm text-primary shrink-0">
                        KSh {selectedBooking.totalPriceKsh.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground shrink-0">Assigned Provider:</span>
                      <span className="font-bold text-foreground flex items-center gap-1 min-w-0 truncate">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{selectedBooking.providerName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Appointment Time
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-bold text-foreground truncate">{selectedBooking.date}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-primary font-semibold shrink-0">
                        <Clock className="w-4 h-4" />
                        <span>{selectedBooking.timeSlot} – {selectedBooking.endTime || 'end'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  {depositBreakdown && (
                    <div className="p-4 rounded-xl bg-card border border-border space-y-2 font-mono">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                        Financial Summary
                      </div>
                      <div className="flex justify-between gap-2 text-muted-foreground">
                        <span>Total Service:</span>
                        <span className="shrink-0">KSh {selectedBooking.totalPriceKsh.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-success">
                        <span>Paid Deposit:</span>
                        <span className="shrink-0">- KSh {(selectedBooking.depositPaidKsh || 0).toLocaleString()}</span>
                      </div>
                      <div className="pt-1.5 border-t border-border flex justify-between gap-2 font-bold text-foreground">
                        <span>Balance at Station:</span>
                        <span className="text-primary shrink-0">
                          KSh {depositBreakdown.remainingKsh.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(selectedBooking.specialRequests || selectedBooking.staffNotes) && (
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Notes
                      </div>
                      {selectedBooking.specialRequests && (
                        <p className="text-foreground text-xs leading-relaxed">
                          "{selectedBooking.specialRequests}"
                        </p>
                      )}
                      {selectedBooking.staffNotes && (
                        <p className="text-muted-foreground text-[11px] italic">
                          Staff Note: {selectedBooking.staffNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="order-2 sm:order-1 grid grid-cols-1 sm:flex sm:items-center gap-2">
                      {depositBreakdown && depositBreakdown.remainingKsh > 0 && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => setIsMpesaModalOpen(true)}
                          className="text-xs w-full sm:w-auto justify-center"
                        >
                          <Smartphone className="w-3.5 h-3.5 mr-1" />
                          M-Pesa Pay
                        </Button>
                      )}

                      {canUpdateStatus && selectedBooking.status === 'pending' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleConfirm}
                          className="text-xs w-full sm:w-auto justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Confirm
                        </Button>
                      )}

                      {canUpdateStatus && selectedBooking.status === 'confirmed' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleComplete}
                          className="text-xs w-full sm:w-auto justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDrawer(selectedBooking)}
                      className="text-xs w-full sm:w-auto justify-center order-1 sm:order-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1 text-primary" />
                      Edit Booking
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <MpesaPaymentModal
          isOpen={isMpesaModalOpen}
          onClose={() => setIsMpesaModalOpen(false)}
          bookingId={selectedBooking.id}
          referenceNumber={selectedBooking.referenceNumber}
          customerName={selectedBooking.customerName}
          customerPhone={selectedBooking.customerPhone}
          totalPriceKsh={selectedBooking.totalPriceKsh}
          depositPaidKsh={selectedBooking.depositPaidKsh || 0}
          onPaymentCompleted={(receipt, amount) => {
            recordPayment(selectedBooking.id, amount, 'mpesa', receipt);
          }}
        />
      )}
    </>
  );
};