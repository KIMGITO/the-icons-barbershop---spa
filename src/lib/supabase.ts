import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Singleton
 * 
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.
 * If not configured, returns a mock client that gracefully falls back to
 * the existing localStorage-based seed data so the app remains runnable
 * for local development before cloud credentials are supplied.
 */

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') && 
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON')
);

/**
 * Mock client — mirrors the Supabase query/chainable API shape minimally so
 * services can call it without crashing when env vars are absent.
 */
const createMockClient = (): Partial<SupabaseClient> => {
  const chainable = () => ({
    eq: () => chainable(),
    neq: () => chainable(),
    gt: () => chainable(),
    gte: () => chainable(),
    lt: () => chainable(),
    lte: () => chainable(),
    like: () => chainable(),
    ilike: () => chainable(),
    in: () => chainable(),
    order: () => chainable(),
    range: () => chainable(),
    select: async () => ({ data: null, error: { message: `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env` } }),
    insert: async () => ({ data: null, error: { message: `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env` } }),
    update: async () => ({ data: null, error: { message: `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env` } }),
    delete: async () => ({ data: null, error: { message: `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env` } }),
    upsert: async () => ({ data: null, error: { message: `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env` } })
  });

  return {
    from: () => chainable() as any,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Supabase Storage not configured.' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null })
      })
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase Auth not configured.' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      getUser: async () => ({ data: { user: null }, error: null })
    },
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }), subscribe: () => ({ unsubscribe: () => {} }), unsubscribe: () => {} }),
    removeChannel: () => {},
    removeAllChannels: () => {},
    realtime: { connect: () => {}, disconnect: () => {} }
  } as unknown as SupabaseClient;
};

/** Singleton export */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createMockClient() as unknown as SupabaseClient;

export default supabase;