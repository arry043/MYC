import "expo-sqlite/localStorage/install";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@myc/types";

import { getPublicEnv } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/**
 * Shared Supabase client for the app. Uses the anon key; access is enforced
 * by RLS. Sessions persist on-device via expo-sqlite's localStorage.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
