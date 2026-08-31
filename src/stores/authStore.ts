import { create } from 'zustand';
import { StaffUser, StaffSession, PortalRole } from '../types/staff';
import { authService } from '../services/authService';

interface AuthState {
  user: StaffUser | null;
  session: StaffSession | null;
  role: PortalRole | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (newPassword: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  init: async () => {
    const session = await authService.getCurrentSession();
    if (session) {
      set({
        session,
        user: session.user,
        role: session.user.role,
        isAuthenticated: true
      });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { session, user } = await authService.login(email, password);
      set({
        session,
        user,
        role: user.role,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Login failed. Please verify credentials.',
        loading: false,
        isAuthenticated: false
      });
      return false;
    }
  },

  logout: async () => {
    set({ loading: true });
    await authService.logout();
    set({
      session: null,
      user: null,
      role: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
  },

  forgotPassword: async (email: string) => {
    return authService.sendPasswordResetEmail(email);
  },

  resetPassword: async (token: string, newPassword: string) => {
    return authService.resetPassword(token, newPassword);
  },

  changePassword: async (newPassword: string) => {
    set({ loading: true, error: null });
    try {
      await authService.changePassword(newPassword);
      set(state => ({
        user: state.user ? { ...state.user, mustChangePassword: false } : state.user,
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to update password.' });
      throw err;
    }
  },

  clearError: () => set({ error: null })
}));
