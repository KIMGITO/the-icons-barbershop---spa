import { create } from 'zustand';
import { BookingRecord, BookingStatus, PaymentStatus } from '../types';
import { INITIAL_BOOKINGS } from '../data/initialData';

interface BookingStore {
  bookings: BookingRecord[];
  selectedDate: string; // YYYY-MM-DD
  statusFilter: BookingStatus | 'all';
  barberFilter: string | 'all';
  searchQuery: string;
  viewMode: 'list' | 'calendar' | 'day' | 'week';

  // Actions
  setSelectedDate: (date: string) => void;
  setStatusFilter: (status: BookingStatus | 'all') => void;
  setBarberFilter: (barberId: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'list' | 'calendar' | 'day' | 'week') => void;

  createBooking: (booking: Omit<BookingRecord, 'id' | 'referenceNumber' | 'createdAt'>) => BookingRecord;
  updateBooking: (id: string, updates: Partial<BookingRecord>) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus, method?: 'mpesa' | 'card' | 'cash') => void;
  rescheduleBooking: (id: string, date: string, timeSlot: string) => void;
  deleteBooking: (id: string) => void;

  // Selectors / Helpers
  getFilteredBookings: () => BookingRecord[];
  getTodayBookings: () => BookingRecord[];
  getStats: () => {
    todayTotal: number;
    todayRevenueKsh: number;
    confirmedToday: number;
    completedToday: number;
    pendingCount: number;
    cancelledCount: number;
    totalRevenueKsh: number;
  };
}

export const useBookingStore = create<BookingStore>((set, get) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const savedBookings = (() => {
    try {
      const item = localStorage.getItem('theicons_bookings');
      return item ? JSON.parse(item) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  })();

  return {
    bookings: savedBookings,
    selectedDate: todayStr,
    statusFilter: 'all',
    barberFilter: 'all',
    searchQuery: '',
    viewMode: 'list',

    setSelectedDate: (date) => set({ selectedDate: date }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setBarberFilter: (barberId) => set({ barberFilter: barberId }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setViewMode: (mode) => set({ viewMode: mode }),

    createBooking: (bookingData) => {
      const refNum = `ICN-${Math.floor(1000 + Math.random() * 9000)}`;
      const newBooking: BookingRecord = {
        ...bookingData,
        id: `bk-${Date.now()}`,
        referenceNumber: refNum,
        createdAt: new Date().toISOString(),
        paymentStatus: bookingData.paymentStatus || 'pending',
        paymentMethod: bookingData.paymentMethod || 'unpaid',
      };

      set((state) => {
        const updated = [newBooking, ...state.bookings];
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });

      return newBooking;
    },

    updateBooking: (id, updates) => {
      set((state) => {
        const updated = state.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b));
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });
    },

    updateBookingStatus: (id, status) => {
      set((state) => {
        const updated = state.bookings.map((b) => (b.id === id ? { ...b, status } : b));
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });
    },

    updatePaymentStatus: (id, paymentStatus, method) => {
      set((state) => {
        const updated = state.bookings.map((b) =>
          b.id === id
            ? {
                ...b,
                paymentStatus,
                paymentMethod: method || (paymentStatus === 'paid' ? 'mpesa' : b.paymentMethod),
              }
            : b
        );
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });
    },

    rescheduleBooking: (id, date, timeSlot) => {
      set((state) => {
        const updated = state.bookings.map((b) =>
          b.id === id ? { ...b, date, timeSlot, status: 'confirmed' as BookingStatus } : b
        );
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });
    },

    deleteBooking: (id) => {
      set((state) => {
        const updated = state.bookings.filter((b) => b.id !== id);
        try {
          localStorage.setItem('theicons_bookings', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { bookings: updated };
      });
    },

    getFilteredBookings: () => {
      const { bookings, statusFilter, barberFilter, searchQuery, selectedDate, viewMode } = get();
      return bookings.filter((b) => {
        // Date filter if in day mode
        if (viewMode === 'day' && b.date !== selectedDate) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && b.status !== statusFilter) {
          return false;
        }

        // Barber filter
        if (barberFilter !== 'all' && b.barberId !== barberFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCustomer = b.customerName.toLowerCase().includes(q);
          const matchPhone = b.customerPhone.includes(q);
          const matchRef = b.referenceNumber.toLowerCase().includes(q);
          const matchBarber = b.barberName.toLowerCase().includes(q);
          const matchService = b.serviceNames.some((s) => s.toLowerCase().includes(q));
          if (!matchCustomer && !matchPhone && !matchRef && !matchBarber && !matchService) {
            return false;
          }
        }

        return true;
      });
    },

    getTodayBookings: () => {
      const today = new Date().toISOString().split('T')[0];
      return get().bookings.filter((b) => b.date === today);
    },

    getStats: () => {
      const today = new Date().toISOString().split('T')[0];
      const all = get().bookings;
      const todayBookings = all.filter((b) => b.date === today);

      const todayRevenueKsh = todayBookings
        .filter((b) => b.status !== 'cancelled' && b.status !== 'no-show')
        .reduce((sum, b) => sum + b.totalPriceKsh, 0);

      const totalRevenueKsh = all
        .filter((b) => b.status !== 'cancelled' && b.status !== 'no-show')
        .reduce((sum, b) => sum + b.totalPriceKsh, 0);

      const confirmedToday = todayBookings.filter((b) => b.status === 'confirmed').length;
      const completedToday = todayBookings.filter((b) => b.status === 'completed').length;
      const pendingCount = all.filter((b) => b.status === 'pending').length;
      const cancelledCount = all.filter((b) => b.status === 'cancelled').length;

      return {
        todayTotal: todayBookings.length,
        todayRevenueKsh,
        confirmedToday,
        completedToday,
        pendingCount,
        cancelledCount,
        totalRevenueKsh,
      };
    },
  };
});
