import { StaffBooking } from '../types/staff';

export const NAIROBI_TIMEZONE = 'Africa/Nairobi';
export const SLOT_INTERVAL_MINUTES = 5;

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const min = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour * 60 + min;
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return 0;
}

export function minutesToTimeString(minutes: number, format: '12' | '24' = '24'): string {
  const boundedMin = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const hour24 = Math.floor(boundedMin / 60);
  const min = boundedMin % 60;
  const minStr = min < 10 ? `0${min}` : `${min}`;

  if (format === '24') {
    const hrStr = hour24 < 10 ? `0${hour24}` : `${hour24}`;
    return `${hrStr}:${minStr}`;
  }

  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const hrStr = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  return `${hrStr}:${minStr} ${meridiem}`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTimeString(parseTimeToMinutes(startTime) + durationMinutes);
}

export function formatTimeRange(startTime: string, durationMinutes: number, format: '12' | '24' = '24'): string {
  const endTime = calculateEndTime(startTime, durationMinutes);
  if (format === '12') {
    return `${minutesToTimeString(parseTimeToMinutes(startTime), '12')} – ${minutesToTimeString(parseTimeToMinutes(endTime), '12')}`;
  }
  return `${startTime} – ${endTime}`;
}

export function checkBookingConflict(
  existingBookings: StaffBooking[],
  providerId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: StaffBooking } {
  if (!providerId || !date || !startTime || durationMinutes <= 0) {
    return { hasConflict: false };
  }

  const newStartMin = parseTimeToMinutes(startTime);
  const newEndMin = newStartMin + durationMinutes;

  for (const b of existingBookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === 'cancelled' || b.status === 'no-show') continue;
    if (b.providerId !== providerId) continue;
    if (b.date !== date) continue;

    const bStartMin = parseTimeToMinutes(b.timeSlot);
    const bEndMin = b.endTime ? parseTimeToMinutes(b.endTime) : (bStartMin + (b.durationMinutes || 60));

    if (newStartMin < bEndMin && newEndMin > bStartMin) {
      return { hasConflict: true, conflictingBooking: b };
    }
  }

  return { hasConflict: false };
}

export function generateTimeSlots(startHour = 8, endHour = 20, intervalMinutes = SLOT_INTERVAL_MINUTES): string[] {
  const slots: string[] = [];
  for (let min = startHour * 60; min < endHour * 60; min += intervalMinutes) {
    slots.push(minutesToTimeString(min, '24'));
  }
  return slots;
}

export function generateTimeSlotsFromRange(rangeStr: string, intervalMinutes = SLOT_INTERVAL_MINUTES): string[] {
  const parts = rangeStr.split(/\s*[–—-]\s*/);
  if (parts.length < 2) return generateTimeSlots(8, 20, intervalMinutes);
  const startHour = Math.floor(parseTimeToMinutes(parts[0]) / 60);
  const endHour = Math.ceil(parseTimeToMinutes(parts[1]) / 60);
  return generateTimeSlots(startHour, endHour, intervalMinutes);
}

export function snapToSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.round(timeMinutes / intervalMinutes) * intervalMinutes;
}

export function getNextSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.ceil(timeMinutes / intervalMinutes) * intervalMinutes;
}

export function getPreviousSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.floor(timeMinutes / intervalMinutes) * intervalMinutes;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeDisplay(timeStr: string): string {
  const min = parseTimeToMinutes(timeStr);
  if (min < 0) return timeStr;
  return minutesToHHMM(min);
}

export function parseHoursRange(range: { start: string; end: string } | string): { open: number; close: number } {
  // New format: TimeRange object with HH:MM 24h strings
  if (range && typeof range === 'object' && typeof range.start === 'string' && typeof range.end === 'string') {
    const open = parseTimeToMinutes(range.start);
    const close = parseTimeToMinutes(range.end);
    if (open < 0 || close < 0) return { open: 8 * 60, close: 20 * 60 + 30 };
    return { open, close };
  }
  // Legacy format: string like "09:00 AM – 06:00 PM"
  if (typeof range === 'string') {
    const parts = range.split(/\s*[–—-]\s*/);
    if (parts.length < 2) return { open: 8 * 60, close: 20 * 60 + 30 };
    return {
      open: parseTimeToMinutes(parts[0]),
      close: parseTimeToMinutes(parts[1]),
    };
  }
  return { open: 8 * 60, close: 20 * 60 + 30 };
}

export function createNairobiTimestamp(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+03:00`).toISOString();
}

export function parseNairobiTimestamp(isoTimestamp: string): { date: string; time: string; minutes: number } {
  const date = new Date(isoTimestamp);
  const nairobiStr = date.toLocaleString('en-US', { timeZone: NAIROBI_TIMEZONE });
  const nairobiDate = new Date(nairobiStr);
  
  const year = nairobiDate.getFullYear();
  const month = String(nairobiDate.getMonth() + 1).padStart(2, '0');
  const day = String(nairobiDate.getDate()).padStart(2, '0');
  const hours = nairobiDate.getHours();
  const minutes = nairobiDate.getMinutes();
  
  return {
    date: `${year}-${month}-${day}`,
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    minutes: hours * 60 + minutes
  };
}

export function getNairobiNow(): Date {
  const now = new Date();
  const nairobiStr = now.toLocaleString('en-US', { timeZone: NAIROBI_TIMEZONE });
  return new Date(nairobiStr);
}

export function getNairobiMinutesNow(): number {
  const nairobiNow = getNairobiNow();
  return nairobiNow.getHours() * 60 + nairobiNow.getMinutes();
}

export function isTodayInNairobi(dateStr: string): boolean {
  const nairobiNow = getNairobiNow();
  const year = nairobiNow.getFullYear();
  const month = String(nairobiNow.getMonth() + 1).padStart(2, '0');
  const day = String(nairobiNow.getDate()).padStart(2, '0');
  return dateStr === `${year}-${month}-${day}`;
}

export function suggestNextFreeStart(
  fromMin: number,
  busyRanges: { start: number; end: number }[],
  totalDuration: number,
  closeMin: number,
  intervalMinutes = SLOT_INTERVAL_MINUTES
): number {
  const start = Math.ceil(fromMin / intervalMinutes) * intervalMinutes;
  for (let m = start; m <= closeMin; m += intervalMinutes) {
    const e = m + totalDuration;
    if (!busyRanges.some((r) => m < r.end && e > r.start)) return m;
  }
  return -1;
}