import { requireEnv, requireUrlEnv } from "@myc/utils";

/**
 * Public (browser-safe) environment variables.
 *
 * Each variable must be referenced literally (`process.env.NEXT_PUBLIC_…`) so
 * Next.js can inline it into the client bundle. Validation runs lazily, the
 * first time a Supabase client is created, so pages that don't touch
 * Supabase still render while the project is being configured.
 *
 * Never add secrets here: anything prefixed NEXT_PUBLIC_ ships to the browser.
 * Server-only secrets belong in a separate module that begins with
 * `import "server-only"`, so importing it from client code fails the build.
 * The Supabase service-role / secret key must not be used by this app at all
 * (enforced by ESLint); privileged work belongs in Edge Functions.
 */
export function getPublicEnv() {
  return {
    supabaseUrl: requireUrlEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
