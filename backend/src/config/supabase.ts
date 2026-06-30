import { createClient } from '@supabase/supabase-js';
import { config } from './env';
import type { Database } from '../types/database';

// Anon client — uses RLS, safe for reading public data
export const supabaseAnon = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Service-role client — bypasses RLS, use ONLY on backend for privileged ops
export const supabaseAdmin = createClient<Database>(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Create a client with user's JWT for RLS-scoped operations
export function createUserClient(accessToken: string) {
  const client = createClient<Database>(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
  return client;
}
