import { StaffBooking } from '../types/staff';

// ============================================================
// UNIFIED TIME SYSTEM: 2-hour intervals, Africa/Nairobi (UTC+3)
// ============================================================

export const NAIROBI_TIMEZONE = 'Africa/Nairobi';
export const SLOT_INTERVAL_HOURS = 2;
export const SLOT_INTERVAL_MINUTES = SLOT_INTERVAL_HOURS * 60; // 120 minutes

/**
 * Parse time string ("10:30 AM", "02:15 PM", "14:30") into total minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  
  // 12-hour AM/PM pattern
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const min = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour * 60 + min;
  }

  // 24-hour pattern
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const min = parseInt(match24[2], 10);
    return hour * 60 + min;
  }

  return 0;
}

/**
 * Convert minutes from midnight to formatted time string
 * Uses 24-hour format by default for consistency with the 2hr system
 */
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

/**
 * Calculate booking end time from startTime and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = startMin + durationMinutes;
  return minutesToTimeString(endMin);
}

/**
 * Formats a clean time range e.g. "10:00 – 12:00" (24hr) or "10:00 AM – 12:00 PM" (12hr)
 */
export function formatTimeRange(startTime: string, durationMinutes: number, format: '12' | '24' = '24'): string {
  const endTime = calculateEndTime(startTime, durationMinutes);
  if (format === '12') {
    return `${minutesToTimeString(parseTimeToMinutes(startTime), '12')} – ${minutesToTimeString(parseTimeToMinutes(endTime), '12')}`;
  }
  return `${startTime} – ${endTime}`;
}

/**
 * Check if a provider has an overlapping active booking
 */
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

    // Overlap: new booking starts before existing ends, and ends after existing starts
    if (newStartMin < bEndMin && newEndMin > bStartMin) {
      return { hasConflict: true, conflictingBooking: b };
    }
  }

  return { hasConflict: false };
}

/**
 * Generate 2-hour time slots for business operating hours (default 08:00 to 20:00)
 * All times are in Nairobi timezone (UTC+3)
 */
export function generateTimeSlots(
  startHour = 8, 
  endHour = 20, 
  intervalMinutes = SLOT_INTERVAL_MINUTES
): string[] {
  const slots: string[] = [];
  const startTotal = startHour * 60;
  const endTotal = endHour * 60;

  for (let min = startTotal; min < endTotal; min += intervalMinutes) {
    slots.push(minutesToTimeString(min, '24'));
  }

  return slots;
}

/**
 * Generate 2-hour time slots from a time range string like "08:00 – 20:00"
 */
export function generateTimeSlotsFromRange(
  rangeStr: string,
  intervalMinutes = SLOT_INTERVAL_MINUTES
): string[] {
  const parts = rangeStr.split(/\s*[–—-]\s*/);
  if (parts.length < 2) {
    return generateTimeSlots(8, 20, intervalMinutes);
  }
  const startMin = parseTimeToMinutes(parts[0]);
  const endMin = parseTimeToMinutes(parts[1]);
  const startHour = Math.floor(startMin / 60);
  const endHour = Math.ceil(endMin / 60);
  return generateTimeSlots(startHour, endHour, intervalMinutes);
}

/**
 * Snap a time to the nearest 2-hour slot boundary
 */
export function snapToSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.round(timeMinutes / intervalMinutes) * intervalMinutes;
}

/**
 * Get the next 2-hour slot from a given time
 */
export function getNextSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.ceil(timeMinutes / intervalMinutes) * intervalMinutes;
}

/**
 * Get the previous 2-hour slot from a given time
 */
export function getPreviousSlot(timeMinutes: number, intervalMinutes = SLOT_INTERVAL_MINUTES): number {
  return Math.floor(timeMinutes / intervalMinutes) * intervalMinutes;
}

/**
 * Format minutes to HH:MM (24-hour) string
 */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a time string for display (converts to 24-hour HH:MM format)
 */
export function formatTimeDisplay(timeStr: string): string {
  const min = parseTimeToMinutes(timeStr);
  if (min < 0) return timeStr;
  return minutesToHHMM(min);
}

/**
 * Parse an opening-hours range like "08:00 AM – 08:30 PM" or "08:00 – 20:30"
 */
export function parseHoursRange(range: string): { open: number; close: number } {
  const parts = range.split(/\s*[–—-]\s*/);
  if (parts.length < 2) {
    return { open: 8 * 60, close: 20 * 60 + 30 };
  }
  return {
    open: parseTimeToMinutes(parts[0]),
    close: parseTimeToMinutes(parts[1]),
  };
}

/**
 * Create a Nairobi-timezone ISO timestamp from a date and time
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM (24-hour) format
 * @returns ISO 8601 timestamp string
 */
export function createNairobiTimestamp(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+03:00`).toISOString();
}

/**
 * Convert an ISO timestamp to Nairobi-local time components
 */
export function parseNairobiTimestamp(isoTimestamp: string): { date: string; time: string; minutes: number } {
  const date = new Date(isoTimestamp);
  // Convert to Nairobi time
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

/**
 * Get current time in Nairobi
 */
export function getNairobiNow(): Date {
  const now = new Date();
  const nairobiStr = now.toLocaleString('en-US', { timeZone: NAIROBI_TIMEZONE });
  return new Date(nairobiStr);
}

/**
 * Get current Nairobi time in minutes from midnight
 */
export function getNairobiMinutesNow(): number {
  const nairobiNow = getNairobiNow();
  return nairobiNow.getHours() * 60 + nairobiNow.getMinutes();
}

/**
 * Check if a given date is today in Nairobi timezone
 */
export function isTodayInNairobi(dateStr: string): boolean {
  const nairobiNow = getNairobiNow();
  const year = nairobiNow.getFullYear();
  const month = String(nairobiNow.getMonth() + 1).padStart(2, '0');
  const day = String(nairobiNow.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return dateStr === todayStr;
}

/**
 * First minute >= fromMin where a full-duration window fits with no overlap.
 * Uses 2-hour slot snapping for suggestions.
 */
export function suggestNextFreeStart(
  fromMin: number,
  busyRanges: { start: number; end: number }[],
  totalDuration: number,
  closeMin: number,
  intervalMinutes = SLOT_INTERVAL_MINUTES
): number {
  // Snap to next slot boundary
  const start = Math.ceil(fromMin / intervalMinutes) * intervalMinutes;
  for (let m = start; m <= closeMin; m += intervalMinutes) {
    const e = m + totalDuration;
    if (!busyRanges.some((r) => m < r.end && e > r.start)) return m;
  }
  return -1;
}