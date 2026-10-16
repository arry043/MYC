import { NextResponse } from "next/server";

import { sanitizeRedirectUrl } from "@myc/utils";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles OAuth and email confirmation callbacks from Supabase Auth.
 * Exchanges the auth code for a session and redirects to the intended destination.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");
  const type = requestUrl.searchParams.get("type");

  const destination = sanitizeRedirectUrl(
    next,
    type === "recovery" ? "/reset-password" : "/dashboard",
  );

  if (error) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // If this was an account linking flow returning to settings, append a status param
      const targetUrl = new URL(destination, requestUrl.origin);
      if (destination.startsWith("/settings")) {
        targetUrl.searchParams.set("linked", "google");
      }
      return NextResponse.redirect(targetUrl);
    }

    // Exchange failed (e.g. expired code or already consumed)
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(loginUrl);
  }

  // Fallback if accessed without code or error
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
