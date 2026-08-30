import { StaffBusinessProfile } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BUSINESS_INFO } from '../data/initialData';

const BUSINESS_STORAGE_KEY = 'theicons_business_info';

const mapDbBusiness = (row: any): StaffBusinessProfile => ({
  name: row.name,
  description: row.description || '',
  phone: row.phone || '',
  email: row.email || '',
  address: row.address || '',
  neighborhood: row.neighborhood || '',
  city: row.city || '',
  locationDetails: row.location_details || '',
  openingHours: {
    weekdays: row.opening_hours?.weekdays || BUSINESS_INFO.hours.weekdays,
    saturday: row.opening_hours?.saturday || BUSINESS_INFO.hours.saturday,
    sunday: row.opening_hours?.sunday || BUSINESS_INFO.hours.sunday
  },
  socialLinks: {
    whatsapp: row.social_links?.whatsapp || BUSINESS_INFO.whatsapp,
    instagram: row.social_links?.instagram || '@theiconsbarber.ke',
    facebook: row.social_links?.facebook || ''
  },
  logoUrl: row.logo_url || '',
  coverImageUrl: row.cover_image_url || ''
});

export const businessService = {
  /**
   * Fetch business profile from database
   */
  async getBusinessProfile(): Promise<StaffBusinessProfile> {
    if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, 150));
      try {
        const raw = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.name) return parsed;
        }
      } catch {}
      const fallback = {
        name: BUSINESS_INFO.name,
        description: BUSINESS_INFO.tagline,
        phone: BUSINESS_INFO.phoneDisplay,
        email: BUSINESS_INFO.email,
        address: `${BUSINESS_INFO.address.street}, ${BUSINESS_INFO.address.suite}`,
        neighborhood: BUSINESS_INFO.address.neighborhood,
        city: BUSINESS_INFO.address.city,
        locationDetails: "Located at Four Ways Village on Kiambu Road. Convenient executive parking and private penthouse access.",
        openingHours: {
          weekdays: BUSINESS_INFO.hours.weekdays,
          saturday: BUSINESS_INFO.hours.saturday,
          sunday: BUSINESS_INFO.hours.sunday
        },
        socialLinks: {
          whatsapp: BUSINESS_INFO.whatsapp,
          instagram: "@theiconsbarber.ke",
          facebook: "The Icons Barber & Spa Nairobi"
        },
        logoUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"
      };
      localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
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