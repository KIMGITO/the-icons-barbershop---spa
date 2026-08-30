import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Plus, Calendar, Clock, User, Phone, 
  CheckCircle2, AlertCircle, ChevronRight, Smartphone, Scissors,
  LayoutGrid, List 
} from 'lucide-react';
import { StaffBooking, StaffBookingStatus } from '../../../types/staff';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { CustomSelect, SelectOption } from '../ui/CustomSelect';
import { BookingCalendar } from '../calendar/BookingCalendar';
import { BookingDrawer } from './BookingDrawer';
import { MpesaPaymentModal } from '../payments/MpesaPaymentModal';

export const BookingList: React.FC = () => {
  const { role, user } = useAuthStore();
  const { 
    bookings, 
    loadBookings, 
    recordPayment,
    openCreateDrawer,
    openViewDrawer
  } = useBookingStore();
  
  const { providers, loadProviders } = useProviderStore();

  // For providers, default to planner; for admin, can switch between planner & table
  const [displayMode, setDisplayMode] = useState<'planner' | 'table'>(
    role === 'provider' ? 'planner' : 'planner'
  );
  
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffBookingStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>(
    role === 'provider' && user?.providerId ? user.providerId : 'all'
  );
  const [paymentBooking, setPaymentBooking] = useState<StaffBooking | null>(null);

  React.useEffect(() => {
    loadBookings();
    loadProviders();
  }, [loadBookings, loadProviders]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Role scope (providers only see their own appointments)
      if (role === 'provider' && user?.providerId && b.providerId !== user.providerId) {
        return false;
      }

      // Admin provider filter
      if (providerFilter !== 'all' && b.providerId !== providerFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      // Tab filter
      if (activeTab === 'today' && b.date !== todayStr) {
        return false;
      }
      if (activeTab === 'upcoming' && b.date <= todayStr) {
        return false;
      }
      if (activeTab === 'past' && b.date >= todayStr) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.customerName.toLowerCase().includes(q);
        const matchesPhone = b.customerPhone.includes(q);
        const matchesRef = b.referenceNumber.toLowerCase().includes(q);
        const matchesService = b.serviceNames.some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesRef && !matchesService) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, role, user, providerFilter, statusFilter, activeTab, todayStr, searchQuery]);

  const getStatusBadge = (status: StaffBookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPaymentBadge = (b: StaffBooking) => {
    if (b.paymentStatus === 'paid') {
      return <span className="text-[11px] font-bold text-success">Paid Full</span>;
    }
    if (b.depositPaidKsh && b.depositPaidKsh > 0) {
      return <span className="text-[11px] font-bold text-primary">50% Deposit Paid</span>;
    }
    return <span className="text-[11px] font-bold text-warning">Unpaid</span>;
  };

  // Provider Options for CustomSelect
  const providerOptions: SelectOption<string>[] = [
    { value: 'all', label: 'All Providers' },
    ...providers.map(p => ({
      value: p.id,
      label: p.fullName,
      sublabel: p.id === 'provider-admin' ? 'Admin & Stylist' : p.providerType.replace('-', ' '),
      badge: p.id === 'provider-admin' ? 'Admin' : undefined
    }))
  ];

  // Status Options for CustomSelect
  const statusOptions: SelectOption<StaffBookingStatus | 'all'>[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending Deposit' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // If in Planner display mode, show the calendar planner
  if (displayMode === 'planner') {
    return (
      <div className="space-y-3">
        {/* Toggle switch between Planner Calendar and Table View */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {role === 'provider' ? 'My Schedule Planner' : 'Booking Schedule Planner'}
          </div>
          <div className="flex items-center bg-input p-1 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode('planner')}
              className="px-3 py-1 rounded-lg font-bold bg-primary text-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Planner</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className="px-3 py-1 rounded-lg font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>

        <BookingCalendar />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs: Today, Upcoming, Past, All */}
          <div className="flex items-center bg-input p-1 rounded-xl border border-border text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'today' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today's Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'upcoming' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'past' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Past
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
          </div>

          {/* View mode toggle & New Booking CTA */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-input p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setDisplayMode('planner')}
                className="px-2.5 py-1 rounded-lg font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Planner</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className="px-2.5 py-1 rounded-lg font-bold bg-primary text-black flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => openCreateDrawer()}
              className="text-xs font-bold shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>New Booking</span>
            </Button>
          </div>
        </div>

        {/* Search & Custom Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border">
          {/* Search Input */}
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, phone, or ref..."
            className="rounded-xl py-2.5 text-xs"
            icon={<Search className="w-3.5 h-3.5" />}
          />

          {/* Provider Filter (CustomSelect) */}
          {role === 'admin' ? (
            <CustomSelect
              options={providerOptions}
              value={providerFilter}
              onChange={setProviderFilter}
              placeholder="All Providers"
              className="text-xs"
            />
          ) : (
            <div className="flex items-center gap-2 bg-input px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">{user?.fullName}</span>
            </div>
          )}

          {/* Status Filter (CustomSelect) */}
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            className="text-xs"
          />
        </div>
      </div>

      {/* Bookings Display */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Appointments Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search criteria.' : 'There are currently no bookings for this selected filter view.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openCreateDrawer()}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Booking
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Time & Ref</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Service</th>
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Deposit / Balance</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBookings.map((b) => {
                  const isDepositPaid = b.depositPaidKsh && b.depositPaidKsh > 0;
                  return (
                    <tr 
                      key={b.id}
                      onClick={() => openViewDrawer(b)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 pl-4">
                        <div className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                          {b.timeSlot}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {b.date} • {b.referenceNumber}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">
                          {b.customerName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {b.customerPhone}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-foreground">
                          {b.serviceNames.join(', ')}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {b.durationMinutes} min • KSh {b.totalPriceKsh.toLocaleString()}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{b.providerName}</span>
                          {b.providerId === 'provider-admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        {getStatusBadge(b.status)}
                      </td>

                      <td className="p-3.5 font-mono">
                        <div>{getPaymentBadge(b)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Bal: KSh {(b.remainingBalanceKsh ?? (b.totalPriceKsh - (b.depositPaidKsh || 0))).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {(b.remainingBalanceKsh ?? 1) > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentBooking(b)}
                              className="text-[11px] py-1 px-2 h-7"
                              title="Record M-Pesa Payment"
                            >
                              <Smartphone className="w-3 h-3 mr-1 text-primary" />
                              Pay
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDrawer(b)}
                            className="text-[11px] py-1 px-2 h-7"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredBookings.map((b) => (
              <div 
                key={b.id}
                onClick={() => openViewDrawer(b)}
                className="bg-card border border-border p-4 rounded-2xl space-y-3 cursor-pointer hover:border-primary/50 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      {b.referenceNumber}
                    </span>
                    <h4 className="font-bold text-sm text-foreground mt-0.5">
                      {b.customerName}
                    </h4>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Time & Date</div>
                    <div className="font-mono text-foreground font-semibold mt-0.5">
                      {b.timeSlot} • {b.date}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Provider</div>
                    <div className="text-foreground font-semibold mt-0.5 truncate">
                      {b.providerName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">{b.serviceNames[0]}</span>
                    <span className="text-foreground font-bold font-mono ml-2">
                      KSh {b.totalPriceKsh.toLocaleString()}
                    </span>
                  </div>
                  <div>{getPaymentBadge(b)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Drawer */}
      <BookingDrawer />

      {/* Payment Modal */}
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
          }}
        />
      )}
    </div>
  );
};
