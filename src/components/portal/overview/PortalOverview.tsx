import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Clock, User, Plus, Scissors, Smartphone, 
  CheckCircle2, ArrowRight, ShieldCheck, Phone, AlertCircle,
  MessageSquare, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { StaffBooking } from '../../../types/staff';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { BookingDrawer } from '../bookings/BookingDrawer';
import { MpesaPaymentModal } from '../payments/MpesaPaymentModal';
import { smsService, SmsMessageRecord } from '../../../services/smsService';

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
  const [recentMessages, setRecentMessages] = useState<SmsMessageRecord[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    loadBookings();
    loadProviders();
    loadRecentMessages();
  }, [loadBookings, loadProviders]);

  const loadRecentMessages = async () => {
    if (role !== 'admin') return;
    setMessagesLoading(true);
    try {
      const msgs = await smsService.getMessages({ limit: 5 });
      setRecentMessages(msgs);
    } catch (err) {
      console.error('Failed to load recent messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

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

  const upcomingBookings = useMemo(() => {
    return relevantBookings
      .filter(b => b.date >= todayStr && b.status !== 'cancelled' && b.status !== 'completed')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timeSlot.localeCompare(b.timeSlot);
      });
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

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Upcoming Appointments
          </span>
          <div className="text-2xl font-mono font-extrabold text-foreground">
            {upcomingBookings.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {upcomingBookings.filter(b => b.status === 'confirmed').length} confirmed • {upcomingBookings.filter(b => b.status === 'pending').length} pending
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
            Total bookings awaiting chair allocation
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Upcoming Expected Revenue
          </span>
          <div className="text-2xl font-mono font-extrabold text-primary">
            KSh {upcomingBookings.reduce((sum, b) => sum + b.totalPriceKsh, 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total value of all upcoming appointments
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

      {/* Real-time Insights & Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Schedule Table/List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Upcoming Schedule</h2>
              <p className="text-xs text-muted-foreground">Operational lineup including upcoming appointments</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('operations')}
              className="text-xs text-primary"
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border space-y-2">
              <p className="text-xs text-muted-foreground">No upcoming appointments scheduled.</p>
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
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => openViewDrawer(b)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-center sm:text-left">
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                          {b.date === todayStr ? 'Today' : new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
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

        {/* Recent Communications */}
        {role === 'admin' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Recent Messages</h2>
                <p className="text-xs text-muted-foreground">Latest client communications</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('messages')}
                className="text-xs text-primary"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="bg-card border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
              {messagesLoading && recentMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading messages...
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No recent messages.
                </div>
              ) : (
                recentMessages.map((msg) => (
                  <div key={msg.id} className="p-3.5 space-y-1 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        {msg.sms_type || 'SMS'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {msg.customer_name || 'Guest'}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {msg.message_body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
