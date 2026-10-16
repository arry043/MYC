import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@myc/types";
import { sanitizeRedirectUrl } from "@myc/utils";

import { getPublicEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/dashboard", "/calendar", "/commitments", "/analytics", "/settings"];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

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

  // getUser() validates the token against the Supabase Auth server.
  // Never use getSession() inside middleware/proxy as it is not cryptographically verified.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isVerifyEmailPage = pathname === "/verify-email";

  // 1. Unauthenticated users trying to access protected pages
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    const safeNext = sanitizeRedirectUrl(pathname);
    if (safeNext !== "/dashboard") {
      loginUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Unauthenticated user on verify-email page
  if (isVerifyEmailPage && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Authenticated user checks
  if (user) {
    const isEmailVerified = Boolean(user.email_confirmed_at);

    // If email is not verified, block access to protected features and direct to verify-email
    if (!isEmailVerified) {
      if (isProtected || isAuthPage) {
        return NextResponse.redirect(new URL("/verify-email", request.url));
      }
    } else {
      // If email is already verified:
      // - Redirect away from /verify-email to /dashboard
      if (isVerifyEmailPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // - Redirect away from auth pages (login, signup, forgot-password) to /dashboard
      if (isAuthPage) {
        const nextParam = request.nextUrl.searchParams.get("next");
        const destination = sanitizeRedirectUrl(nextParam, "/dashboard");
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
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
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/|api/dev/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
