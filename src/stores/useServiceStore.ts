import { create } from 'zustand';
import { ServiceItem, ServiceCategory } from '../types';
import { INITIAL_SERVICES } from '../data/initialData';

const ENRICHED_SERVICES: ServiceItem[] = INITIAL_SERVICES.map((s) => ({
  ...s,
  status: s.status ?? 'active',
  bufferMinutes: s.bufferMinutes ?? 10,
}));

interface ServiceStore {
  services: ServiceItem[];
  searchQuery: string;
  categoryFilter: ServiceCategory;
  statusFilter: 'all' | 'active' | 'archived' | 'draft';
  selectedService: ServiceItem | null;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: ServiceCategory) => void;
  setStatusFilter: (status: 'all' | 'active' | 'archived' | 'draft') => void;
  setSelectedService: (service: ServiceItem | null) => void;

  addService: (service: Omit<ServiceItem, 'id'>) => ServiceItem;
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;
  togglePopular: (id: string) => void;
  toggleStatus: (id: string) => void;

  getFilteredServices: () => ServiceItem[];
}

export const useServiceStore = create<ServiceStore>((set, get) => {
  const savedServices = (() => {
    try {
      const item = localStorage.getItem('theicons_services_management');
      return item ? JSON.parse(item) : ENRICHED_SERVICES;
    } catch {
      return ENRICHED_SERVICES;
    }
  })();

  return {
    services: savedServices,
    searchQuery: '',
    categoryFilter: 'all',
    statusFilter: 'all',
    selectedService: null,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setSelectedService: (service) => set({ selectedService: service }),

    addService: (serviceData) => {
      const slug = serviceData.slug || serviceData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newService: ServiceItem = {
        ...serviceData,
        id: `serv-${Date.now()}`,
        slug,
        status: serviceData.status || 'active',
      };

      set((state) => {
        const updated = [...state.services, newService];
        try {
          localStorage.setItem('theicons_services_management', JSON.stringify(updated));
          localStorage.setItem('theicons_services', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { services: updated };
      });

      return newService;
    },

    updateService: (id, updates) => {
      set((state) => {
        const updated = state.services.map((s) => (s.id === id ? { ...s, ...updates } : s));
        try {
          localStorage.setItem('theicons_services_management', JSON.stringify(updated));
          localStorage.setItem('theicons_services', JSON.stringify(updated));
        } catch {
          // ignore
        }
        const updatedSelected = state.selectedService?.id === id 
          ? { ...state.selectedService, ...updates } 
          : state.selectedService;
        return { services: updated, selectedService: updatedSelected };
      });
    },

    deleteService: (id) => {
      set((state) => {
        const updated = state.services.filter((s) => s.id !== id);
        try {
          localStorage.setItem('theicons_services_management', JSON.stringify(updated));
          localStorage.setItem('theicons_services', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { 
          services: updated, 
          selectedService: state.selectedService?.id === id ? null : state.selectedService 
        };
      });
    },

    togglePopular: (id) => {
      set((state) => {
        const updated = state.services.map((s) => (s.id === id ? { ...s, isPopular: !s.isPopular } : s));
        try {
          localStorage.setItem('theicons_services_management', JSON.stringify(updated));
          localStorage.setItem('theicons_services', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { services: updated };
      });
    },

    toggleStatus: (id) => {
      set((state) => {
        const updated = state.services.map((s) => {
          if (s.id === id) {
            const nextStatus: ServiceItem['status'] = s.status === 'active' ? 'archived' : 'active';
            return { ...s, status: nextStatus };
          }
          return s;
        });
        try {
          localStorage.setItem('theicons_services_management', JSON.stringify(updated));
          localStorage.setItem('theicons_services', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { services: updated };
      });
    },

    getFilteredServices: () => {
      const { services, searchQuery, categoryFilter, statusFilter } = get();
      return services.filter((s) => {
        if (categoryFilter !== 'all' && s.category !== categoryFilter) {
          return false;
        }

        if (statusFilter !== 'all') {
          if (s.status !== statusFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchDesc = s.shortDescription.toLowerCase().includes(q);
          const matchCategory = s.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCategory) {
            return false;
          }
        }

        return true;
      });
    },
  };
});
