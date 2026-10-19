import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import type { Database } from "@myc/types";

import { getPublicEnv } from "@/lib/env";

/**
 * Storage adapter backed by Expo SecureStore (Android Keystore / EncryptedSharedPreferences).
 * Ensures tokens are never stored in plain text.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient<Database> | undefined;

/**
 * Shared Supabase client for the mobile app. Uses the anon key; access is enforced
 * by RLS. Sessions persist securely on-device via expo-secure-store.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
