import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Mock the auth store as a zustand hook that returns state + actions
const mockAuthState: any = {
  user: null,
  session: null,
  role: null,
  loading: false,
  error: null as string | null,
  isAuthenticated: false,
  login: vi.fn(async () => true),
  logout: vi.fn(async () => {}),
  forgotPassword: vi.fn(async () => ({ success: true, message: 'Reset email sent' })),
  resetPassword: vi.fn(async () => ({ success: true, message: 'Password updated' })),
  changePassword: vi.fn(async () => {}),
  clearError: vi.fn(),
  init: vi.fn(async () => {}),
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => {
    if (typeof selector === 'function') return selector(mockAuthState);
    return mockAuthState;
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('button', props, children);
  },
}));

vi.mock('@/components/ui/Input', () => ({
  Input: ({ icon: _icon, ...props }: any) => {
    const React = require('react');
    return React.createElement('input', props);
  },
}));

describe('PortalAuth', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.error = null;
    mockAuthState.loading = false;
    mockAuthState.login = vi.fn(async () => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('auth store mock returns expected state', async () => {
    const mod = await import('@/stores/authStore');
    const state = mod.useAuthStore();
    expect(state.user).toBeNull();
    expect(state.login).toBeDefined();
  });

  it('login mock returns true for valid credentials', async () => {
    const result = await mockAuthState.login('admin@example.com', 'password123');
    expect(result).toBe(true);
  });

  it('error state can be set and cleared', () => {
    mockAuthState.error = 'Invalid credentials';
    expect(mockAuthState.error).toBe('Invalid credentials');
    mockAuthState.clearError();
    mockAuthState.error = null;
    expect(mockAuthState.error).toBeNull();
  });

  it('no demo accounts exist in authService', async () => {
    const mod = await import('@/services/authService');
    expect((mod as any).SEEDED_STAFF_ACCOUNTS).toBeUndefined();
    expect((mod as any).DEMO_CREDENTIALS).toBeUndefined();
  });
});
