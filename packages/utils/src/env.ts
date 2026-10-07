/**
 * Environment variable validation shared by all MYC clients.
 *
 * These helpers take values, not names to look up, because Next.js
 * (`NEXT_PUBLIC_*`) and Expo (`EXPO_PUBLIC_*`) only inline public variables
 * that are referenced literally, e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * Each app reads its variables explicitly and passes them in here.
 */

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new EnvError(`Missing environment variable ${name}. See .env.example for setup.`);
  }
  return trimmed;
}

// A plain pattern check rather than `new URL()`, whose React Native
// implementation is incomplete.
const HTTP_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export function requireUrlEnv(name: string, value: string | undefined): string {
  const url = requireEnv(name, value);
  if (!HTTP_URL.test(url)) {
    throw new EnvError(`Environment variable ${name} must be an http(s) URL (got "${url}").`);
  }
  return url;
}
