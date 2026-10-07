import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@myc/types";

import { getPublicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Functions and Route Handlers.
 * Create a new client per request; never share one across requests.
 */
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Safe to ignore once a proxy
          // refreshes the session on each request (added with authentication).
        }
      },
    },
  });
}
