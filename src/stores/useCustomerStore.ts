import { create } from 'zustand';
import { CustomerProfile } from '../types';

const INITIAL_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'cust-1',
    name: 'Kiplagat Tanui',
    email: 'kiplagat.t@gmail.com',
    phone: '+254722100200',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    preferredBarberId: 'barber-1',
    preferredBarberName: 'Samuel Mwangi',
    frequentlyBookedServiceNames: ['Classic Icon Haircut', 'Royal Hot Towel Beard Sculpting'],
    totalVisits: 14,
    totalSpendKsh: 37800,
    lastVisitDate: '2026-08-27',
    notes: 'Prefers low taper fade, eucalyptus scented towel, and Kenyan single-origin black coffee.',
    tags: ['VIP', 'Executive', 'Regular'],
    vipStatus: true,
    createdAt: '2025-09-15',
  },
  {
    id: 'cust-2',
    name: 'Kelvin Mutiso',
    email: 'kelvin.mutiso@safari.co.ke',
    phone: '+254711334455',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    preferredBarberId: 'barber-2',
    preferredBarberName: 'Eric Omondi',
    frequentlyBookedServiceNames: ['The CEO Signature Experience'],
    totalVisits: 8,
    totalSpendKsh: 44000,
    lastVisitDate: '2026-08-20',
    notes: 'CEO at tech startup in Westlands. Always books CEO package on Friday afternoons.',
    tags: ['VIP', 'Spa Regular'],
    vipStatus: true,
    createdAt: '2025-11-04',
  },
  {
    id: 'cust-3',
    name: 'Dr. Brian Oduor',
    email: 'brian.oduor@hospital.org',
    phone: '+254733998877',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=300&auto=format&fit=crop',
    preferredBarberId: 'barber-3',
    preferredBarberName: 'David Kiprono',
    frequentlyBookedServiceNames: ['Moroccan Scalp Detox & Hair Spa', 'Executive Skin Fade & Taper'],
    totalVisits: 6,
    totalSpendKsh: 21600,
    lastVisitDate: '2026-08-14',
    notes: 'Sensitive skin. Use antibacterial and non-alcoholic aftershave balm only.',
    tags: ['Regular', 'Sensitive Skin'],
    vipStatus: false,
    createdAt: '2026-01-10',
  },
  {
    id: 'cust-4',
    name: 'Victor Maina',
    email: 'victor.m@investments.co.ke',
    phone: '+254722880011',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop',
    preferredBarberId: 'barber-5',
    preferredBarberName: 'Lucas Vance',
    frequentlyBookedServiceNames: ['Executive Skin Fade & Taper'],
    totalVisits: 3,
    totalSpendKsh: 5400,
    lastVisitDate: '2026-08-02',
    notes: 'Likes razor sharp contour lineup.',
    tags: ['New Client'],
    vipStatus: false,
    createdAt: '2026-06-18',
  },
  {
    id: 'cust-5',
    name: 'James Kariuki',
    email: 'james.k@lawchambers.co.ke',
    phone: '+254700554433',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    preferredBarberId: 'barber-1',
    preferredBarberName: 'Samuel Mwangi',
    frequentlyBookedServiceNames: ['Classic Icon Haircut', 'Gentleman\'s Charcoal Purifying Facial'],
    totalVisits: 11,
    totalSpendKsh: 35200,
    lastVisitDate: '2026-08-25',
    notes: 'Corporate attorney. Usually buys the Argan Beard Oil at checkout.',
    tags: ['VIP', 'Product Buyer'],
    vipStatus: true,
    createdAt: '2025-10-22',
  },
];

interface CustomerStore {
  customers: CustomerProfile[];
  searchQuery: string;
  selectedTag: string | 'all';
  selectedCustomer: CustomerProfile | null;

  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | 'all') => void;
  setSelectedCustomer: (customer: CustomerProfile | null) => void;

  addCustomer: (customer: Omit<CustomerProfile, 'id' | 'createdAt' | 'totalVisits' | 'totalSpendKsh'>) => CustomerProfile;
  updateCustomer: (id: string, updates: Partial<CustomerProfile>) => void;
  deleteCustomer: (id: string) => void;
  addVisitRecord: (customerId: string, spendKsh: number, serviceName: string, date: string) => void;

  getFilteredCustomers: () => CustomerProfile[];
  getCustomerById: (id: string) => CustomerProfile | undefined;
}

export const useCustomerStore = create<CustomerStore>((set, get) => {
  const savedCustomers = (() => {
    try {
      const item = localStorage.getItem('theicons_customers');
      return item ? JSON.parse(item) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  })();

  return {
    customers: savedCustomers,
    searchQuery: '',
    selectedTag: 'all',
    selectedCustomer: null,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedTag: (tag) => set({ selectedTag: tag }),
    setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

    addCustomer: (data) => {
      const newCustomer: CustomerProfile = {
        ...data,
        id: `cust-${Date.now()}`,
        totalVisits: 1,
        totalSpendKsh: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };

      set((state) => {
        const updated = [newCustomer, ...state.customers];
        try {
          localStorage.setItem('theicons_customers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { customers: updated };
      });

      return newCustomer;
    },

    updateCustomer: (id, updates) => {
      set((state) => {
        const updated = state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
        try {
          localStorage.setItem('theicons_customers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        const updatedSelected = state.selectedCustomer?.id === id 
          ? { ...state.selectedCustomer, ...updates } 
          : state.selectedCustomer;
        return { customers: updated, selectedCustomer: updatedSelected };
      });
    },

    deleteCustomer: (id) => {
      set((state) => {
        const updated = state.customers.filter((c) => c.id !== id);
        try {
          localStorage.setItem('theicons_customers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { 
          customers: updated, 
          selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer 
        };
      });
    },

    addVisitRecord: (customerId, spendKsh, serviceName, date) => {
      set((state) => {
        const updated = state.customers.map((c) => {
          if (c.id === customerId) {
            const currentServices = c.frequentlyBookedServiceNames || [];
            const updatedServices = currentServices.includes(serviceName)
              ? currentServices
              : [...currentServices, serviceName];
            return {
              ...c,
              totalVisits: c.totalVisits + 1,
              totalSpendKsh: c.totalSpendKsh + spendKsh,
              lastVisitDate: date,
              frequentlyBookedServiceNames: updatedServices,
            };
          }
          return c;
        });
        try {
          localStorage.setItem('theicons_customers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { customers: updated };
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
  };
});
