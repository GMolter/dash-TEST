import { createClient } from '@supabase/supabase-js';
import { createAuthRefreshFetch } from './authRefreshFetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

let browserStorage: Storage | undefined;
try { browserStorage = typeof window !== 'undefined' ? window.localStorage : undefined; } catch { /* Storage may be blocked. */ }

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: createAuthRefreshFetch(supabaseUrl, undefined, browserStorage) },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'olio-auth',
    storage: browserStorage,
  },
});
