import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ServiceItem } from '../types';
import { mapDbCategoryToFrontend, mapFrontendToDbCategory } from './categoryService';

/**
 * Resolve a service-category slug to its UUID primary key.
 * The database is the single source of truth for IDs; the slug is only
 * a display/business value.
 */
export const resolveServiceCategoryId = async (slug: string): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
};

const mapDbService = (row: any): ServiceItem => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: mapDbCategoryToFrontend(row.category || 'haircuts'),
  shortDescription: row.description || row.short_description || '',
  fullDescription: row.full_description || row.description || '',
  description: row.description || row.short_description || '',
  durationMinutes: row.duration_minutes || 30,
  priceKsh: Number(row.price_ksh || 0),
  features: row.features || [],
  imageUrl: row.image_url || '',
  isPopular: row.is_popular || false,
  recommendedFor: row.recommended_for || '',
  status: row.status,
  bufferMinutes: row.buffer_minutes || 0
});

export const serviceService = {
  /**
   * Fetch all services from the database
   */
  async getServices(): Promise<ServiceItem[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbService);
  },

  async getActiveServices(): Promise<ServiceItem[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { data, error } = await supabase.from('services').select('*').eq('status', 'active').order('name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbService);
  },

  async getServiceById(id: string): Promise<ServiceItem | null> {
    const list = await this.getServices();
    return list.find(s => s.id === id) || null;
  },

  /**
   * Get IDs of providers who can perform this service from provider_services join table
   */
  async getProvidersForService(serviceId: string): Promise<string[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select('provider_id')
        .eq('service_id', serviceId);
      if (error) throw new Error(error.message);
      return (data || []).map(r => r.provider_id);
    } catch (err) {
      console.error('Failed to get providers for service:', err);
      return [];
    }
  },

  /**
   * Associate providers with a service via the join table
   */
  async setProvidersForService(serviceId: string, providerIds: string[]): Promise<void> {
    if (!isSupabaseConfigured) return;

    // First delete existing relations
    const { error: deleteErr } = await supabase
      .from('provider_services')
      .delete()
      .eq('service_id', serviceId);
    if (deleteErr) throw new Error(deleteErr.message);

    // Then insert new relations
    if (providerIds.length > 0) {
      const rows = providerIds.map(providerId => ({ service_id: serviceId, provider_id: providerId }));
      const { error: insertErr } = await supabase.from('provider_services').insert(rows);
      if (insertErr) throw new Error(insertErr.message);
    }
  },

  async createService(
    serviceData: Omit<ServiceItem, 'id'>,
    providerIds: string[] = []
  ): Promise<ServiceItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const slug = serviceData.slug || serviceData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const normalizedCategory = mapFrontendToDbCategory(serviceData.category);
    const categoryId = await resolveServiceCategoryId(normalizedCategory);

    const session = await supabase.auth.getSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/manage-services';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`
      },
      body: JSON.stringify({
        action: 'create',
        payload: {
          slug,
          name: serviceData.name,
          category: normalizedCategory,
          categoryId,
          description: serviceData.shortDescription,
          shortDescription: serviceData.shortDescription,
          fullDescription: serviceData.fullDescription || serviceData.shortDescription,
          durationMinutes: serviceData.durationMinutes,
          bufferMinutes: serviceData.bufferMinutes || 10,
          priceKsh: serviceData.priceKsh,
          features: serviceData.features || [],
          imageUrl: serviceData.imageUrl || '',
          status: serviceData.status || 'active',
          isPopular: serviceData.isPopular || false,
          recommendedFor: serviceData.recommendedFor || ''
        },
        providerIds
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create service.');
    }

    return mapDbService(data.data);
  },

  async updateService(
    id: string,
    updates: Partial<ServiceItem>,
    providerIds?: string[]
  ): Promise<ServiceItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const formattedUpdates: any = {};
    if (updates.slug !== undefined) formattedUpdates.slug = updates.slug;
    if (updates.name !== undefined) formattedUpdates.name = updates.name;
    if (updates.category !== undefined) {
      const normalizedCategory = mapFrontendToDbCategory(updates.category);
      formattedUpdates.category = normalizedCategory;
      formattedUpdates.categoryId = await resolveServiceCategoryId(normalizedCategory);
    }
    if (updates.shortDescription !== undefined) formattedUpdates.description = updates.shortDescription;
    if (updates.shortDescription !== undefined) formattedUpdates.shortDescription = updates.shortDescription;
    if (updates.fullDescription !== undefined) formattedUpdates.fullDescription = updates.fullDescription;
    if (updates.durationMinutes !== undefined) formattedUpdates.durationMinutes = updates.durationMinutes;
    if (updates.bufferMinutes !== undefined) formattedUpdates.bufferMinutes = updates.bufferMinutes;
    if (updates.priceKsh !== undefined) formattedUpdates.priceKsh = updates.priceKsh;
    if (updates.features !== undefined) formattedUpdates.features = updates.features;
    if (updates.imageUrl !== undefined) formattedUpdates.imageUrl = updates.imageUrl;
    if (updates.status !== undefined) formattedUpdates.status = updates.status;
    if (updates.isPopular !== undefined) formattedUpdates.isPopular = updates.isPopular;
    if (updates.recommendedFor !== undefined) formattedUpdates.recommendedFor = updates.recommendedFor;

    const session = await supabase.auth.getSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/manage-services';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`
      },
      body: JSON.stringify({
        action: 'update',
        id,
        updates: formattedUpdates,
        providerIds
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update service.');
    }

    return mapDbService(data.data);
  },

  async deleteService(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const session = await supabase.auth.getSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + '/functions/v1/manage-services';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`
      },
      body: JSON.stringify({
        action: 'delete',
        id
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete service.');
    }

    return true;
  },

  /**
   * Calculate booking totals using database function
   */
  async calculateBookingTotals(serviceIds: string[]): Promise<{
    totalDurationMinutes: number;
    totalBufferMinutes: number;
    totalMinutes: number;
    totalPriceKsh: number;
    serviceNames: string[];
  }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { data, error } = await supabase.rpc('calculate_booking_totals', { p_service_ids: serviceIds });
    if (error) throw new Error(error.message);
    return {
      totalDurationMinutes: data?.total_duration_minutes || 0,
      totalBufferMinutes: data?.total_buffer_minutes || 0,
      totalMinutes: data?.total_minutes || 0,
      totalPriceKsh: Number(data?.total_price_ksh || 0),
      serviceNames: data?.service_names || []
    };
  },

  /**
   * Get available time slots for a provider on a date.
   * Slots are sized to the total duration of the requested services
   * so a booking's entire [start, start + duration) window is free.
   */
  async getAvailableTimeSlots(
    providerId: string,
    date: string,
    durationMinutes?: number
  ): Promise<{ start_time: string; end_time: string }[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('get_available_time_slots', {
      p_provider_id: providerId,
      p_date: date,
      p_duration_minutes: durationMinutes || 30
    });
    if (error) {
      console.error('Failed to get available time slots:', error.message);
      return [];
    }
    return data || [];
  }
};