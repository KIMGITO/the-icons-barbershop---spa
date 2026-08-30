import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ServiceProvider, DaySchedule, DAYS_OF_WEEK } from '../types/staff';

export const createDefaultSchedule = (): DaySchedule[] => {
  return DAYS_OF_WEEK.map(day => ({
    day: day.key,
    isWorking: day.key !== 'sunday', // Sunday off by default
    startTime: '08:30',
    endTime: '18:30',
    breaks: [
      { start: '13:00', end: '14:00' }
    ]
  }));
};

const mapDbProvider = (row: any): ServiceProvider => ({
  id: row.id,
  slug: row.slug,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: row.full_name,
  email: row.email || '',
  phone: row.phone || '',
  providerType: row.provider_type || 'barber',
  bio: row.bio || '',
  avatarUrl: row.avatar_url || '',
  status: row.status === 'inactive' ? 'inactive' : 'active',
  servicesOfferedIds: row.services_offered_ids || [],
  schedule: row.schedule || [],
  yearsExperience: row.years_experience,
  rating: row.rating,
  instagramHandle: row.instagram_handle
});

export const providerService = {
  /**
   * Fetch all service providers from the database
   */
  async getProviders(): Promise<ServiceProvider[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    const { data, error } = await supabase.from('service_providers').select('*').order('full_name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbProvider);
  },

  async getActiveProviders(): Promise<ServiceProvider[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('service_providers').select('*').eq('status', 'active').order('full_name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbProvider);
  },

  async getProviderById(id: string): Promise<ServiceProvider | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.from('service_providers').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapDbProvider(data) : null;
  },

  async createProvider(providerData: Omit<ServiceProvider, 'id' | 'slug'>): Promise<ServiceProvider> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const session = await supabase.auth.getSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/create-staff';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`
      },
      body: JSON.stringify({
        email: providerData.email,
        password: 'Welcome@' + Math.floor(100 + Math.random() * 900), // Secure default temp password
        fullName: providerData.fullName || `${providerData.firstName} ${providerData.lastName}`,
        role: 'provider',
        phone: providerData.phone,
        providerFirstName: providerData.firstName,
        providerLastName: providerData.lastName,
        providerType: providerData.providerType,
        bio: providerData.bio,
        avatarUrl: providerData.avatarUrl,
        yearsExperience: providerData.yearsExperience
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create provider/staff.');
    }

    let providerId = data.providerId;

    // Fallback: if edge function didn't return a providerId, look it up by email
    if (!providerId) {
      const { data: existing, error: lookupErr } = await supabase
        .from('service_providers')
        .select('id')
        .eq('email', providerData.email)
        .maybeSingle();
      if (!lookupErr && existing?.id) {
        providerId = existing.id;
      }
    }

    if (!providerId) {
      throw new Error('Failed to create provider profile. Please check staff account was created and retry.');
    }

    // Perform an update to save the schedule and services offered array which are not handled by the edge function
    const updated = await this.updateProvider(providerId, {
      servicesOfferedIds: providerData.servicesOfferedIds || [],
      schedule: providerData.schedule && providerData.schedule.length > 0 ? providerData.schedule : createDefaultSchedule()
    });

    return updated;
  },

  async updateProvider(id: string, updates: Partial<ServiceProvider>): Promise<ServiceProvider> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const db: any = {};
    if (updates.firstName !== undefined) db.first_name = updates.firstName;
    if (updates.lastName !== undefined) db.last_name = updates.lastName;
    if (updates.fullName !== undefined) {
      db.full_name = updates.fullName;
    } else if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const current = await this.getProviderById(id);
      db.full_name = `${updates.firstName ?? current?.firstName ?? ''} ${updates.lastName ?? current?.lastName ?? ''}`.trim();
    }
    if (updates.email !== undefined) db.email = updates.email;
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.providerType !== undefined) db.provider_type = updates.providerType;
    if (updates.bio !== undefined) db.bio = updates.bio;
    if (updates.avatarUrl !== undefined) db.avatar_url = updates.avatarUrl;
    if (updates.status !== undefined) db.status = updates.status;
    if (updates.servicesOfferedIds !== undefined) db.services_offered_ids = updates.servicesOfferedIds;
    if (updates.schedule !== undefined) db.schedule = updates.schedule;
    if (updates.yearsExperience !== undefined) db.years_experience = updates.yearsExperience;
    if (updates.rating !== undefined) db.rating = updates.rating;
    if (updates.instagramHandle !== undefined) db.instagram_handle = updates.instagramHandle;

    const { data: updated, error } = await supabase.from('service_providers').update(db).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapDbProvider(updated);
  },

  async toggleProviderStatus(id: string): Promise<ServiceProvider> {
    const provider = await this.getProviderById(id);
    if (!provider) throw new Error('Provider not found');
    const nextStatus = provider.status === 'active' ? 'inactive' : 'active';
    return this.updateProvider(id, { status: nextStatus });
  },

  /**
   * Update provider schedule using database RPC function
   */
  async updateProviderSchedule(id: string, schedule: DaySchedule[]): Promise<ServiceProvider> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { error } = await supabase.rpc('update_provider_schedule', {
      p_provider_id: id,
      p_schedule: schedule
    });
    if (error) throw new Error(error.message);
    return this.updateProvider(id, { schedule });
  },

  async deleteProvider(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('service_providers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  /**
   * Get schedule blocks (breaks/days off/holidays) for a provider
   */
  async getScheduleBlocks(providerId: string): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('provider_id', providerId)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Add a schedule block (break, day off, holiday)
   */
  async addScheduleBlock(data: {
    providerId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
    notes?: string;
  }): Promise<any> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { data: created, error } = await supabase.from('schedule_blocks').insert({
      provider_id: data.providerId,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      reason: data.reason,
      notes: data.notes || null
    }).select().single();
    if (error) throw new Error(error.message);
    return created;
  },

  async deleteScheduleBlock(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('schedule_blocks').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
};