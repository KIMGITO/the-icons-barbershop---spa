import { StaffBusinessProfile } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
    weekdays: row.opening_hours?.weekdays || '',
    saturday: row.opening_hours?.saturday || '',
    sunday: row.opening_hours?.sunday || ''
  },
  socialLinks: {
    whatsapp: row.social_links?.whatsapp || '',
    instagram: row.social_links?.instagram || '',
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