import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { paymentService } from '../paymentService';

describe('paymentService', () => {
  describe('calculateDeposit', () => {
    it('calculates 50% minimum deposit for a 1000 KSh service', () => {
      const res = paymentService.calculateDeposit(1000);
      expect(res.totalKsh).toBe(1000);
      expect(res.minimumDepositKsh).toBe(500);
      expect(res.remainingKsh).toBe(1000);
      expect(res.depositPercentage).toBe(50);
    });

    it('calculates remaining after paying the minimum deposit', () => {
      const res = paymentService.calculateDeposit(1000, 500);
      expect(res.remainingKsh).toBe(500);
    });

    it('rounds odd totals up for the minimum deposit', () => {
      const res = paymentService.calculateDeposit(1500, 750);
      expect(res.totalKsh).toBe(1500);
      expect(res.minimumDepositKsh).toBe(750);
      expect(res.remainingKsh).toBe(750);
    });

    it('clamps negative totals to zero', () => {
      const res = paymentService.calculateDeposit(-100);
      expect(res.totalKsh).toBe(0);
      expect(res.minimumDepositKsh).toBe(0);
      expect(res.remainingKsh).toBe(0);
    });

    it('never returns a negative remaining balance', () => {
      const res = paymentService.calculateDeposit(1000, 1500);
      expect(res.remainingKsh).toBe(0);
    });

    it('rounds total to the nearest whole KSh', () => {
      const res = paymentService.calculateDeposit(999.6);
      expect(res.totalKsh).toBe(1000);
    });
  });

  describe('formatKenyanPhone', () => {
    it('accepts 07XX format', () => {
      const res = paymentService.formatKenyanPhone('0712345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('254712345678');
    });

    it('accepts 01XX format', () => {
      const res = paymentService.formatKenyanPhone('0112345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('254112345678');
    });

    it('accepts +254 format', () => {
      const res = paymentService.formatKenyanPhone('+254712345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('254712345678');
    });

    it('accepts 254 format (no plus)', () => {
      const res = paymentService.formatKenyanPhone('254712345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('254712345678');
    });

    it('rejects invalid numbers', () => {
      const res = paymentService.formatKenyanPhone('123');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('strips spaces and dashes', () => {
      const res = paymentService.formatKenyanPhone('0712 345-678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('254712345678');
    });
  });

  describe('formatSafaricomDisplayPhone', () => {
    it('formats local 07XX to +254 international', () => {
      const res = paymentService.formatSafaricomDisplayPhone('0712345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('+254712345678');
      expect(res.local).toBe('0712345678');
    });

    it('formats 254 to +254', () => {
      const res = paymentService.formatSafaricomDisplayPhone('254712345678');
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe('+254712345678');
    });

    it('rejects invalid phones', () => {
      const res = paymentService.formatSafaricomDisplayPhone('999');
      expect(res.valid).toBe(false);
    });
  });

  describe('initiateMpesaStkPush', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('rejects invalid phone format before calling the API', async () => {
      await expect(
        paymentService.initiateMpesaStkPush({
          phoneNumber: '123',
          amountKsh: 500,
          bookingId: 'bk-1',
          referenceNumber: 'ICN-1',
          customerName: 'Test',
        }),
      ).rejects.toThrow('valid');
    });

    it('rejects zero/negative amounts', async () => {
      await expect(
        paymentService.initiateMpesaStkPush({
          phoneNumber: '0712345678',
          amountKsh: 0,
          bookingId: 'bk-1',
          referenceNumber: 'ICN-1',
          customerName: 'Test',
        }),
      ).rejects.toThrow('greater than');
    });
  });
});
