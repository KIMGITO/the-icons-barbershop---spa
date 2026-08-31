import { create } from 'zustand';
import { CustomerProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CustomerStore {
  customers: CustomerProfile[];
  searchQuery: string;
  selectedTag: string | 'all';
  selectedCustomer: CustomerProfile | null;
  loading: boolean;
  error: string | null;

  loadCustomers: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | 'all') => void;
  setSelectedCustomer: (customer: CustomerProfile | null) => void;

  addCustomer: (customer: Omit<CustomerProfile, 'id' | 'createdAt' | 'totalVisits' | 'totalSpendKsh'>) => Promise<CustomerProfile>;
  updateCustomer: (id: string, updates: Partial<CustomerProfile>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addVisitRecord: (customerId: string, spendKsh: number, serviceName: string, date: string) => Promise<void>;

  getFilteredCustomers: () => CustomerProfile[];
  getCustomerById: (id: string) => CustomerProfile | undefined;
}

const mapDbCustomer = (row: any): CustomerProfile => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  avatarUrl: row.avatar_url || '',
  preferredBarberId: row.preferred_provider_id || undefined,
  preferredBarberName: row.preferred_provider_name || undefined,
  frequentlyBookedServiceNames: row.frequently_booked_services || [],
  totalVisits: row.total_visits || 0,
  totalSpendKsh: Number(row.total_spend_ksh || 0),
  lastVisitDate: row.last_visit_date || undefined,
  notes: row.notes,
  tags: row.tags || [],
  vipStatus: row.vip_status || false,
  createdAt: row.created_at
});

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  searchQuery: '',
  selectedTag: 'all',
  selectedCustomer: null,
  loading: false,
  error: null,

  loadCustomers: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      set({ customers: (data || []).map(mapDbCustomer), loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

  addCustomer: async (data) => {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured.');
    const { data: created, error } = await supabase
      .from('customers')
      .insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        avatar_url: data.avatarUrl || null,
        preferred_provider_id: data.preferredBarberId || null,
        preferred_provider_name: data.preferredBarberName || null,
        notes: data.notes || null,
        tags: data.tags || [],
        vip_status: data.vipStatus || false,
        total_visits: 1
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const newCustomer = mapDbCustomer(created);
    set(state => ({ customers: [newCustomer, ...state.customers] }));
    return newCustomer;
  },

  updateCustomer: async (id, updates) => {
    if (!isSupabaseConfigured) return;
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.email !== undefined) db.email = updates.email;
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.avatarUrl !== undefined) db.avatar_url = updates.avatarUrl;
    if (updates.preferredBarberId !== undefined) db.preferred_provider_id = updates.preferredBarberId;
    if (updates.preferredBarberName !== undefined) db.preferred_provider_name = updates.preferredBarberName;
    if (updates.frequentlyBookedServiceNames !== undefined) db.frequently_booked_services = updates.frequentlyBookedServiceNames;
    if (updates.totalVisits !== undefined) db.total_visits = updates.totalVisits;
    if (updates.totalSpendKsh !== undefined) db.total_spend_ksh = updates.totalSpendKsh;
    if (updates.lastVisitDate !== undefined) db.last_visit_date = updates.lastVisitDate;
    if (updates.notes !== undefined) db.notes = updates.notes;
    if (updates.tags !== undefined) db.tags = updates.tags;
    if (updates.vipStatus !== undefined) db.vip_status = updates.vipStatus;

    const { data: updated, error } = await supabase
      .from('customers')
      .update(db)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const mapped = mapDbCustomer(updated);
    set(state => ({
      customers: state.customers.map(c => c.id === id ? mapped : c),
      selectedCustomer: state.selectedCustomer?.id === id ? mapped : state.selectedCustomer
    }));
  },

  deleteCustomer: async (id) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set(state => ({
      customers: state.customers.filter(c => c.id !== id),
      selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer
    }));
  },

  addVisitRecord: async (customerId, spendKsh, serviceName, date) => {
    const customer = get().customers.find(c => c.id === customerId);
    if (!customer) return;
    const currentServices = customer.frequentlyBookedServiceNames || [];
    const updatedServices = currentServices.includes(serviceName)
      ? currentServices
      : [...currentServices, serviceName];
    await get().updateCustomer(customerId, {
      totalVisits: customer.totalVisits + 1,
      totalSpendKsh: customer.totalSpendKsh + spendKsh,
      lastVisitDate: date,
      frequentlyBookedServiceNames: updatedServices
    });
  },

  getFilteredCustomers: () => {
    const { customers, searchQuery, selectedTag } = get();
    return customers.filter((c) => {
      if (selectedTag !== 'all') {
        if (selectedTag === 'VIP' && !c.vipStatus) return false;
        if (selectedTag !== 'VIP' && (!c.tags || !c.tags.includes(selectedTag))) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchBarber = c.preferredBarberName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchBarber) {
          return false;
        }
      }

      return true;
    });
  },

  getCustomerById: (id) => {
    return get().customers.find((c) => c.id === id);
  },
}));