import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, User, Plus, Scissors, Smartphone, 
  CheckCircle2, ArrowRight, ShieldCheck, Phone, AlertCircle 
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { StaffBooking } from '../../../types/staff';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { BookingDrawer } from '../bookings/BookingDrawer';
import { MpesaPaymentModal } from '../payments/MpesaPaymentModal';

interface PortalOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const PortalOverview: React.FC<PortalOverviewProps> = ({ onNavigateTab }) => {
  const { user, role } = useAuthStore();
  const { 
    bookings, 
    loadBookings, 
    recordPayment, 
    openCreateDrawer, 
    openViewDrawer 
  } = useBookingStore();
  const { providers, loadProviders } = useProviderStore();

  const [paymentBooking, setPaymentBooking] = useState<StaffBooking | null>(null);

  React.useEffect(() => {
    loadBookings();
    loadProviders();
  }, [loadBookings, loadProviders]);

  const todayStr = new Date().toISOString().split('T')[0];

  // User-relevant bookings
  const relevantBookings = useMemo(() => {
    return bookings.filter(b => {
      if (role === 'provider' && user?.providerId && b.providerId !== user.providerId) {
        return false;
      }
      return true;
    });
  }, [bookings, role, user]);

  const todayBookings = useMemo(() => {
    return relevantBookings
      .filter(b => b.date === todayStr && b.status !== 'cancelled')
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [relevantBookings, todayStr]);

  // Operational metrics
  const pendingCount = relevantBookings.filter(b => b.status === 'pending').length;
  const todayTotalRevenue = todayBookings.reduce((sum, b) => sum + (b.depositPaidKsh || 0), 0);
  const nextClient = todayBookings.find(b => b.status === 'confirmed' || b.status === 'pending');

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
           
            <span className="text-xs text-muted-foreground"> {formattedToday}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            <span className='text-primary'>Welcome </span>{user?.fullName || ''}
          </h1>
         
        </div>

        {/* Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs"
          >
            <Calendar className="w-3.5 h-3.5 mr-1 text-primary" />
            <span>Calendar</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => openCreateDrawer()}
            className="text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>New Booking</span>
          </Button>
        </div>
      </div>

      {/* Operational Highlights (Anti-Slop: clean, purposeful 3 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Today's Appointments
          </span>
          <div className="text-2xl font-mono font-extrabold text-foreground">
            {todayBookings.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {todayBookings.filter(b => b.status === 'confirmed').length} confirmed • {todayBookings.filter(b => b.status === 'completed').length} completed
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Pending Confirmations
          </span>
          <div className="text-2xl font-mono font-extrabold text-warning">
            {pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Awaiting provider chair allocation
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Today's Collected Deposits
          </span>
          <div className="text-2xl font-mono font-extrabold text-primary">
            KSh {todayTotalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">
            50% minimum deposit rule active
          </p>
        </div>
      </div>

      {/* Immediate "Next Client" Feature */}
      {nextClient && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-primary/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Next Client Up
            </span>
            <Badge variant="primary">{nextClient.timeSlot}</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-foreground">{nextClient.customerName}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{nextClient.serviceNames.join(' + ')}</span>
                <span>•</span>
                <span>Assigned: <strong>{nextClient.providerName}</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${nextClient.customerPhone}`}
                className="px-3 py-1.5 rounded-lg border border-border bg-input hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>Call Client</span>
              </a>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => openViewDrawer(nextClient)}
                className="text-xs"
              >
                <span>View Ticket</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule Table/List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Today's Schedule</h2>
            <p className="text-xs text-muted-foreground">Immediate operational lineup for {formattedToday}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('bookings')}
            className="text-xs text-primary"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {todayBookings.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border space-y-2">
            <p className="text-xs text-muted-foreground">No appointments scheduled for today yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCreateDrawer()}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create First Booking
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
            {todayBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => openViewDrawer(b)}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 text-center sm:text-left">
                    <span className="font-mono text-xs font-bold text-primary block">
                      {b.timeSlot}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.durationMinutes}m
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{b.customerName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">({b.referenceNumber})</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-primary" />
                      <span>{b.serviceNames.join(', ')}</span>
                      <span>•</span>
                      <span>{b.providerName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-foreground">
                      KSh {b.totalPriceKsh.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-semibold text-primary">
                      {b.remainingBalanceKsh === 0 ? 'Fully Paid' : `Bal: KSh ${b.remainingBalanceKsh.toLocaleString()}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {role === 'admin' && b.remainingBalanceKsh > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentBooking(b)}
                        className="p-1.5 rounded-lg text-success hover:bg-success/10 transition-colors"
                        title="Collect M-Pesa Payment"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDrawer(b)}
                      className="text-[11px] h-auto py-1 px-2.5"
                    >
                      Ticket
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Booking Drawer (create/view/edit) */}
      <BookingDrawer />

      {/* M-Pesa Quick Modal */}
      {paymentBooking && (
        <MpesaPaymentModal
          isOpen={Boolean(paymentBooking)}
          onClose={() => setPaymentBooking(null)}
          bookingId={paymentBooking.id}
          referenceNumber={paymentBooking.referenceNumber}
          customerName={paymentBooking.customerName}
          customerPhone={paymentBooking.customerPhone}
          totalPriceKsh={paymentBooking.totalPriceKsh}
          depositPaidKsh={paymentBooking.depositPaidKsh || 0}
          onPaymentCompleted={(receipt, amount) => {
            recordPayment(paymentBooking.id, amount, 'mpesa', receipt);
            setPaymentBooking(null);
          }}
        />
      )}
    </div>
  );
};
