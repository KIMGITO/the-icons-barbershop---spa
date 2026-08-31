import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// ============================================================
// EMPTY DATABASE STATE TESTS
//
// These tests verify that the application does NOT fall back to
// hard-coded business data when the database contains zero records.
// ============================================================

describe('Empty Database States', () => {
  it('SafeImage DEFAULT_IMAGE is a neutral placeholder (no fake business photo)', () => {
    const { DEFAULT_IMAGE } = await import('@/components/ui/SafeImage');
    expect(DEFAULT_IMAGE.startsWith('data:image/svg+xml')).toBe(true);
    expect(DEFAULT_IMAGE).not.toContain('images.unsplash.com');
  });

  it('No fake data file remains (initialData.ts deleted)', () => {
    const filePath = path.resolve(__dirname, '../src/data/initialData.ts');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('No SEEDED_STAFF_ACCOUNTS remain in authService', () => {
    const mod = await import('@/services/authService');
    expect(mod.authService).toBeDefined();
    expect(mod.SEEDED_STAFF_ACCOUNTS).toBeUndefined();
    expect(mod.DEMO_CREDENTIALS).toBeUndefined();
  });

  it('bookingService does not export createInitialStaffBookings', () => {
    const mod = await import('@/services/bookingService');
    expect(mod.createInitialStaffBookings).toBeUndefined();
    expect(mod.BOOKINGS_STORAGE_KEY).toBeUndefined();
  });

  it('productService does not reference localStorage fallback', () => {
    const mod = await import('@/services/productService');
    expect(mod.PRODUCTS_STORAGE_KEY).toBeUndefined();
  });
});
