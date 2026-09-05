import { StaffUser, StaffSession } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SESSION_STORAGE_KEY = 'theicons_staff_session';

const mapSupabaseUser = async (supabaseUser: any): Promise<StaffUser> => {
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .maybeSingle();
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    fullName: profile?.full_name || meta?.full_name || supabaseUser.email?.split('@')[0] || 'Staff Member',
    role: (profile?.role as any) || meta?.role || 'provider',
    providerId: profile?.provider_id || meta?.provider_id || undefined,
    avatarUrl: profile?.avatar_url || meta?.avatar_url || undefined,
    phone: profile?.phone || undefined,
    mustChangePassword: profile?.must_change_password ?? true
  };
};

export const authService = {
  /**
   * Authenticate staff user via Supabase Auth.
   * No demo/local fallback — production-grade authentication only.
   */
  async login(email: string, password: string): Promise<{ session: StaffSession; user: StaffUser }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new Error(error?.message || 'Invalid email or password.');
    }
    const user = await mapSupabaseUser(data.user);
    const session: StaffSession = {
      token: data.session?.access_token || 'staff_token_' + Date.now(),
      user,
      expiresAt: data.session?.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); } catch {}
    return { session, user };
  },

  /**
   * End current session
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
  },

  /**
   * Retrieve active session and validate integrity
   */
  async getCurrentSession(): Promise<StaffSession | null> {
    if (!isSupabaseConfigured) return null;
    
    // 1. Get current Supabase session
    const { data: { session: sbSession } } = await supabase.auth.getSession();
    
    // 2. Get local cached session
    const cached = this.getCachedLocalSession();
    
    // 3. Compare and validate
    if (sbSession && cached) {
      // If user IDs mismatch, force logout
      if (sbSession.user.id !== cached.user.id) {
        console.warn('Session mismatch detected. Logging out.');
        await this.logout();
        return null;
      }
      return cached;
    }
    
    // If we have a Supabase session but no cache, or they mismatch, rebuild cache
    if (sbSession?.user) {
      const user = await mapSupabaseUser(sbSession.user);
      const session: StaffSession = {
        token: sbSession.access_token,
        user,
        expiresAt: new Date((sbSession.expires_at || 0) * 1000).toISOString()
      };
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); } catch {}
      return session;
    }

    // No valid session
    if (cached) {
      try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    }
    return null;
  },

  getCachedLocalSession(): StaffSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session: StaffSession = JSON.parse(raw);
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Change password (forced first-login flow). Uses edge function when configured.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const session = await this.getCurrentSession();
    const url = String(import.meta.env.VITE_SUPABASE_URL) + "/functions/v1/update-password";
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.token || '') },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to update password.');
    }
    if (session?.user) {
      session.user.mustChangePassword = false;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  },

  /**
   * Send password reset email via Supabase Auth
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { success: !error, message: error ? error.message : 'Password reset instructions have been emailed.' };
  },

  /**
   * Reset password with verification token via Supabase Auth
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true, message: 'Your password has been successfully updated.' };
  }
};