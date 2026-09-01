import { StaffBusinessProfile } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { parseTimeToMinutes, minutesToHHMM } from '../utils/timeUtils';

const BUSINESS_STORAGE_KEY = 'theicons_business_info';

const DEFAULT_HOURS = {
  weekdays: { start: '09:00', end: '18:00' },
  saturday: { start: '09:00', end: '16:00' },
  sunday: { start: '10:00', end: '14:00' }
};

export interface BusinessHoursEntry {
  weekday: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface BusinessHoursResult {
  weekdays: { start: string; end: string };
  saturday: { start: string; end: string };
  sunday: { start: string; end: string };
  raw: BusinessHoursEntry[];
}

const normalizeTimeRange = (val: any): { start: string; end: string } => {
  if (val && typeof val === 'object' && typeof val.start === 'string' && typeof val.end === 'string') {
    return { start: val.start, end: val.end };
  }
  if (typeof val === 'string' && val.includes('–')) {
    const parts = val.split(/\s*[–—-]\s*/);
    if (parts.length >= 2) {
      const startMin = parseTimeToMinutes(parts[0]);
      const endMin = parseTimeToMinutes(parts[1]);
      if (startMin >= 0 && endMin >= 0) {
        return { start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) };
      }
    }
  }
  return { start: '09:00', end: '18:00' };
};

const mapDbBusiness = (row: any): StaffBusinessProfile => {
  const oh = row.opening_hours || {};
  return {
    name: row.name,
    description: row.description || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    locationDetails: row.location_details || '',
    openingHours: {
      weekdays: normalizeTimeRange(oh.weekdays ?? DEFAULT_HOURS.weekdays),
      saturday: normalizeTimeRange(oh.saturday ?? DEFAULT_HOURS.saturday),
      sunday: normalizeTimeRange(oh.sunday ?? DEFAULT_HOURS.sunday)
    },
    socialLinks: {
      whatsapp: row.social_links?.whatsapp || '',
      instagram: row.social_links?.instagram || '',
      facebook: row.social_links?.facebook || ''
    },
    logoUrl: row.logo_url || '',
    coverImageUrl: row.cover_image_url || ''
  };
};

export const businessService = {
  /**
   * Fetch business hours from the business_hours table.
   * This is the SAME source used by the check_and_reserve database function,
   * ensuring frontend and backend validation are consistent.
   */
  async getBusinessHours(): Promise<BusinessHoursResult> {
    if (!isSupabaseConfigured) {
      return {
        weekdays: { ...DEFAULT_HOURS.weekdays },
        saturday: { ...DEFAULT_HOURS.saturday },
        sunday: { ...DEFAULT_HOURS.sunday },
        raw: []
      };
    }

    const { data, error } = await supabase
      .from('business_hours')
      .select('weekday, open_time, close_time, is_open')
      .eq('business_id', '00000000-0000-0000-0000-000000000001')
      .order('weekday');

    if (error) {
      console.error('Failed to fetch business hours:', error.message);
      return {
        weekdays: { ...DEFAULT_HOURS.weekdays },
        saturday: { ...DEFAULT_HOURS.saturday },
        sunday: { ...DEFAULT_HOURS.sunday },
        raw: []
      };
    }

    const raw: BusinessHoursEntry[] = data || [];
    const result: BusinessHoursResult = {
      weekdays: { ...DEFAULT_HOURS.weekdays },
      saturday: { ...DEFAULT_HOURS.saturday },
      sunday: { ...DEFAULT_HOURS.sunday },
      raw
    };

    // NOTE: business_hours stores one independent row per weekday
    // (0=Sun..6=Sat), but the settings UI only exposes 3 buckets
    // (weekdays / saturday / sunday). Bug fix: this used to assign
    // `result.weekdays` inside the loop for weekday 1,2,3,4,5 in
    // ascending order, so it was silently overwritten on every
    // iteration and ended up holding whichever weekday was processed
    // LAST (Friday) — not necessarily representative of Mon-Thu.
    // Monday is used as the canonical representative for the
    // "weekdays" bucket below. Callers that need the exact hours for
    // a specific date should use getHoursForWeekday()/raw instead of
    // this collapsed bucket, since Mon-Fri are not guaranteed to be
    // identical in the underlying table.
    for (const entry of raw) {
      if (!entry.is_open) continue;
      const range = { start: entry.open_time, end: entry.close_time };
      if (entry.weekday === 0) result.sunday = range;
      else if (entry.weekday === 1) result.weekdays = range; // Monday = canonical "weekdays" representative
      else if (entry.weekday === 6) result.saturday = range;
    }

    return result;
  },

  /**
   * Look up the exact business hours for a specific weekday (0=Sun..6=Sat)
   * directly from the raw per-weekday rows, with no bucket-collapsing.
   * This is what the booking UI should use to validate a selected slot,
   * since it mirrors exactly what check_and_reserve checks server-side.
   * Returns null if the business is closed that day or no row exists.
   */
  getHoursForWeekday(
    hours: BusinessHoursResult | null,
    weekday: number
  ): { start: string; end: string } | null {
    if (!hours) return null;
    const entry = hours.raw.find((e) => e.weekday === weekday);
    if (entry && entry.is_open) {
      return { start: entry.open_time, end: entry.close_time };
    }
    if (entry && !entry.is_open) return null; // explicitly closed that day
    // No row for this weekday at all (e.g. business_hours not yet
    // synced) — fall back to the collapsed bucket so the UI degrades
    // gracefully instead of showing "closed all day".
    if (weekday === 0) return hours.sunday;
    if (weekday === 6) return hours.saturday;
    return hours.weekdays;
  },

  /**
   * Fetch business profile from database
   */
  async getBusinessProfile(): Promise<StaffBusinessProfile> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    const { data, error } = await supabase.from('businesses').select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error('Business profile not found.');
    }
    return mapDbBusiness(data);
  },

  /**
   * Update business profile in database
   */
  async updateBusinessProfile(updates: Partial<StaffBusinessProfile>): Promise<StaffBusinessProfile> {
    if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, 250));
      const current = await this.getBusinessProfile();
      const updated: StaffBusinessProfile = {
        ...current,
        ...updates,
        openingHours: {
          ...current.openingHours,
          ...(updates.openingHours || {})
        },
        socialLinks: {
          ...current.socialLinks,
          ...(updates.socialLinks || {})
        }
      };
      localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }

    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.description !== undefined) db.description = updates.description;
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.email !== undefined) db.email = updates.email;
    if (updates.address !== undefined) db.address = updates.address;
    if (updates.neighborhood !== undefined) db.neighborhood = updates.neighborhood;
    if (updates.city !== undefined) db.city = updates.city;
    if (updates.locationDetails !== undefined) db.location_details = updates.locationDetails;
    if (updates.openingHours !== undefined) {
      db.opening_hours = {
        weekdays: updates.openingHours.weekdays,
        saturday: updates.openingHours.saturday,
        sunday: updates.openingHours.sunday
      };
    }
    if (updates.socialLinks !== undefined) db.social_links = updates.socialLinks;
    if (updates.logoUrl !== undefined) db.logo_url = updates.logoUrl;
    if (updates.coverImageUrl !== undefined) db.cover_image_url = updates.coverImageUrl;

    const { data, error } = await supabase.from('businesses').update(db).eq('id', '00000000-0000-0000-0000-000000000001').select().single();
    if (error) throw new Error(error.message);

    // The business_hours table (read by check_and_reserve /
    // get_available_slots on the backend) is kept in sync by a
    // database trigger whenever opening_hours changes (see migration
    // 0038). That trigger is the source of truth and covers every
    // write path, but we also upsert it directly here so the UI's
    // own booking preview reflects the change immediately within the
    // same session, without waiting on a refetch.
    if (updates.openingHours !== undefined) {
      const rows = [
        { weekday: 0, open_time: db.opening_hours.sunday.start, close_time: db.opening_hours.sunday.end, is_open: true },
        { weekday: 1, open_time: db.opening_hours.weekdays.start, close_time: db.opening_hours.weekdays.end, is_open: true },
        { weekday: 2, open_time: db.opening_hours.weekdays.start, close_time: db.opening_hours.weekdays.end, is_open: true },
        { weekday: 3, open_time: db.opening_hours.weekdays.start, close_time: db.opening_hours.weekdays.end, is_open: true },
        { weekday: 4, open_time: db.opening_hours.weekdays.start, close_time: db.opening_hours.weekdays.end, is_open: true },
        { weekday: 5, open_time: db.opening_hours.weekdays.start, close_time: db.opening_hours.weekdays.end, is_open: true },
        { weekday: 6, open_time: db.opening_hours.saturday.start, close_time: db.opening_hours.saturday.end, is_open: true },
      ].map((r) => ({ ...r, business_id: '00000000-0000-0000-0000-000000000001' }));

      const { error: hoursError } = await supabase
        .from('business_hours')
        .upsert(rows, { onConflict: 'business_id,weekday' });
      if (hoursError) {
        // Non-fatal: the DB trigger will still apply the change.
        console.error('Failed to eagerly sync business_hours:', hoursError.message);
      }
    }

    return mapDbBusiness(data);
  }
};