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

    for (const entry of raw) {
      if (!entry.is_open) continue;
      const range = { start: entry.open_time, end: entry.close_time };
      switch (entry.weekday) {
        case 0: result.sunday = range; break;
        case 1: case 2: case 3: case 4: result.weekdays = range; break;
        case 5: result.weekdays = range; break; // Friday
        case 6: result.saturday = range; break;
      }
    }

    return result;
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
    return mapDbBusiness(data);
  }
};