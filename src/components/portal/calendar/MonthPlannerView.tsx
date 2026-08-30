import React from 'react';
import { StaffBooking } from '../../../types/staff';

export interface MonthPlannerViewProps {
  currentDate: Date;
  bookings: StaffBooking[];
  onSelectDate: (dateString: string) => void;
  onBookingClick: (booking: StaffBooking) => void;
}

export const MonthPlannerView: React.FC<MonthPlannerViewProps> = ({
  currentDate,
  bookings,
  onSelectDate,
  onBookingClick
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = new Date().toISOString().split('T')[0];

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {daysOfWeek.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-muted/10">
        {/* Previous Month Cells */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => {
          const prevDay = prevMonthTotalDays - firstDayIndex + idx + 1;
          return (
            <div key={`prev-${idx}`} className="min-h-[100px] p-2 bg-muted/20 opacity-30 text-xs">
              <span className="font-mono text-muted-foreground">{prevDay}</span>
            </div>
          );
        })}

        {/* Current Month Cells */}
        {Array.from({ length: totalDays }).map((_, idx) => {
          const day = idx + 1;
          const mm = String(month + 1).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;

          const isToday = dateStr === todayStr;
          const dayBookings = bookings.filter(b => b.date === dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors hover:bg-primary/[0.04] cursor-pointer group ${
                isToday ? 'bg-primary/[0.03]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  isToday ? 'bg-primary text-black font-extrabold' : 'text-foreground group-hover:text-primary'
                }`}>
                  {day}
                </span>

                {dayBookings.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                    {dayBookings.length}
                  </span>
                )}
              </div>

              {/* Bookings snippets */}
              <div className="space-y-1 my-1 overflow-hidden">
                {dayBookings.slice(0, 3).map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(b);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded bg-input hover:bg-primary/20 border border-border text-[10px] truncate flex items-center justify-between gap-1 transition-colors cursor-pointer"
                  >
                    <span className="truncate font-semibold text-foreground">{b.customerName}</span>
                    <span className="font-mono text-primary text-[9px] shrink-0">{b.timeSlot.split(' ')[0]}</span>
                  </button>
                ))}

                {dayBookings.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center font-bold">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
