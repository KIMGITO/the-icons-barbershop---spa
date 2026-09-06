import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import { 
  parseTimeToMinutes, 
  minutesToTimeString, 
  minutesToHHMM, 
  formatTimeDisplay, 
  SLOT_INTERVAL_MINUTES 
} from '../../../utils/timeUtils';
import { businessService, BusinessHoursResult } from '../../../services/businessService';
import { useProviderStore } from '../../../stores/providerStore';
import { useBookingStore } from '../../../stores/bookingStore';

interface TimeRangeSliderProps {
  selectedDate: string;
  value: string;
  durationMinutes: number;
  providerId: string;
  onChange: (time: string) => void;
  error?: string;
}

export const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  selectedDate,
  value,
  durationMinutes,
  providerId,
  onChange,
  error
}) => {
  const { providers } = useProviderStore();
  const { bookings } = useBookingStore();
  const [dbBusinessHours, setDbBusinessHours] = useState<BusinessHoursResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    businessService.getBusinessHours()
      .then(setDbBusinessHours)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const provider = useMemo(() => 
    providers.find(p => p.id === providerId), 
    [providers, providerId]
  );

  const { openMin, closeMin, isClosed } = useMemo(() => {
    if (!selectedDate || !dbBusinessHours) {
      return { openMin: 480, closeMin: 1200, isClosed: false };
    }

    const date = new Date(selectedDate);
    const day = date.getDay();
    const range = businessService.getHoursForWeekday(dbBusinessHours, day);

    if (!range) return { openMin: 0, closeMin: 0, isClosed: true };

    let open = parseTimeToMinutes(range.start);
    let close = parseTimeToMinutes(range.end);

    if (provider?.schedule) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const providerDay = provider.schedule.find(s => s.day === dayNames[day]);
      if (providerDay) {
        if (!providerDay.isOpen) return { openMin: 0, closeMin: 0, isClosed: true };
        const pOpen = parseTimeToMinutes(providerDay.openTime);
        const pClose = parseTimeToMinutes(providerDay.closeTime);
        open = Math.max(open, pOpen);
        close = Math.min(close, pClose);
      }
    }

    return { openMin: open, closeMin: close, isClosed: false };
  }, [selectedDate, dbBusinessHours, provider]);

  const busyRanges = useMemo(() => {
    if (!providerId || !selectedDate) return [];
    return bookings
      .filter(b => b.providerId === providerId && b.date === selectedDate && b.status !== 'cancelled')
      .map(b => {
        const start = parseTimeToMinutes(b.timeSlot);
        const end = start + (b.durationMinutes || 60);
        return { start, end, label: b.customerName };
      });
  }, [bookings, providerId, selectedDate]);

  const selectedStartMin = parseTimeToMinutes(value);
  const selectedEndMin = selectedStartMin + durationMinutes;
  const timelineSpan = closeMin - openMin;

  const handleTimelineTouch = (e: React.TouchEvent | React.MouseEvent) => {
    const timeline = e.currentTarget as HTMLDivElement;
    const rect = timeline.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const minutes = openMin + percentage * timelineSpan;
    const steppedMinutes = Math.round(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
    const finalMinutes = Math.max(openMin, Math.min(closeMin - durationMinutes, steppedMinutes));
    
    onChange(minutesToTimeString(finalMinutes, '12'));
  };

  if (isClosed) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-none flex items-center gap-3 text-destructive text-sm">
        <AlertCircle className="w-5 h-5" />
        <p>The business or provider is closed on this day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold  tracking-wider text-muted-foreground">
           Appointment Time
        </label>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          <span className="text-sm font-semibold font-mono text-primary px-2 py-0.5 rounded-sm">
            {value} ({durationMinutes} min)
          </span>
        </div>
      </div>
      <div className="space-y-6 border border-primary rounded-none p-3.5">
        <div className="relative pt-6">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-2 px-1">
            <span>{minutesToTimeString(openMin)}</span>
            <span>{minutesToTimeString(closeMin)}</span>
          </div>

          <div 
            className="relative h-12 bg-muted/30 border border-border rounded-none overflow-hidden shadow-inner cursor-pointer touch-none"
            onMouseDown={handleTimelineTouch}
            onMouseMove={(e) => e.buttons === 1 && handleTimelineTouch(e)}
            onTouchMove={handleTimelineTouch}
            onTouchStart={handleTimelineTouch}
          >
            {/* Busy and Selection rendering... */}
            {Array.from({ length: Math.floor(timelineSpan / 60) + 1 }, (_, i) => openMin + i * 60)
              .filter(m => m <= closeMin)
              .map(m => (
                <div
                  key={m}
                  className="absolute top-0 bottom-0 w-px bg-border/40"
                  style={{ left: `${((m - openMin) / timelineSpan) * 100}%` }}
                />
              ))}

            {busyRanges.map((r, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-destructive/40 border-x border-destructive/20 group cursor-help"
                style={{
                  left: `${((r.start - openMin) / timelineSpan) * 100}%`,
                  width: `${((r.end - r.start) / timelineSpan) * 100}%`
                }}
              >
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-[10px] text-popover-foreground rounded shadow-lg whitespace-nowrap z-50">
                  {r.label} ({minutesToTimeString(r.start)} - {minutesToTimeString(r.end)})
                </div>
              </div>
            ))}

            {selectedStartMin >= openMin && selectedStartMin < closeMin && (
              <div
                className="absolute top-0 bottom-0 bg-primary/30 border-x-2 border-primary z-10 flex items-center justify-center"
                style={{
                  left: `${((selectedStartMin - openMin) / timelineSpan) * 100}%`,
                  width: `${((Math.min(selectedEndMin, closeMin) - selectedStartMin) / timelineSpan) * 100}%`
                }}
              >
                <div className="text-[9px] font-bold text-primary-foreground drop-shadow-md truncate px-1">
                  New Booking
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-1 relative">
          <input
            type="range"
            min={openMin}
            max={Math.max(openMin, closeMin - durationMinutes)}
            step={SLOT_INTERVAL_MINUTES}
            value={selectedStartMin}
            onChange={(e) => onChange(minutesToTimeString(parseInt(e.target.value, 10), '12'))}
            className="w-full h-2 bg-muted rounded-none appearance-none cursor-pointer accent-primary"
          />
          
          {/* Scroll Simulation Overlay on the Range Input */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
            <div className="absolute top-1/2 -translate-y-1/2 animate-drag-hand flex flex-col items-center gap-1">
              <div className="w-6 h-6 text-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hand"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.82-2.82L7 15"/><path d="M14 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/></svg>
              </div>
              <span className="text-[8px] uppercase tracking-tighter font-bold text-primary">Slide to select</span>
            </div>
          </div>

          <div className="flex justify-center mt-2 text-[10px] text-primary uppercase tracking-widest ">
            <span>Drag Slider to Adjust Time</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

