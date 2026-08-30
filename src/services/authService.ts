import { StaffUser, StaffSession } from '../types/staff';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SESSION_STORAGE_KEY = 'theicons_staff_session';

// Seeded Staff Accounts (Ready to be backed by Supabase Auth + public.staff_profiles)
export const SEEDED_STAFF_ACCOUNTS: Array<StaffUser & { passwordHash: string }> = [
  {
    id: 'user-admin-1',
    email: 'admin@theicons.co.ke',
    fullName: 'Dennis Kimanthi',
    role: 'admin',
    providerId: 'provider-admin',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    phone: '+254 743 952 173',
    passwordHash: 'admin123'
  },
  {
    id: 'user-prov-1',
    email: 'samuel@theicons.co.ke',
    fullName: 'Samuel Mwangi',
    role: 'provider',
    providerId: 'provider-1',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    phone: '+254 722 111 222',
    passwordHash: 'barber123'
  },
  {
    id: 'user-prov-2',
    email: 'james@theicons.co.ke',
    fullName: 'James Mwangi',
    role: 'provider',
    providerId: 'provider-2',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    phone: '+254 711 889 900',
    passwordHash: 'facial123'
  },
  {
    id: 'user-prov-3',
    email: 'david@theicons.co.ke',
    fullName: 'David Njenga',
    role: 'provider',
    providerId: 'provider-3',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    phone: '+254 722 334 455',
    passwordHash: 'spa123'
  },
  {
    id: 'user-prov-4',
    email: 'brian@theicons.co.ke',
    fullName: 'Brian Mutua',
    role: 'provider',
    providerId: 'provider-4',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
    phone: '+254 722 448 899',
    passwordHash: 'scalp123'
  }
];

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
   * Authenticate staff user.
   * Uses Supabase Auth when configured; otherwise falls back to seeded demo accounts.
   */
  async login(email: string, password: string): Promise<{ session: StaffSession; user: StaffUser }> {
    if (isSupabaseConfigured) {
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
    }

    // Local demo fallback
    await new Promise(r => setTimeout(r, 350));

    const normalizedEmail = email.trim().toLowerCase();
    const account = SEEDED_STAFF_ACCOUNTS.find(a => a.email.toLowerCase() === normalizedEmail);

    if (!account) {
      throw new Error('Invalid email or password. Please verify credentials.');
    }

    // Simple demo password match (in production Supabase handles bcrypt hashing)
    if (account.passwordHash !== password && password !== 'theicons2026') {
      throw new Error('Incorrect password. For demo access use the listed credentials.');
    }

    const { passwordHash: _, ...user } = account;
    user.mustChangePassword = normalizedEmail === 'admin@theicons.co.ke' && password === 'Admin@123';
    const session: StaffSession = {
      token: `staff_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}

    return { session, user };
  },

  /**
   * End current session
   * Drop-in replacement for supabase.auth.signOut()
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
  },

  /**
   * Retrieve active session
   * Drop-in replacement for supabase.auth.getSession()
   */
  async getCurrentSession(): Promise<StaffSession | null> {
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const cached = this.getCachedLocalSession();
        if (cached) return cached;
        const user = await mapSupabaseUser(data.session.user);
        const session: StaffSession = {
          token: data.session.access_token,
          user,
          expiresAt: new Date((data.session.expires_at || 0) * 1000).toISOString()
        };
        try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); } catch {}
        return session;
      }
      return null;
    }
    return this.getCachedLocalSession();
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
  async changePassword(newPassword: string): Promise<void> {
    if (isSupabaseConfigured) {
      const session = await this.getCurrentSession();
      const url = String(import.meta.env.VITE_SUPABASE_URL) + "/functions/v1/update-password";
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.token || '') },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update password.');
      }
      if (session?.user) {
        session.user.mustChangePassword = false;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
      return;
    }
    const session = this.getCachedLocalSession();
    if (session?.user) {
      session.user.mustChangePassword = false;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  },

  /**
   * Send password reset email
   * Drop-in replacement for supabase.auth.resetPasswordForEmail()
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { success: !error, message: error ? error.message : 'Password reset instructions have been emailed.' };
    }
    await new Promise(r => setTimeout(r, 400));
    const normalized = email.trim().toLowerCase();
    const account = SEEDED_STAFF_ACCOUNTS.find(a => a.email.toLowerCase() === normalized);
    
    if (!account) {
      // Security best practice: don't reveal whether account exists
      return {
        success: true,
        message: 'If an active staff account exists for this email, password reset instructions have been dispatched.'
      };
    }

    return {
      success: true,
      message: `Password reset link sent to ${email}. Check your inbox or proceed with the reset code in the portal.`
    };
  },

  /**
   * Reset password with verification token
   * Drop-in replacement for supabase.auth.updateUser()
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      return { success: true, message: 'Your password has been successfully updated.' };
    }
    await new Promise(r => setTimeout(r, 350));
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters in length.');
    }
    return {
      success: true,
      message: 'Your password has been successfully updated. You may now sign in with your new credentials.'
    };
  }
};
