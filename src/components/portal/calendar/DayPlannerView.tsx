import React, { useMemo } from 'react';
import { StaffBooking, ServiceProvider } from '../../../types/staff';
import { computePositionedBookings } from '../../../utils/calendarLayout';
import { BookingBlock } from './BookingBlock';
import { minutesToTimeString } from '../../../utils/timeUtils';
import { MobileAgendaDay } from './MobileAgendaDay';

export interface DayPlannerViewProps {
  currentDate: Date;
  bookings: StaffBooking[];
  providers: ServiceProvider[];
  selectedProviderId: string;
  onBookingClick: (booking: StaffBooking) => void;
  onSlotClick: (date: string, timeSlot: string, providerId?: string) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;
const ROW_HEIGHT = 88; // 88px per 60 min for day view

export const DayPlannerView: React.FC<DayPlannerViewProps> = ({
  currentDate,
  bookings,
  providers,
  selectedProviderId,
  onBookingClick,
  onSlotClick
}) => {
  const yyyy = currentDate.getFullYear();
  const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
  const dd = String(currentDate.getDate()).padStart(2, '0');
  const dateString = `${yyyy}-${mm}-${dd}`;

  // Filter bookings for this day
  const dayBookings = useMemo(() => {
    return bookings.filter(b => b.date === dateString);
  }, [bookings, dateString]);

  // Determine active columns
  const activeProviders = useMemo(() => {
    if (selectedProviderId === 'all') {
      return providers.filter(p => p.status === 'active');
    }
    const single = providers.find(p => p.id === selectedProviderId);
    return single ? [single] : providers.slice(0, 1);
  }, [providers, selectedProviderId]);

  const hours = useMemo(() => {
    const list: { hourNumber: number; label: string }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push({ hourNumber: h, label: minutesToTimeString(h * 60) });
    }
    return list;
  }, []);

  const totalHeight = (END_HOUR - START_HOUR) * ROW_HEIGHT;
  const isMultiProvider = activeProviders.length > 1;

  return (
    <>
      {/* ============ MOBILE: vertical agenda (all active providers merged) ============ */}
      <div className="sm:hidden bg-card border border-border rounded-2xl p-3">
        <MobileAgendaDay
          bookings={dayBookings}
          onBookingClick={onBookingClick}
          onAddClick={() => onSlotClick(dateString, '09:00 AM', selectedProviderId !== 'all' ? selectedProviderId : undefined)}
          showProviderName={isMultiProvider}
        />
      </div>

      {/* ============ DESKTOP/TABLET: time grid, columns per provider ============ */}
      <div className="hidden sm:block bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
      <div className={isMultiProvider ? 'min-w-[760px] sm:min-w-[880px]' : 'min-w-[400px]'}>
        {/* Header with Provider Columns */}
        <div 
          className="border-b border-border bg-muted/40 text-center sticky top-0 z-20"
          style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(${activeProviders.length}, 1fr)`
          }}
        >
          {/* Corner */}
          <div className="p-3 border-r border-border text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center">
            GMT+3
          </div>

          {/* Provider Headers */}
          {activeProviders.map(p => (
            <div
              key={p.id}
              className="p-3 border-r border-border last:border-r-0 flex items-center justify-center gap-2"
            >
              <img
                src={p.avatarUrl}
                alt={p.fullName}
                className="w-7 h-7 rounded-full object-cover border border-primary/40 shrink-0"
              />
              <div className="text-left truncate">
                <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                  <span>{p.fullName}</span>
                  {p.id === 'provider-admin' && (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate capitalize">
                  {p.id === 'provider-admin' ? 'Master Stylist & Admin' : p.providerType.replace('-', ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div 
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(${activeProviders.length}, 1fr)`
          }}
        >
          {/* Time Gutter */}
          <div 
            style={{ height: `${totalHeight}px` }} 
            className="border-r border-border relative select-none bg-muted/20"
          >
            {hours.slice(0, -1).map((h, i) => (
              <div
                key={h.hourNumber}
                style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                className="absolute left-0 right-0 p-1.5 text-center text-xs font-mono text-muted-foreground border-b border-border/40 flex flex-col justify-start items-center"
              >
                <span>{h.label.split(' ')[0]}</span>
                <span className="text-[9px] text-muted-foreground/60">
                  {h.label.split(' ')[1]}
                </span>
              </div>
            ))}
          </div>

          {/* Provider Columns */}
          {activeProviders.map(provider => {
            const providerBookings = dayBookings.filter(b => b.providerId === provider.id);
            const positioned = computePositionedBookings(providerBookings, ROW_HEIGHT);

            return (
              <div
                key={provider.id}
                style={{ height: `${totalHeight}px` }}
                className="border-r border-border last:border-r-0 relative"
              >
                {/* Horizontal hour grid lines (clickable to schedule) */}
                {hours.slice(0, -1).map((h, i) => (
                  <div
                    key={h.hourNumber}
                    style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    className="absolute left-0 right-0 border-b border-border/40 flex flex-col group/slot"
                  >
                    <button
                      type="button"
                      onClick={() => onSlotClick(dateString, minutesToTimeString(h.hourNumber * 60), provider.id)}
                      title={`Book ${provider.fullName} at ${minutesToTimeString(h.hourNumber * 60)}`}
                      className="h-1/2 w-full hover:bg-primary/10 transition-colors border-b border-dashed border-border/30 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => onSlotClick(dateString, minutesToTimeString(h.hourNumber * 60 + 30), provider.id)}
                      title={`Book ${provider.fullName} at ${minutesToTimeString(h.hourNumber * 60 + 30)}`}
                      className="h-1/2 w-full hover:bg-primary/10 transition-colors cursor-pointer"
                    />
                  </div>
                ))}

                {/* Render Bookings */}
                {positioned.map(item => (
                  <BookingBlock
                    key={item.booking.id}
                    booking={item.booking}
                    top={item.top}
                    height={item.height}
                    leftPercent={item.leftPercent}
                    widthPercent={item.widthPercent}
                    onClick={onBookingClick}
                    showProvider={false}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </>
  );
};