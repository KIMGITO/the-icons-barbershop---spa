import { StaffBooking } from '../types/staff';

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
 */
export function minutesToTimeString(minutes: number, format: '12' | '24' = '12'): string {
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
 * Formats a clean time range e.g. "10:00 – 11:00 AM" or "10:00 – 11:15"
 */
export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const endTime = calculateEndTime(startTime, durationMinutes);
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
 * Generate 15-minute time slots for business operating hours (default 08:00 to 20:00)
 */
export function generateTimeSlots(
  startHour = 8, 
  endHour = 20, 
  intervalMinutes = 15
): string[] {
  const slots: string[] = [];
  const startTotal = startHour * 60;
  const endTotal = endHour * 60;

  for (let min = startTotal; min < endTotal; min += intervalMinutes) {
    slots.push(minutesToTimeString(min));
  }

  return slots;
}
