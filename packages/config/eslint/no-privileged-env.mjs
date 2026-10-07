/**
 * Client apps (web, mobile) must never read privileged Supabase credentials:
 * the service-role / secret key bypasses Row Level Security. Privileged work
 * belongs in Supabase Edge Functions, which receive the key from Supabase.
 *
 * Flags `process.env.X` and `process.env["X"]` where X mentions SERVICE_ROLE
 * or SUPABASE_SECRET.
 */
const PRIVILEGED = "/SERVICE_ROLE|SUPABASE_SECRET/i";
const ENV = "[object.object.name='process'][object.property.name='env']";
const MESSAGE =
  "Privileged Supabase credentials (service-role / secret key) must never be used in client apps. Use an Edge Function.";

export const noPrivilegedEnvRules = {
  "no-restricted-syntax": [
    "error",
    { selector: `MemberExpression${ENV}[property.name=${PRIVILEGED}]`, message: MESSAGE },
    { selector: `MemberExpression${ENV}[property.value=${PRIVILEGED}]`, message: MESSAGE },
  ],
};
