import assert from "node:assert";
import test from "node:test";

import {
  canUnlinkProvider,
  extractAuthIdentities,
  formatAuthError,
  isValidEmail,
  parseAuthCallbackParams,
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
