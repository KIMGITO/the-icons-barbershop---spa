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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = parseInt(e.target.value, 10);
    onChange(minutesToTimeString(min, '12'));
  };

  if (isClosed) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive text-sm">
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
          <span className="text-sm font-semibold font-mono text-primary px-2 py-0.5 rounded">
            {value} ({durationMinutes} min)
          </span>
        </div>
      </div>
      <div className="space-y-6 border border-primary rounded-2xl p-3.5">
        <div className="relative pt-6">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-2 px-1">
            <span>{minutesToTimeString(openMin)}</span>
            <span>{minutesToTimeString(closeMin)}</span>
          </div>

          <div className="relative h-12 bg-muted/30 border border-border rounded-xl overflow-hidden shadow-inner">
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

        <div className="px-1">
          <input
            type="range"
            min={openMin}
            max={Math.max(openMin, closeMin - durationMinutes)}
            step={SLOT_INTERVAL_MINUTES}
            value={selectedStartMin}
            onChange={handleSliderChange}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-center mt-2 text-[10px] text-primary uppercase tracking-widest ">
          
            <span>Drag to Adjust Time</span>
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

