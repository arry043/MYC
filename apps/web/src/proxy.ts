import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@myc/types";
import { resolveAuthRouteDecision } from "@myc/utils";

import { getPublicEnv } from "@/lib/env";

/**
 * Next.js 16 Proxy convention (renamed from middleware).
 * Refreshes Supabase auth cookies and enforces route protection boundaries.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Helper to ensure refreshed session cookies are preserved across redirects
  function redirectWithCookies(target: string | URL): NextResponse {
    const redirectUrl = new URL(target, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  // getUser() validates the token against the Supabase Auth server.
  // Never use getSession() inside middleware/proxy as it is not cryptographically verified.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const decision = resolveAuthRouteDecision({
    pathname,
    hasUser: Boolean(user),
    isEmailVerified: Boolean(user?.email_confirmed_at),
    nextParam: request.nextUrl.searchParams.get("next"),
    searchParams: request.nextUrl.searchParams,
  });

  if (decision.action === "redirect") {
    return redirectWithCookies(decision.destination);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static chunks, css, fonts)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, apple-icon.png, manifest.webmanifest
     * - dev routes (/api/dev/...)
     * - static image and icon extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/|sw.js|api/dev/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
