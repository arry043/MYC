import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { AppState, type AppStateStatus, Linking } from "react-native";

import { formatAuthError, parseAuthCallbackParams } from "@myc/utils";

import { getSupabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Handles incoming OAuth callback or confirmation deep links (`myc://...`).
 */
export async function handleAuthUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const params = parseAuthCallbackParams(url);

    if (params.error) {
      return { ok: false, error: params.errorDescription || params.error };
    }

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) return { ok: false, error: formatAuthError(error) };
      return { ok: true };
    }

    if (params.accessToken && params.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) return { ok: false, error: formatAuthError(error) };
      return { ok: true };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatAuthError(err) };
  }
}

/**
 * Initializes mobile auth listeners:
 * 1. AppState listener: pauses token refresh in background, resumes when active.
 * 2. Deep linking listener: handles OAuth redirect callbacks.
 * 3. AuthState listener: notifies subscriber when session changes.
 */
export function setupMobileAuth(
  onUserChange?: (user: User | null, session: Session | null) => void,
): () => void {
  const supabase = getSupabase();

  // 1. AppState Auto-Refresh Management
  const appStateSub = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  // 2. OAuth Deep Linking Callback Handling
  const linkingSub = Linking.addEventListener("url", ({ url }) => {
    if (url.startsWith("myc://")) {
      void handleAuthUrl(url);
    }
  });

  // Check initial URL if app was opened via deep link
  void Linking.getInitialURL().then((initialUrl) => {
    if (initialUrl && initialUrl.startsWith("myc://")) {
      void handleAuthUrl(initialUrl);
    }
  });

  // 3. Supabase Auth State Change Listener
  const {
    data: { subscription: authSub },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (onUserChange) {
      onUserChange(session?.user ?? null, session);
    }
  });

  // Initial session restoration
  void supabase.auth.getSession().then(({ data: { session } }) => {
    if (onUserChange) {
      onUserChange(session?.user ?? null, session);
    }
  });

  return () => {
    appStateSub.remove();
    linkingSub.remove();
    authSub.unsubscribe();
  };
}

/**
 * Triggers Google OAuth on mobile using the system browser and deep-linking redirect.
 */
export async function signInWithGoogleMobile(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "myc://auth/callback",
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { ok: false, error: formatAuthError(error) };
    }

    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, "myc://auth/callback");
      if (res.type === "success" && res.url) {
        return await handleAuthUrl(res.url);
      }
      if (res.type === "cancel" || res.type === "dismiss") {
        return { ok: false, error: "Sign in with Google was cancelled." };
      }
      return { ok: true };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatAuthError(err) };
  }
}

/**
 * Mobile local sign out (Requirement §6).
 */
export async function signOutMobile(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut({ scope: "local" });
}

/**
 * Mobile global sign out from all devices (revokes all refresh tokens).
 */
export async function signOutAllDevicesMobile(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut({ scope: "global" });
}
