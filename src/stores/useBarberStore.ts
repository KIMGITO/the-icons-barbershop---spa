import { create } from 'zustand';
import { BarberProfile, BarberScheduleBlock } from '../types';
import { INITIAL_BARBERS } from '../data/initialData';

const ENRICHED_BARBERS: BarberProfile[] = INITIAL_BARBERS.map((b) => ({
  ...b,
  status: b.status ?? 'active',
  email: b.email ?? `${b.slug.replace(/-/g, '.')}@theiconsbarber.co.ke`,
  phone: b.phone ?? '+254 712 000 111',
  workingHours: b.workingHours ?? { start: '08:00 AM', end: '08:00 PM' },
  breakTimes: b.breakTimes ?? { start: '01:00 PM', end: '02:00 PM' },
  dailyCapacity: b.dailyCapacity ?? 8,
}));

const INITIAL_SCHEDULE_BLOCKS: BarberScheduleBlock[] = [
  {
    id: 'block-1',
    barberId: 'barber-1',
    barberName: 'Samuel Mwangi',
    date: new Date().toISOString().split('T')[0],
    startTime: '01:00 PM',
    endTime: '02:00 PM',
    reason: 'break',
    notes: 'Standard lunch break & station sanitization',
  },
  {
    id: 'block-2',
    barberId: 'barber-2',
    barberName: 'Eric Omondi',
    date: new Date().toISOString().split('T')[0],
    startTime: '01:30 PM',
    endTime: '02:30 PM',
    reason: 'break',
    notes: 'Artisan lunch break',
  },
  {
    id: 'block-3',
    barberId: 'barber-3',
    barberName: 'David Kiprono',
    date: '2026-08-30',
    startTime: '08:00 AM',
    endTime: '08:00 PM',
    reason: 'holiday',
    notes: 'Attending Trichology Masterclass Seminar in Nairobi',
  },
];

interface BarberStore {
  barbers: BarberProfile[];
  scheduleBlocks: BarberScheduleBlock[];
  selectedBarber: BarberProfile | null;
  statusFilter: 'all' | 'active' | 'inactive' | 'on-leave';
  searchQuery: string;

  setSelectedBarber: (barber: BarberProfile | null) => void;
  setStatusFilter: (filter: 'all' | 'active' | 'inactive' | 'on-leave') => void;
  setSearchQuery: (query: string) => void;

  addBarber: (barber: Omit<BarberProfile, 'id'>) => BarberProfile;
  updateBarber: (id: string, updates: Partial<BarberProfile>) => void;
  deleteBarber: (id: string) => void;
  toggleBarberStatus: (id: string) => void;

  // Schedule blocks
  addScheduleBlock: (block: Omit<BarberScheduleBlock, 'id'>) => BarberScheduleBlock;
  deleteScheduleBlock: (id: string) => void;

  getFilteredBarbers: () => BarberProfile[];
  getBlocksForBarberAndDate: (barberId: string, date: string) => BarberScheduleBlock[];
}

export const useBarberStore = create<BarberStore>((set, get) => {
  const savedBarbers = (() => {
    try {
      const item = localStorage.getItem('theicons_barbers_management');
      return item ? JSON.parse(item) : ENRICHED_BARBERS;
    } catch {
      return ENRICHED_BARBERS;
    }
  })();

  const savedBlocks = (() => {
    try {
      const item = localStorage.getItem('theicons_schedule_blocks');
      return item ? JSON.parse(item) : INITIAL_SCHEDULE_BLOCKS;
    } catch {
      return INITIAL_SCHEDULE_BLOCKS;
    }
  })();

  return {
    barbers: savedBarbers,
    scheduleBlocks: savedBlocks,
    selectedBarber: null,
    statusFilter: 'all',
    searchQuery: '',

    setSelectedBarber: (barber) => set({ selectedBarber: barber }),
    setStatusFilter: (filter) => set({ statusFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    addBarber: (data) => {
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newBarber: BarberProfile = {
        ...data,
        id: `barber-${Date.now()}`,
        slug,
        status: data.status || 'active',
        workingHours: data.workingHours || { start: '08:00 AM', end: '08:00 PM' },
        breakTimes: data.breakTimes || { start: '01:00 PM', end: '02:00 PM' },
      };

      set((state) => {
        const updated = [...state.barbers, newBarber];
        try {
          localStorage.setItem('theicons_barbers_management', JSON.stringify(updated));
          localStorage.setItem('theicons_barbers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { barbers: updated };
      });

      return newBarber;
    },

    updateBarber: (id, updates) => {
      set((state) => {
        const updated = state.barbers.map((b) => (b.id === id ? { ...b, ...updates } : b));
        try {
          localStorage.setItem('theicons_barbers_management', JSON.stringify(updated));
          localStorage.setItem('theicons_barbers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        const updatedSelected = state.selectedBarber?.id === id 
          ? { ...state.selectedBarber, ...updates } 
          : state.selectedBarber;
        return { barbers: updated, selectedBarber: updatedSelected };
      });
    },

    deleteBarber: (id) => {
      set((state) => {
        const updated = state.barbers.filter((b) => b.id !== id);
        try {
          localStorage.setItem('theicons_barbers_management', JSON.stringify(updated));
          localStorage.setItem('theicons_barbers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { 
          barbers: updated, 
          selectedBarber: state.selectedBarber?.id === id ? null : state.selectedBarber 
        };
      });
    },

    toggleBarberStatus: (id) => {
      set((state) => {
        const updated = state.barbers.map((b) => {
          if (b.id === id) {
            const nextStatus: BarberProfile['status'] = b.status === 'active' ? 'inactive' : 'active';
            return { ...b, status: nextStatus };
          }
          return b;
        });
        try {
          localStorage.setItem('theicons_barbers_management', JSON.stringify(updated));
          localStorage.setItem('theicons_barbers', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { barbers: updated };
      });
    },

    addScheduleBlock: (blockData) => {
      const newBlock: BarberScheduleBlock = {
        ...blockData,
        id: `block-${Date.now()}`,
      };

      set((state) => {
        const updated = [...state.scheduleBlocks, newBlock];
        try {
          localStorage.setItem('theicons_schedule_blocks', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { scheduleBlocks: updated };
      });

      return newBlock;
    },

    deleteScheduleBlock: (id) => {
      set((state) => {
        const updated = state.scheduleBlocks.filter((b) => b.id !== id);
        try {
          localStorage.setItem('theicons_schedule_blocks', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { scheduleBlocks: updated };
      });
    },

    getFilteredBarbers: () => {
      const { barbers, searchQuery, statusFilter } = get();
      return barbers.filter((b) => {
        if (statusFilter !== 'all') {
          if (b.status !== statusFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = b.name.toLowerCase().includes(q);
          const matchSpecialty = b.specialty.toLowerCase().includes(q);
          const matchTitle = b.title.toLowerCase().includes(q);
          if (!matchName && !matchSpecialty && !matchTitle) {
            return false;
          }
        }

        return true;
      });
    },

    getBlocksForBarberAndDate: (barberId, date) => {
      return get().scheduleBlocks.filter((b) => b.barberId === barberId && b.date === date);
    },
  };
});
