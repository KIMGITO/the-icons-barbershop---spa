import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ServiceCategory } from '../types';

export interface ServiceCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export const categoryService = {
  /**
   * Fetch all active service categories from the database
   */
  async getCategories(): Promise<ServiceCategoryRow[]> {
    if (!isSupabaseConfigured) {
      // Fallback defaults if Supabase not configured
      return [
        { id: 'cat-haircuts', slug: 'haircuts', name: 'Haircuts', description: 'Precision master haircuts and fades', icon: 'scissors', sort_order: 1, is_active: true },
        { id: 'cat-beard', slug: 'beard', name: 'Beard & Shave', description: 'Beard sculpting, hot towel shaves', icon: 'razor', sort_order: 2, is_active: true },
        { id: 'cat-spa', slug: 'spa', name: 'Spa & Scalp', description: 'Scalp detox, facials, spa therapies', icon: 'spa', sort_order: 3, is_active: true },
        { id: 'cat-packages', slug: 'packages', name: 'Signature Packages', description: 'VIP and combined experiences', icon: 'star', sort_order: 4, is_active: true }
      ];
    }

    const { data, error } = await supabase.from('service_categories').select('*').order('sort_order');
    if (error) throw new Error(error.message);
    return (data || []) as ServiceCategoryRow[];
  },

  async createCategory(data: { slug: string; name: string; description?: string; icon?: string; sort_order?: number }): Promise<ServiceCategoryRow> {
    const { data: created, error } = await supabase
      .from('service_categories')
      .insert({ ...data, is_active: true })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created as ServiceCategoryRow;
  },

  async updateCategory(id: string, updates: Partial<ServiceCategoryRow>): Promise<ServiceCategoryRow> {
    const { data: updated, error } = await supabase
      .from('service_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated as ServiceCategoryRow;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
};

/** Map DB category slug to frontend ServiceCategory type */
export const mapDbCategoryToFrontend = (slug: string): ServiceCategory => {
  if (slug === 'haircuts') return 'haircut';
  if (slug === 'beard') return 'beard';
  if (slug === 'spa') return 'spa';
  if (slug === 'packages') return 'packages';
  return slug as ServiceCategory;
};

/** Map frontend category to DB slug */
export const mapFrontendToDbCategory = (category: string): string => {
  if (category === 'haircut') return 'haircuts';
  if (category === 'shave') return 'beard';
  return category === 'all' ? 'haircuts' : category;
};