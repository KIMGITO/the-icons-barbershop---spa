import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { create } from 'zustand';
import { StaffBooking, StaffBookingStatus } from '../types/staff';
import { bookingService } from '../services/bookingService';

export type BookingTab = 'today' | 'upcoming' | 'past' | 'calendar';
export type CalendarViewMode = 'day' | 'week' | 'month';
export type BookingDrawerMode = 'view' | 'create' | 'edit';

interface BookingState {
  bookings: StaffBooking[];
  selectedDate: string; // YYYY-MM-DD
  selectedProviderFilter: string; // 'all' or providerId
  selectedStatusFilter: StaffBookingStatus | 'all';
  activeTab: BookingTab;
  calendarView: CalendarViewMode;
  selectedBooking: StaffBooking | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;

  // Drawer states
  isDrawerOpen: boolean;
  drawerMode: BookingDrawerMode;
  isDrawerCollapsed: boolean;
  prefilledDate: string | null;
  prefilledTime: string | null;
  prefilledProviderId: string | null;

  // Actions
  loadBookings: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedProviderFilter: (providerId: string) => void;
  setSelectedStatusFilter: (status: StaffBookingStatus | 'all') => void;
  setActiveTab: (tab: BookingTab) => void;
  setCalendarView: (view: CalendarViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSelectedBooking: (booking: StaffBooking | null) => void;

  // Drawer Actions
  openCreateDrawer: (date?: string, time?: string, providerId?: string) => void;
  openViewDrawer: (booking: StaffBooking) => void;
  openEditDrawer: (booking: StaffBooking) => void;
  closeDrawer: () => void;
  toggleDrawerCollapsed: () => void;

  createBooking: (data: Omit<StaffBooking, 'id' | 'referenceNumber' | 'createdAt'>) => Promise<StaffBooking>;
  updateBooking: (id: string, updates: Partial<StaffBooking>) => Promise<StaffBooking>;
  updateBookingStatus: (id: string, status: StaffBookingStatus) => Promise<void>;
  recordPayment: (id: string, amountKsh: number, method?: 'mpesa' | 'cash' | 'card', receipt?: string) => Promise<void>;
  cancelBooking: (id: string, reason?: string) => Promise<void>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  selectedDate: new Date().toISOString().split('T')[0],
  selectedProviderFilter: 'all',
  selectedStatusFilter: 'all',
  activeTab: 'calendar',
  calendarView: 'week',
  selectedBooking: null,
  searchQuery: '',
  loading: false,
  error: null,

  // Drawer initial state
  isDrawerOpen: false,
  drawerMode: 'create',
  isDrawerCollapsed: false,
  prefilledDate: null,
  prefilledTime: null,
  prefilledProviderId: null,

  loadBookings: async () => {
    set({ loading: true, error: null });
    try {
      const list = await bookingService.getBookings();
      set({ bookings: list, loading: false });
      // Subscribe to realtime changes for instant UI updates
      if (isSupabaseConfigured && !(get() as any)._subscribed) {
        (get() as any)._subscribed = true;
        supabase
          .channel('booking-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
            if (payload.eventType === 'DELETE') {
              set(state => ({
                bookings: state.bookings.filter(b => b.id !== payload.old.id),
                selectedBooking: state.selectedBooking?.id === payload.old.id ? null : state.selectedBooking
              }));
            } else {
              const fresh = await bookingService.getBookings();
              set({ bookings: fresh });
            }
          })
          .subscribe();
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load bookings', loading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedProviderFilter: (providerId) => set({ selectedProviderFilter: providerId }),
  setSelectedStatusFilter: (status) => set({ selectedStatusFilter: status }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCalendarView: (view) => set({ calendarView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedBooking: (booking) => set({ selectedBooking: booking }),

  openCreateDrawer: (date, time, providerId) => {
    set({
      isDrawerOpen: true,
      drawerMode: 'create',
      selectedBooking: null,
      prefilledDate: date || get().selectedDate || new Date().toISOString().split('T')[0],
      prefilledTime: time || '10:00 AM',
      prefilledProviderId: providerId || (get().selectedProviderFilter !== 'all' ? get().selectedProviderFilter : null)
    });
  },

  openViewDrawer: (booking) => {
    set({
      isDrawerOpen: true,
      drawerMode: 'view',
      selectedBooking: booking,
      prefilledDate: null,
      prefilledTime: null,
      prefilledProviderId: null
    });
  },

  openEditDrawer: (booking) => {
    set({
      isDrawerOpen: true,
      drawerMode: 'edit',
      selectedBooking: booking,
      prefilledDate: booking.date,
      prefilledTime: booking.timeSlot,
      prefilledProviderId: booking.providerId
    });
  },

  closeDrawer: () => {
    set({
      isDrawerOpen: false,
      selectedBooking: null,
      prefilledDate: null,
      prefilledTime: null,
      prefilledProviderId: null,
      isDrawerCollapsed: false
    });
  },

  toggleDrawerCollapsed: () => set(state => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),

  createBooking: async (data) => {
    set({ loading: true });
    try {
      const created = await bookingService.createBooking(data);
      set(state => ({
        bookings: [created, ...state.bookings],
        loading: false
      }));
      return created;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  updateBooking: async (id, updates) => {
    set({ loading: true });
    try {
      const updated = await bookingService.updateBooking(id, updates);
      set(state => ({
        bookings: state.bookings.map(b => b.id === id ? updated : b),
        selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking,
        loading: false
      }));
      return updated;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  updateBookingStatus: async (id, status) => {
    try {
      const updated = await bookingService.updateBookingStatus(id, status);
      set(state => ({
        bookings: state.bookings.map(b => b.id === id ? updated : b),
        selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  recordPayment: async (id, amountKsh, method = 'mpesa', receipt) => {
    try {
      const updated = await bookingService.recordPayment(id, amountKsh, method, receipt);
      set(state => ({
        bookings: state.bookings.map(b => b.id === id ? updated : b),
        selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  cancelBooking: async (id, reason) => {
    try {
      const updated = await bookingService.cancelBooking(id, reason);
      set(state => ({
        bookings: state.bookings.map(b => b.id === id ? updated : b),
        selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
