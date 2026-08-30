import React, { useMemo } from 'react';
import { StaffBooking } from '../../../types/staff';
import { computePositionedBookings } from '../../../utils/calendarLayout';
import { BookingBlock } from './BookingBlock';
import { minutesToTimeString } from '../../../utils/timeUtils';

export interface WeekPlannerViewProps {
  currentDate: Date;
  bookings: StaffBooking[];
  onBookingClick: (booking: StaffBooking) => void;
  onSlotClick: (date: string, timeSlot: string) => void;
}

const START_HOUR = 8; // 08:00 AM
const END_HOUR = 20;  // 08:00 PM
const ROW_HEIGHT = 80; // 80px per 60 minutes

export const WeekPlannerView: React.FC<WeekPlannerViewProps> = ({
  currentDate,
  bookings,
  onBookingClick,
  onSlotClick
}) => {
  // Generate 7 days of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    // Monday as start of week:
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const todayStr = new Date().toISOString().split('T')[0];

    return Array.from({ length: 7 }).map((_, i) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);

      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      return {
        date: current,
        dateString,
        dayNumber: current.getDate(),
        dayLabel: current.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateString === todayStr
      };
    });
  }, [currentDate]);

  // Hours array from 8 to 20
  const hours = useMemo(() => {
    const list: { hourNumber: number; label: string }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const timeStr = minutesToTimeString(h * 60);
      list.push({ hourNumber: h, label: timeStr });
    }
    return list;
  }, []);

  const totalHeight = (END_HOUR - START_HOUR) * ROW_HEIGHT;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
      <div className="min-w-[760px] sm:min-w-[860px]">
        {/* Days Header */}
        <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-border bg-muted/40 text-center sticky top-0 z-20">
          {/* Time zone corner */}
          <div className="p-3 border-r border-border text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center">
            GMT+3
          </div>

          {/* 7 Day Header Columns */}
          {weekDays.map(day => (
            <div
              key={day.dateString}
              className={`p-2.5 sm:p-3 border-r border-border last:border-r-0 transition-colors ${
                day.isToday ? 'bg-primary/10' : ''
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {day.dayLabel}
              </div>
              <div className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                day.isToday ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-foreground'
              }`}>
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body: Time Gutter & Days Columns */}
        <div className="grid grid-cols-[70px_repeat(7,1fr)] relative">
          {/* Left Time Gutter */}
          <div 
            style={{ height: `${totalHeight}px` }} 
            className="border-r border-border relative select-none bg-muted/20"
          >
            {hours.slice(0, -1).map((h, i) => (
              <div
                key={h.hourNumber}
                style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                className="absolute left-0 right-0 p-1.5 text-center text-[10px] sm:text-[11px] font-mono text-muted-foreground border-b border-border/40"
              >
                {h.label.split(' ')[0]}
                <span className="text-[8px] text-muted-foreground/60 ml-0.5 block sm:inline">
                  {h.label.split(' ')[1]}
                </span>
              </div>
            ))}
          </div>

          {/* 7 Days Columns */}
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => b.date === day.dateString);
            const positioned = computePositionedBookings(dayBookings, ROW_HEIGHT);

            return (
              <div
                key={day.dateString}
                style={{ height: `${totalHeight}px` }}
                className={`border-r border-border last:border-r-0 relative transition-colors ${
                  day.isToday ? 'bg-primary/[0.02]' : ''
                }`}
              >
                {/* Horizontal Hour and Half-hour Grid lines (clickable to create booking) */}
                {hours.slice(0, -1).map((h, i) => (
                  <div
                    key={h.hourNumber}
                    style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    className="absolute left-0 right-0 border-b border-border/40 flex flex-col group/hour"
                  >
                    {/* Top 30 min */}
                    <button
                      type="button"
                      onClick={() => onSlotClick(day.dateString, minutesToTimeString(h.hourNumber * 60))}
                      title={`Click to schedule appointment at ${minutesToTimeString(h.hourNumber * 60)}`}
                      className="h-1/2 w-full hover:bg-primary/10 transition-colors border-b border-dashed border-border/30 cursor-pointer"
                    />
                    {/* Bottom 30 min */}
                    <button
                      type="button"
                      onClick={() => onSlotClick(day.dateString, minutesToTimeString(h.hourNumber * 60 + 30))}
                      title={`Click to schedule appointment at ${minutesToTimeString(h.hourNumber * 60 + 30)}`}
                      className="h-1/2 w-full hover:bg-primary/10 transition-colors cursor-pointer"
                    />
                  </div>
                ))}

                {/* Render Positioned Bookings with exact height by duration */}
                {positioned.map(item => (
                  <BookingBlock
                    key={item.booking.id}
                    booking={item.booking}
                    top={item.top}
                    height={item.height}
                    leftPercent={item.leftPercent}
                    widthPercent={item.widthPercent}
                    onClick={onBookingClick}
                    showProvider={true}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
