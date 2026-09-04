import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  minutesToTimeString,
  calculateEndTime,
  formatTimeRange,
  checkBookingConflict,
  generateTimeSlots,
} from '../timeUtils';
import type { StaffBooking } from '../../types/staff';

describe('timeUtils', () => {
  describe('parseTimeToMinutes', () => {
    it('parses 12-hour AM times', () => {
      expect(parseTimeToMinutes('10:30 AM')).toBe(630);
    });

    it('parses 12-hour PM times', () => {
      expect(parseTimeToMinutes('02:15 PM')).toBe(855);
    });

    it('parses midnight correctly', () => {
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
    });

    it('parses noon correctly', () => {
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
    });

    it('parses 24-hour times', () => {
      expect(parseTimeToMinutes('14:30')).toBe(870);
    });

    it('returns 0 for invalid input', () => {
      expect(parseTimeToMinutes('not-a-time')).toBe(0);
    });
  });

  describe('minutesToTimeString', () => {
    it('formats 12-hour display', () => {
      expect(minutesToTimeString(630)).toBe('10:30 AM');
      expect(minutesToTimeString(855)).toBe('02:15 PM');
      expect(minutesToTimeString(0)).toBe('12:00 AM');
      expect(minutesToTimeString(720)).toBe('12:00 PM');
    });

    it('formats 24-hour display', () => {
      expect(minutesToTimeString(630, '24')).toBe('10:30');
      expect(minutesToTimeString(870, '24')).toBe('14:30');
    });

    it('clamps out-of-range minutes', () => {
      expect(minutesToTimeString(-5)).toBe('12:00 AM');
      expect(minutesToTimeString(24 * 60 + 5)).toBe('11:59 PM');
    });
  });

  describe('calculateEndTime', () => {
    it('calculates end time for a 60-minute service starting at 10:30 AM', () => {
      expect(calculateEndTime('10:30 AM', 60)).toBe('11:30 AM');
    });

    it('calculates end time crossing the hour boundary', () => {
      expect(calculateEndTime('10:30 AM', 30)).toBe('11:00 AM');
    });

    it('calculates end time crossing noon', () => {
      expect(calculateEndTime('11:45 AM', 30)).toBe('12:15 PM');
    });

    it('calculates end time crossing PM boundary', () => {
      expect(calculateEndTime('02:00 PM', 90)).toBe('03:30 PM');
    });
  });

  describe('formatTimeRange', () => {
    it('formats a human-readable range', () => {
      expect(formatTimeRange('10:00 AM', 60)).toBe('10:00 AM – 11:00 AM');
    });
  });

  describe('checkBookingConflict', () => {
    const existing: StaffBooking[] = [
      {
        id: 'bk-1',
        referenceNumber: 'ICN-1',
        customerName: 'John',
        customerPhone: '0722',
        customerEmail: 'john@example.com',
        serviceIds: [],
        serviceNames: ['Haircut'],
        providerId: 'p1',
        providerName: 'Provider 1',
        date: '2026-08-31',
        timeSlot: '10:00 AM',
        endTime: '11:00 AM',
        durationMinutes: 60,
        totalPriceKsh: 1000,
        depositPaidKsh: 500,
        remainingBalanceKsh: 500,
        status: 'confirmed',
        paymentStatus: 'deposit-paid',
        paymentMethod: 'mpesa',
        createdAt: '2026-08-30T10:00:00Z',
      },
    ];

    it('detects no conflict for a different provider', () => {
      const result = checkBookingConflict(existing, 'p2', '2026-08-31', '10:30 AM', 60);
      expect(result.hasConflict).toBe(false);
    });

    it('detects no conflict for a different date', () => {
      const result = checkBookingConflict(existing, 'p1', '2026-09-01', '10:30 AM', 60);
      expect(result.hasConflict).toBe(false);
    });

    it('detects conflict when a new booking overlaps', () => {
      const result = checkBookingConflict(existing, 'p1', '2026-08-31', '10:30 AM', 60);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBooking?.id).toBe('bk-1');
    });

    it('detects conflict at the exact start boundary', () => {
      const result = checkBookingConflict(existing, 'p1', '2026-08-31', '10:00 AM', 30);
      expect(result.hasConflict).toBe(true);
    });

    it('allows a booking that starts exactly when the existing ends', () => {
      const result = checkBookingConflict(existing, 'p1', '2026-08-31', '11:00 AM', 60);
      expect(result.hasConflict).toBe(false);
    });

    it('excludes the booking being edited', () => {
      const result = checkBookingConflict(existing, 'p1', '2026-08-31', '10:30 AM', 60, 'bk-1');
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('generateTimeSlots', () => {
    it('generates 5-minute slots between opening hours', () => {
      const slots = generateTimeSlots(8, 10, 5);
      expect(slots.length).toBe(24);
      expect(slots[0]).toBe('08:00 AM');
      expect(slots[slots.length - 1]).toBe('09:55 AM');
    });

    it('generates empty slots for invalid range', () => {
      expect(generateTimeSlots(10, 8)).toEqual([]);
    });
  });
});