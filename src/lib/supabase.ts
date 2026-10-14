import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const authClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

export function createAnonSupabaseClient() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    authClientOptions,
  );
}

export function createUserSupabaseClient(accessToken: string) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      ...authClientOptions,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}
