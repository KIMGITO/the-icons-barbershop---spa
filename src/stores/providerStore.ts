import { create } from 'zustand';
import { ServiceProvider, ServiceProviderType, DaySchedule } from '../types/staff';
import { providerService } from '../services/providerService';

interface ProviderState {
  providers: ServiceProvider[];
  selectedProvider: ServiceProvider | null;
  searchQuery: string;
  typeFilter: ServiceProviderType | 'all';
  loading: boolean;
  error: string | null;

  // Actions
  loadProviders: () => Promise<void>;
  setSelectedProvider: (provider: ServiceProvider | null) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: ServiceProviderType | 'all') => void;

  addProvider: (data: Omit<ServiceProvider, 'id' | 'slug'>) => Promise<ServiceProvider>;
  updateProvider: (id: string, updates: Partial<ServiceProvider>) => Promise<ServiceProvider>;
  toggleStatus: (id: string) => Promise<void>;
  updateSchedule: (id: string, schedule: DaySchedule[]) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
}

export const useProviderStore = create<ProviderState>((set) => ({
  providers: [],
  selectedProvider: null,
  searchQuery: '',
  typeFilter: 'all',
  loading: false,
  error: null,

  loadProviders: async () => {
    set({ loading: true, error: null });
    try {
      const list = await providerService.getProviders();
      set({ providers: list, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTypeFilter: (type) => set({ typeFilter: type }),

  addProvider: async (data) => {
    set({ loading: true });
    try {
      const created = await providerService.createProvider(data);
      set(state => ({
        providers: [...state.providers, created],
        loading: false
      }));
      return created;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  updateProvider: async (id, updates) => {
    try {
      const updated = await providerService.updateProvider(id, updates);
      set(state => ({
        providers: state.providers.map(p => p.id === id ? updated : p),
        selectedProvider: state.selectedProvider?.id === id ? updated : state.selectedProvider
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleStatus: async (id) => {
    try {
      const updated = await providerService.toggleProviderStatus(id);
      set(state => ({
        providers: state.providers.map(p => p.id === id ? updated : p),
        selectedProvider: state.selectedProvider?.id === id ? updated : state.selectedProvider
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateSchedule: async (id, schedule) => {
    try {
      const updated = await providerService.updateProviderSchedule(id, schedule);
      set(state => ({
        providers: state.providers.map(p => p.id === id ? updated : p),
        selectedProvider: state.selectedProvider?.id === id ? updated : state.selectedProvider
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteProvider: async (id) => {
    try {
      await providerService.deleteProvider(id);
      set(state => ({
        providers: state.providers.filter(p => p.id !== id),
        selectedProvider: state.selectedProvider?.id === id ? null : state.selectedProvider
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
