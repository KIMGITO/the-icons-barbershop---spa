import React, { useMemo } from 'react';
import { Clock, Plus, ChevronRight, Scissors } from 'lucide-react';
import { StaffBooking } from '../../../types/staff';
import { parseTimeToMinutes, formatTimeRange } from '../../../utils/timeUtils';

export interface MobileAgendaDayProps {
  bookings: StaffBooking[];
  onBookingClick: (booking: StaffBooking) => void;
  onAddClick: () => void;
  showProviderName?: boolean;
  emptyLabel?: string;
}

const statusStyles: Record<string, string> = {
  confirmed: 'border-primary/50 bg-primary/5',
  pending: 'border-warning/50 bg-warning/5',
  completed: 'border-border bg-muted/30 opacity-80',
  cancelled: 'border-destructive/40 bg-destructive/5 opacity-70',
  'no-show': 'border-destructive/40 bg-destructive/5 opacity-70'
};

const statusDot: Record<string, string> = {
  confirmed: 'bg-success',
  pending: 'bg-warning',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
  'no-show': 'bg-destructive'
};

/**
 * Tap-friendly vertical agenda for a single day — replaces the
 * horizontally-scrolling time-grid on small screens, where a 7-column
 * (or multi-provider) grid is unusable: forced side-scrolling, sub-40px
 * touch targets, and near-illegible text.
 */
export const MobileAgendaDay: React.FC<MobileAgendaDayProps> = ({
  bookings,
  onBookingClick,
  onAddClick,
  showProviderName = false,
  emptyLabel = 'No appointments scheduled.'
}) => {
  const sorted = useMemo(() => {
    return [...bookings]
      .filter(b => b.status !== 'cancelled')
      .sort((a, b) => parseTimeToMinutes(a.timeSlot) - parseTimeToMinutes(b.timeSlot));
  }, [bookings]);

  return (
    <div className="space-y-2.5">
      {sorted.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
          <Clock className="w-6 h-6 opacity-40" />
          <p className="text-xs">{emptyLabel}</p>
        </div>
      ) : (
        sorted.map(booking => (
          <button
            key={booking.id}
            type="button"
            onClick={() => onBookingClick(booking)}
            className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 active:scale-[0.99] transition-transform ${
              statusStyles[booking.status] || 'border-border bg-input'
            }`}
          >
            {/* Time column */}
            <div className="shrink-0 w-16 text-center">
              <div className="text-xs font-bold font-mono text-primary leading-tight">
                {booking.timeSlot.split(' ')[0]}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                {booking.timeSlot.split(' ')[1]}
              </div>
            </div>

            <div className="w-px self-stretch bg-border/70 shrink-0" />

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[booking.status] || 'bg-muted-foreground'}`} />
                <span className="font-bold text-sm text-foreground truncate">
                  {booking.customerName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mt-0.5">
                <Scissors className="w-3 h-3 shrink-0" />
                <span className="truncate">{booking.serviceNames?.[0] || 'Service'}</span>
                {showProviderName && (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="truncate">{booking.providerName}</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatTimeRange(booking.timeSlot, booking.durationMinutes || 60)}
                <span className="mx-1 opacity-50">·</span>
                <span className="capitalize">{booking.status}</span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))
      )}

      <button
        type="button"
        onClick={onAddClick}
        className="w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Booking
      </button>
    </div>
  );
};