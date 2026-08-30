import React from 'react';
import { Clock, Scissors, User, CheckCircle2 } from 'lucide-react';
import { StaffBooking } from '../../../types/staff';
import { formatTimeRange } from '../../../utils/timeUtils';

export interface BookingBlockProps {
  booking: StaffBooking;
  top: number;
  height: number;
  leftPercent?: number;
  widthPercent?: number;
  onClick: (booking: StaffBooking) => void;
  showProvider?: boolean;
}

export const BookingBlock: React.FC<BookingBlockProps> = ({
  booking,
  top,
  height,
  leftPercent = 0,
  widthPercent = 100,
  onClick,
  showProvider = false
}) => {
  const isDepositPaid = (booking.depositPaidKsh || 0) > 0;
  const isSmall = height < 50; // 30-min slot or less

  // Determine status color accents
  const getStatusBorder = () => {
    switch (booking.status) {
      case 'confirmed':
        return 'border-primary/80 bg-primary/10 hover:bg-primary/20 text-foreground';
      case 'pending':
        return 'border-warning/80 bg-warning/10 hover:bg-warning/20 text-foreground';
      case 'completed':
        return 'border-border bg-muted/40 hover:bg-muted/60 text-muted-foreground opacity-85';
      case 'cancelled':
      case 'no-show':
        return 'border-destructive/60 bg-destructive/10 text-muted-foreground line-through opacity-70';
      default:
        return 'border-primary/50 bg-input hover:bg-primary/15';
    }
  };

  const timeDisplay = formatTimeRange(booking.timeSlot, booking.durationMinutes || 60);

  return (
    <div
      style={{
        top: `${top}px`,
        height: `${Math.max(26, height)}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        position: 'absolute'
      }}
      className="p-0.5 sm:p-1 z-10 box-border group"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(booking);
        }}
        className={`w-full h-full text-left p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs cursor-pointer ${getStatusBorder()}`}
      >
        {/* Top row: Client name & Status dot */}
        <div className="flex items-start justify-between gap-1 w-full">
          <div className="font-bold text-[11px] sm:text-xs text-foreground truncate leading-tight group-hover:text-primary transition-colors">
            {booking.customerName}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {booking.status === 'confirmed' && (
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" title="Confirmed" />
            )}
            {booking.status === 'pending' && (
              <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Pending Deposit" />
            )}
          </div>
        </div>

        {/* Middle row: Service Name (if enough height) */}
        {!isSmall && (
          <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate leading-tight">
            {booking.serviceNames[0]}
          </div>
        )}

        {/* Bottom row: Time range & Payment tag */}
        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono text-muted-foreground pt-0.5 border-t border-border/40 w-full mt-auto">
          <span className="truncate text-primary font-semibold">
            {booking.timeSlot.split(' ')[0]} – {booking.endTime ? booking.endTime.split(' ')[0] : ''}
          </span>
          <span className="font-sans shrink-0 font-medium">
            {isDepositPaid ? '50% Dep' : 'Unpaid'}
          </span>
        </div>
      </button>
    </div>
  );
};
