import { create } from 'zustand';
import { StaffMember, StaffRole, StaffPermissions } from '../types';

const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  owner: {
    manageBookings: true,
    manageServices: true,
    manageProducts: true,
    manageBarbers: true,
    manageStaff: true,
    viewReports: true,
    manageSettings: true,
    manageCustomers: true,
    manageReviews: true,
  },
  manager: {
    manageBookings: true,
    manageServices: true,
    manageProducts: true,
    manageBarbers: true,
    manageStaff: true,
    viewReports: true,
    manageSettings: false,
    manageCustomers: true,
    manageReviews: true,
  },
  barber: {
    manageBookings: true,
    manageServices: false,
    manageProducts: false,
    manageBarbers: false,
    manageStaff: false,
    viewReports: false,
    manageSettings: false,
    manageCustomers: true,
    manageReviews: false,
  },
  receptionist: {
    manageBookings: true,
    manageServices: false,
    manageProducts: true,
    manageBarbers: false,
    manageStaff: false,
    viewReports: false,
    manageSettings: false,
    manageCustomers: true,
    manageReviews: true,
  },
  cashier: {
    manageBookings: true,
    manageServices: false,
    manageProducts: true,
    manageBarbers: false,
    manageStaff: false,
    viewReports: true,
    manageSettings: false,
    manageCustomers: true,
    manageReviews: false,
  },
};

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Samuel Mwangi',
    email: 'samuel@theiconsbarber.co.ke',
    phone: '+254722111222',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.owner,
    lastActive: 'Just now',
    barberProfileId: 'barber-1',
  },
  {
    id: 'staff-2',
    name: 'Faith Njeri',
    email: 'faith.njeri@theiconsbarber.co.ke',
    phone: '+254733445566',
    role: 'manager',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.manager,
    lastActive: '10 mins ago',
  },
  {
    id: 'staff-3',
    name: 'Eric Omondi',
    email: 'eric.blade@theiconsbarber.co.ke',
    phone: '+254711889900',
    role: 'barber',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.barber,
    lastActive: '25 mins ago',
    barberProfileId: 'barber-2',
  },
  {
    id: 'staff-4',
    name: 'Brian Mutua',
    email: 'brian.m@theiconsbarber.co.ke',
    phone: '+254722448899',
    role: 'barber',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.barber,
    lastActive: '1 hour ago',
    barberProfileId: 'barber-4',
  },
  {
    id: 'staff-5',
    name: 'Kevin Otieno',
    email: 'kevin.o@theiconsbarber.co.ke',
    phone: '+254755123456',
    role: 'receptionist',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.receptionist,
    lastActive: '4 hours ago',
  },
  {
    id: 'staff-6',
    name: 'Grace Wambui',
    email: 'grace.w@theiconsbarber.co.ke',
    phone: '+254799887766',
    role: 'cashier',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS.cashier,
    lastActive: 'Yesterday',
  },
];

interface StaffStore {
  staffMembers: StaffMember[];
  currentStaffUser: StaffMember | null;
  isAuthenticated: boolean;
  
  // Actions
  loginAs: (staffId: string) => void;
  logout: () => void;
  addStaffMember: (staff: Omit<StaffMember, 'id' | 'lastActive'>) => void;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaffMember: (id: string) => void;
  toggleStaffStatus: (id: string) => void;
  updateStaffPermissions: (id: string, permissions: Partial<StaffPermissions>) => void;
  getDefaultPermissionsForRole: (role: StaffRole) => StaffPermissions;
}

export const useStaffStore = create<StaffStore>((set, get) => {
  // Try loading from localStorage
  const savedStaff = (() => {
    try {
      const item = localStorage.getItem('theicons_staff');
      return item ? JSON.parse(item) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  })();

  const savedUser = (() => {
    try {
      const item = localStorage.getItem('theicons_current_staff');
      return item ? JSON.parse(item) : savedStaff[0];
    } catch {
      return savedStaff[0];
    }
  })();

  return {
    staffMembers: savedStaff,
    currentStaffUser: savedUser,
    isAuthenticated: true,

    loginAs: (staffId) => {
      const target = get().staffMembers.find((s) => s.id === staffId);
      if (target) {
        set({ currentStaffUser: target, isAuthenticated: true });
        try {
          localStorage.setItem('theicons_current_staff', JSON.stringify(target));
        } catch {
          // ignore
        }
      }
    },

    logout: () => {
      set({ isAuthenticated: false, currentStaffUser: null });
      try {
        localStorage.removeItem('theicons_current_staff');
      } catch {
        // ignore
      }
    },

    addStaffMember: (staffData) => {
      const newStaff: StaffMember = {
        ...staffData,
        id: `staff-${Date.now()}`,
        lastActive: 'Just registered',
      };
      set((state) => {
        const updated = [...state.staffMembers, newStaff];
        try {
          localStorage.setItem('theicons_staff', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { staffMembers: updated };
      });
    },

    updateStaffMember: (id, updates) => {
      set((state) => {
        const updated = state.staffMembers.map((s) => (s.id === id ? { ...s, ...updates } : s));
        try {
          localStorage.setItem('theicons_staff', JSON.stringify(updated));
        } catch {
          // ignore
        }
        const updatedCurrentUser = state.currentStaffUser?.id === id 
          ? { ...state.currentStaffUser, ...updates } 
          : state.currentStaffUser;
        return { staffMembers: updated, currentStaffUser: updatedCurrentUser };
      });
    },

    deleteStaffMember: (id) => {
      set((state) => {
        const updated = state.staffMembers.filter((s) => s.id !== id);
        try {
          localStorage.setItem('theicons_staff', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { staffMembers: updated };
      });
    },

    toggleStaffStatus: (id) => {
      set((state) => {
        const updated = state.staffMembers.map((s) => {
          if (s.id === id) {
            const nextStatus: StaffMember['status'] = s.status === 'active' ? 'inactive' : 'active';
            return { ...s, status: nextStatus };
          }
          return s;
        });
        try {
          localStorage.setItem('theicons_staff', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { staffMembers: updated };
      });
    },

    updateStaffPermissions: (id, permissions) => {
      set((state) => {
        const updated = state.staffMembers.map((s) => {
          if (s.id === id) {
            return {
              ...s,
              permissions: { ...s.permissions, ...permissions },
            };
          }
          return s;
        });
        try {
          localStorage.setItem('theicons_staff', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { staffMembers: updated };
      });
    },

    getDefaultPermissionsForRole: (role) => {
      return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.barber;
    },
  };
});
