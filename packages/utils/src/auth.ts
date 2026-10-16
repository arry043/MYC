/**
 * Platform-agnostic authentication utilities shared across MYC clients.
 *
 * Enforces validation rules, URL sanitization against open redirects,
 * provider detection, and calm, non-judgmental error messaging per PRD §43.
 */

export interface AuthIdentitySummary {
  /** True if the user has an email/password identity connected. */
  hasEmail: boolean;
  /** True if the user has a Google OAuth identity connected. */
  hasGoogle: boolean;
  /** True if the user's email address has been verified. */
  isEmailVerified: boolean;
  /** Primary sign-in provider or providers. */
  providers: string[];
  /** Google identity record if connected. */
  googleIdentityId?: string;
  /** Email identity record if connected. */
  emailIdentityId?: string;
}

export interface MinimalUser {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  identities?: Array<{
    id?: string;
    identity_id?: string;
    provider: string;
    created_at?: string;
    last_sign_in_at?: string;
  }> | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates whether an email string has a valid email format.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates password strength for MYC accounts.
 * Passwords must be at least 8 characters long.
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
    };
  }
  return { valid: true };
}

/**
 * Sanitizes a redirect destination path to prevent open redirects.
 * Only allows relative paths that start with a single "/" and do not
 * contain protocol-relative "//" or backslashes.
 */
export function sanitizeRedirectUrl(
  target: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();
  // Must start with '/' and not '//' (protocol relative), and cannot contain backslashes or scheme
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  // Reject URLs containing colon before the first slash or question mark (e.g. javascript: or data:)
  const firstPathSegment = trimmed.split(/[?#/]/)[0] ?? "";
  if (firstPathSegment.includes(":")) {
    return fallback;
  }

  return trimmed;
}

/**
 * Extracts connected identity providers and verification state from a Supabase User object.
 */
export function extractAuthIdentities(user: MinimalUser | null | undefined): AuthIdentitySummary {
  if (!user) {
    return {
      hasEmail: false,
      hasGoogle: false,
      isEmailVerified: false,
      providers: [],
    };
  }

  const identities = user.identities ?? [];
  const appProviders = user.app_metadata?.providers ?? [];
  const primaryProvider = user.app_metadata?.provider;

  const googleIdentity = identities.find((id) => id.provider === "google");
  const emailIdentity = identities.find((id) => id.provider === "email");

  const hasGoogle = Boolean(
    googleIdentity || appProviders.includes("google") || primaryProvider === "google",
  );
  const hasEmail = Boolean(
    emailIdentity || appProviders.includes("email") || primaryProvider === "email",
  );

  const isEmailVerified = Boolean(user.email_confirmed_at);

  const providersSet = new Set<string>();
  if (hasEmail) providersSet.add("email");
  if (hasGoogle) providersSet.add("google");
  for (const p of appProviders) {
    providersSet.add(p);
  }

  return {
    hasEmail,
    hasGoogle,
    isEmailVerified,
    providers: Array.from(providersSet),
    googleIdentityId: googleIdentity?.identity_id ?? googleIdentity?.id,
    emailIdentityId: emailIdentity?.identity_id ?? emailIdentity?.id,
  };
}

/**
 * Determines whether a given provider identity can safely be unlinked.
 * Users must keep at least one authentication method to avoid account lockout.
 */
export function canUnlinkProvider(
  summary: AuthIdentitySummary,
  providerToUnlink: "google" | "email",
): boolean {
  if (providerToUnlink === "google") {
    // Only allow unlinking Google if the user also has an email/password identity
    return summary.hasGoogle && summary.hasEmail;
  }
  if (providerToUnlink === "email") {
    // Only allow unlinking email if the user also has Google connected
    return summary.hasEmail && summary.hasGoogle;
  }
  return false;
}

/**
 * Formats Supabase and OAuth errors into calm, helpful, non-judgmental MYC messages.
 * Never leaks sensitive stack traces or raw server details to the user.
 */
export function formatAuthError(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  const lower = rawMessage.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
    return "Incorrect email or password. Please try again or reset your password.";
  }

  if (lower.includes("user already registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed") ||
    lower.includes("confirm your email")
  ) {
    return "Please verify your email address before signing in. Check your inbox for the verification link.";
  }

  if (
    lower.includes("identity_already_exists") ||
    lower.includes("identity is already linked") ||
    lower.includes("already linked to another user")
  ) {
    return "This Google account is already linked to another MYC account. To protect your data, accounts cannot be merged automatically.";
  }

  if (lower.includes("weak password") || lower.includes("password is too weak")) {
    return "Please choose a stronger password (at least 8 characters).";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  if (lower.includes("access_denied") || lower.includes("user cancelled")) {
    return "Sign in with Google was cancelled.";
  }

  if (lower.includes("expired") || lower.includes("token has expired")) {
    return "This link has expired. Please request a new one.";
  }

  return rawMessage || "Unable to complete request. Please try again.";
}

/**
 * Parses parameters from an OAuth redirect or deep-link URL (used on mobile and web callbacks).
 */
export function parseAuthCallbackParams(rawUrl: string): {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
  type?: string;
} {
  try {
    // Replace hash '#' with '?' if no query params exist, or append parameters
    let urlString = rawUrl;
    if (urlString.includes("#")) {
      const [baseAndQuery, hashFragment] = urlString.split("#", 2);
      if (hashFragment) {
        const delimiter = baseAndQuery?.includes("?") ? "&" : "?";
        urlString = `${baseAndQuery}${delimiter}${hashFragment}`;
      }
    }

    const parsed = new URL(urlString, "http://localhost");
    const code = parsed.searchParams.get("code") ?? undefined;
    const accessToken = parsed.searchParams.get("access_token") ?? undefined;
    const refreshToken = parsed.searchParams.get("refresh_token") ?? undefined;
    const error = parsed.searchParams.get("error") ?? undefined;
    const errorDescription = parsed.searchParams.get("error_description") ?? undefined;
    const type = parsed.searchParams.get("type") ?? undefined;

    return { code, accessToken, refreshToken, error, errorDescription, type };
  } catch {
    return {};
  }
}
