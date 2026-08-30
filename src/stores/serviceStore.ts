import { create } from 'zustand';
import { ServiceItem } from '../types';
import { serviceService } from '../services/serviceService';

interface ServiceState {
  services: ServiceItem[];
  selectedService: ServiceItem | null;
  serviceProvidersMap: Record<string, string[]>;
  searchQuery: string;
  categoryFilter: string;
  loading: boolean;
  error: string | null;

  // Actions
  loadServices: () => Promise<void>;
  setSelectedService: (service: ServiceItem | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;

  addService: (data: Omit<ServiceItem, 'id'>, providerIds?: string[]) => Promise<ServiceItem>;
  updateService: (id: string, updates: Partial<ServiceItem>, providerIds?: string[]) => Promise<ServiceItem>;
  deleteService: (id: string) => Promise<void>;
  setProvidersForService: (serviceId: string, providerIds: string[]) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  selectedService: null,
  serviceProvidersMap: {},
  searchQuery: '',
  categoryFilter: 'all',
  loading: false,
  error: null,

  loadServices: async () => {
    set({ loading: true, error: null });
    try {
      const list = await serviceService.getServices();
      // Load relationships for each service
      const relMap: Record<string, string[]> = {};
      for (const s of list) {
        relMap[s.id] = await serviceService.getProvidersForService(s.id);
      }
      set({ services: list, serviceProvidersMap: relMap, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSelectedService: (service) => set({ selectedService: service }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  addService: async (data, providerIds = []) => {
    set({ loading: true });
    try {
      const created = await serviceService.createService(data, providerIds);
      set(state => ({
        services: [...state.services, created],
        serviceProvidersMap: {
          ...state.serviceProvidersMap,
          [created.id]: providerIds
        },
        loading: false
      }));
      return created;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  updateService: async (id, updates, providerIds) => {
    try {
      const updated = await serviceService.updateService(id, updates, providerIds);
      set(state => ({
        services: state.services.map(s => s.id === id ? updated : s),
        selectedService: state.selectedService?.id === id ? updated : state.selectedService,
        serviceProvidersMap: providerIds !== undefined ? {
          ...state.serviceProvidersMap,
          [id]: providerIds
        } : state.serviceProvidersMap
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteService: async (id) => {
    try {
      await serviceService.deleteService(id);
      set(state => {
        const nextMap = { ...state.serviceProvidersMap };
        delete nextMap[id];
        return {
          services: state.services.filter(s => s.id !== id),
          selectedService: state.selectedService?.id === id ? null : state.selectedService,
          serviceProvidersMap: nextMap
        };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setProvidersForService: async (serviceId, providerIds) => {
    try {
      await serviceService.setProvidersForService(serviceId, providerIds);
      set(state => ({
        serviceProvidersMap: {
          ...state.serviceProvidersMap,
          [serviceId]: providerIds
        }
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
