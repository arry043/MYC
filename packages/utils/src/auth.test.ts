import assert from "node:assert";
import test from "node:test";

import {
  canUnlinkProvider,
  extractAuthIdentities,
  formatAuthError,
  isValidEmail,
  parseAuthCallbackParams,
  resolveAuthRouteDecision,
  sanitizeRedirectUrl,
  validatePassword,
} from "./auth.ts";

test("isValidEmail identifies valid and invalid emails", () => {
  assert.strictEqual(isValidEmail("user@example.com"), true);
  assert.strictEqual(isValidEmail("user.name+tag@sub.example.co"), true);
  assert.strictEqual(isValidEmail("invalid-email"), false);
  assert.strictEqual(isValidEmail("user@"), false);
  assert.strictEqual(isValidEmail("@example.com"), false);
  assert.strictEqual(isValidEmail(""), false);
});

test("validatePassword enforces minimum 8 characters", () => {
  assert.strictEqual(validatePassword("1234567").valid, false);
  assert.strictEqual(validatePassword("").valid, false);
  assert.strictEqual(validatePassword("12345678").valid, true);
  assert.strictEqual(validatePassword("my-secure-password").valid, true);
});

test("sanitizeRedirectUrl prevents open redirects and allows safe relative paths", () => {
  assert.strictEqual(sanitizeRedirectUrl("/dashboard"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl("/settings?tab=security"), "/settings?tab=security");
  assert.strictEqual(sanitizeRedirectUrl("/commitments"), "/commitments");

  // Attack vectors
  assert.strictEqual(sanitizeRedirectUrl("//attacker.com"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl("https://attacker.com"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl("http://attacker.com"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl("/\\attacker.com"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl("javascript:alert(1)"), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl(null), "/dashboard");
  assert.strictEqual(sanitizeRedirectUrl(""), "/dashboard");
});

test("extractAuthIdentities handles email-only, google-only, and linked accounts", () => {
  // Email-only user
  const emailUser = {
    id: "user-1",
    email: "user@example.com",
    email_confirmed_at: "2026-10-16T12:00:00Z",
    identities: [{ id: "id-1", identity_id: "id-1", provider: "email" }],
  };
  const emailSummary = extractAuthIdentities(emailUser);
  assert.strictEqual(emailSummary.hasEmail, true);
  assert.strictEqual(emailSummary.hasGoogle, false);
  assert.strictEqual(emailSummary.isEmailVerified, true);
  assert.strictEqual(canUnlinkProvider(emailSummary, "email"), false);
  assert.strictEqual(canUnlinkProvider(emailSummary, "google"), false);

  // Google-only user
  const googleUser = {
    id: "user-2",
    email: "google@example.com",
    email_confirmed_at: "2026-10-16T12:00:00Z",
    app_metadata: { provider: "google", providers: ["google"] },
    identities: [{ id: "gid-1", identity_id: "gid-1", provider: "google" }],
  };
  const googleSummary = extractAuthIdentities(googleUser);
  assert.strictEqual(googleSummary.hasEmail, false);
  assert.strictEqual(googleSummary.hasGoogle, true);
  assert.strictEqual(canUnlinkProvider(googleSummary, "google"), false);

  // Linked account (both Google and Email)
  const linkedUser = {
    id: "user-3",
    email: "user@example.com",
    email_confirmed_at: "2026-10-16T12:00:00Z",
    app_metadata: { providers: ["email", "google"] },
    identities: [
      { id: "id-1", identity_id: "id-1", provider: "email" },
      { id: "gid-1", identity_id: "gid-1", provider: "google" },
    ],
  };
  const linkedSummary = extractAuthIdentities(linkedUser);
  assert.strictEqual(linkedSummary.hasEmail, true);
  assert.strictEqual(linkedSummary.hasGoogle, true);
  assert.strictEqual(canUnlinkProvider(linkedSummary, "google"), true);
  assert.strictEqual(canUnlinkProvider(linkedSummary, "email"), true);

  // Unverified email user
  const unverifiedUser = {
    id: "user-4",
    email: "unverified@example.com",
    email_confirmed_at: null,
    identities: [{ provider: "email" }],
  };
  const unverifiedSummary = extractAuthIdentities(unverifiedUser);
  assert.strictEqual(unverifiedSummary.isEmailVerified, false);
});

test("formatAuthError returns calm, user-friendly messages", () => {
  assert.strictEqual(
    formatAuthError({ message: "Invalid login credentials" }),
    "Incorrect email or password. Please try again or reset your password.",
  );
  assert.strictEqual(
    formatAuthError({ message: "User already registered" }),
    "An account with this email already exists. Try signing in instead.",
  );
  assert.strictEqual(
    formatAuthError({ message: "Email not confirmed" }),
    "Please verify your email address before signing in. Check your inbox for the verification link.",
  );
  assert.strictEqual(
    formatAuthError({ message: "identity_already_exists" }),
    "This Google account is already linked to another MYC account. To protect your data, accounts cannot be merged automatically.",
  );
});

test("parseAuthCallbackParams parses code and hash fragments", () => {
  const codeUrl = "http://localhost:3000/auth/callback?code=test-code-123&next=/dashboard";
  const parsedCode = parseAuthCallbackParams(codeUrl);
  assert.strictEqual(parsedCode.code, "test-code-123");

  const hashUrl = "myc://#access_token=token123&refresh_token=refresh123&token_type=bearer";
  const parsedHash = parseAuthCallbackParams(hashUrl);
  assert.strictEqual(parsedHash.accessToken, "token123");
  assert.strictEqual(parsedHash.refreshToken, "refresh123");

  const errorUrl =
    "http://localhost:3000/auth/callback?error=access_denied&error_description=User+cancelled";
  const parsedError = parseAuthCallbackParams(errorUrl);
  assert.strictEqual(parsedError.error, "access_denied");
  assert.strictEqual(parsedError.errorDescription, "User cancelled");
});

test("resolveAuthRouteDecision: unauthenticated visitors", () => {
  // Public landing page is allowed
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/", hasUser: false }), {
    action: "allow",
  });

  // Auth pages are allowed
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/login", hasUser: false }), {
    action: "allow",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/signup", hasUser: false }), {
    action: "allow",
  });
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/forgot-password", hasUser: false }),
    { action: "allow" },
  );

  // Protected pages redirect to /login with next parameter
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/dashboard", hasUser: false }), {
    action: "redirect",
    destination: "/login",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/calendar", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fcalendar",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/commitments", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fcommitments",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/analytics", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fanalytics",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/profile", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fprofile",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/settings", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fsettings",
  });
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/onboarding", hasUser: false }), {
    action: "redirect",
    destination: "/login?next=%2Fonboarding",
  });

  // Verify email page redirects unauthenticated users to /login
  assert.deepStrictEqual(resolveAuthRouteDecision({ pathname: "/verify-email", hasUser: false }), {
    action: "redirect",
    destination: "/login",
  });
});

test("resolveAuthRouteDecision: authenticated unverified users", () => {
  // Landing page redirects to /verify-email
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/", hasUser: true, isEmailVerified: false }),
    { action: "redirect", destination: "/verify-email" },
  );

  // Auth pages redirect to /verify-email
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/login", hasUser: true, isEmailVerified: false }),
    { action: "redirect", destination: "/verify-email" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/signup", hasUser: true, isEmailVerified: false }),
    { action: "redirect", destination: "/verify-email" },
  );

  // Protected pages redirect to /verify-email
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/dashboard", hasUser: true, isEmailVerified: false }),
    { action: "redirect", destination: "/verify-email" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/commitments", hasUser: true, isEmailVerified: false }),
    { action: "redirect", destination: "/verify-email" },
  );

  // Verify-email page itself is allowed so user can see it
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/verify-email", hasUser: true, isEmailVerified: false }),
    { action: "allow" },
  );
});

test("resolveAuthRouteDecision: authenticated verified users", () => {
  // Landing page redirects to /dashboard immediately
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/", hasUser: true, isEmailVerified: true }),
    { action: "redirect", destination: "/dashboard" },
  );

  // Landing page preserves query params (e.g. PWA standalone source=pwa)
  assert.deepStrictEqual(
    resolveAuthRouteDecision({
      pathname: "/",
      hasUser: true,
      isEmailVerified: true,
      searchParams: { source: "pwa" },
    }),
    { action: "redirect", destination: "/dashboard?source=pwa" },
  );

  // Auth pages redirect to /dashboard (or nextParam if provided)
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/login", hasUser: true, isEmailVerified: true }),
    { action: "redirect", destination: "/dashboard" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({
      pathname: "/login",
      hasUser: true,
      isEmailVerified: true,
      nextParam: "/commitments",
    }),
    { action: "redirect", destination: "/commitments" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({
      pathname: "/login",
      hasUser: true,
      isEmailVerified: true,
      nextParam: "https://evil.com", // malicious redirect is sanitized
    }),
    { action: "redirect", destination: "/dashboard" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/signup", hasUser: true, isEmailVerified: true }),
    { action: "redirect", destination: "/dashboard" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({
      pathname: "/forgot-password",
      hasUser: true,
      isEmailVerified: true,
    }),
    { action: "redirect", destination: "/dashboard" },
  );

  // Verify-email redirects to /dashboard if already verified
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/verify-email", hasUser: true, isEmailVerified: true }),
    { action: "redirect", destination: "/dashboard" },
  );

  // Protected pages are allowed
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/dashboard", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/calendar", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/commitments", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/analytics", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/profile", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
  assert.deepStrictEqual(
    resolveAuthRouteDecision({ pathname: "/settings", hasUser: true, isEmailVerified: true }),
    { action: "allow" },
  );
});
