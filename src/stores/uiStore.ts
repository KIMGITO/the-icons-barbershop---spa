import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  activeModal: string | null;
  activeDrawer: string | null;
  toasts: ToastItem[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  openDrawer: (drawerId: string) => void;
  closeDrawer: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  activeModal: null,
  activeDrawer: null,
  toasts: [],

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  openDrawer: (drawerId) => set({ activeDrawer: drawerId }),
  closeDrawer: () => set({ activeDrawer: null }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    set(state => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 4000);
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  }
}));
