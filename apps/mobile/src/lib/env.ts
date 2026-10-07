import { requireEnv, requireUrlEnv } from "@myc/utils";

/**
 * Public environment variables, inlined into the app bundle by Expo.
 *
 * Each variable must be referenced literally (`process.env.EXPO_PUBLIC_…`)
 * for Expo to inline it. Everything here ships inside the app binary, so
 * never add secrets (e.g. the Supabase service-role key).
 */
export function getPublicEnv() {
  return {
    supabaseUrl: requireUrlEnv("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: requireEnv(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
