import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@myc/types";

import { getPublicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses the anon key; access is enforced by RLS. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
