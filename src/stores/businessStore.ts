import { create } from 'zustand';
import { StaffBusinessProfile } from '../types/staff';
import { businessService } from '../services/businessService';

interface BusinessState {
  profile: StaffBusinessProfile | null;
  loading: boolean;
  error: string | null;

  loadBusinessProfile: () => Promise<void>;
  updateBusinessProfile: (updates: Partial<StaffBusinessProfile>) => Promise<StaffBusinessProfile>;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  profile: null,
  loading: false,
  error: null,

  loadBusinessProfile: async () => {
    set({ loading: true, error: null });
    try {
      const data = await businessService.getBusinessProfile();
      set({ profile: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateBusinessProfile: async (updates) => {
    set({ loading: true });
    try {
      const updated = await businessService.updateBusinessProfile(updates);
      set({ profile: updated, loading: false });
      return updated;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
