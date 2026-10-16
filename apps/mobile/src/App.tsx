import type { User } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { extractAuthIdentities, formatAuthError, isValidEmail, validatePassword } from "@myc/utils";

import { setupMobileAuth, signInWithGoogleMobile, signOutMobile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Development-only diagnostics. Required inside a `__DEV__` branch so Metro
// strips the module from production bundles entirely.
const devTools: typeof import("@/dev/SupabaseStatus") | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would ship to production
    require("@/dev/SupabaseStatus")
  : null;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = setupMobileAuth((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return cleanup;
  }, []);

  const handleEmailAuth = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setErrorMessage(validation.message ?? "Password must be at least 8 characters.");
      return;
    }

    try {
      setActionLoading(true);
      const supabase = getSupabase();

      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "myc://auth/callback",
          },
        });

        if (error) {
          setErrorMessage(formatAuthError(error));
        } else if (data.user && !data.user.email_confirmed_at) {
          setStatusMessage("Account created. Please check your email to verify your address.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(formatAuthError(error));
        }
      }
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setActionLoading(true);
    const result = await signInWithGoogleMobile();
    if (!result.ok && result.error) {
      setErrorMessage(result.error);
    }
    setActionLoading(false);
  };

  const handleSignOut = async () => {
    setActionLoading(true);
    await signOutMobile();
    setCurrentUser(null);
    setActionLoading(false);
  };

  const identitiesSummary = extractAuthIdentities(currentUser);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4B93D6" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MYC</Text>
        <Text style={styles.subtitle}>Make Yourself Consistent</Text>
      </View>

      {currentUser ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signed in</Text>
          <Text style={styles.userEmail}>{currentUser.email}</Text>

          <View style={styles.badgeRow}>
            {identitiesSummary.hasEmail && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Password</Text>
              </View>
            )}
            {identitiesSummary.hasGoogle && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Google</Text>
              </View>
            )}
          </View>

          <Text style={styles.infoText}>
            Your multi-device identity is active on this Android device.
          </Text>

          <Pressable
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.signOutButtonText}>Sign out</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {authMode === "signin" ? "Sign in to MYC" : "Create account"}
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {statusMessage && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          <Pressable
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={actionLoading}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#8a8a8a"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!actionLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password (at least 8 chars)"
            placeholderTextColor="#8a8a8a"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!actionLoading}
          />

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleEmailAuth}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === "signin" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            style={styles.switchModeButton}
          >
            <Text style={styles.switchModeText}>
              {authMode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </View>
      )}

      {devTools && <devTools.SupabaseStatus />}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdfaf4",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fdfaf4",
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0a0a0a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b6b6b",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e8e5df",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0a0a0a",
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2a2a2a",
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#e8f2fc",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2b6cb0",
  },
  infoText: {
    fontSize: 13,
    color: "#737373",
    textAlign: "center",
    marginVertical: 4,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd8cf",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0a0a0a",
    backgroundColor: "#ffffff",
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#4B93D6",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  googleButton: {
    backgroundColor: "#f5f3ee",
    borderWidth: 1,
    borderColor: "#e0dcd4",
  },
  googleButtonText: {
    color: "#1a1a1a",
    fontWeight: "600",
    fontSize: 15,
  },
  signOutButton: {
    backgroundColor: "#f5f3ee",
    borderWidth: 1,
    borderColor: "#e0dcd4",
    marginTop: 8,
  },
  signOutButtonText: {
    color: "#c53030",
    fontWeight: "600",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e1d8",
  },
  dividerText: {
    fontSize: 12,
    color: "#8a8a8a",
    textTransform: "uppercase",
  },
  switchModeButton: {
    alignItems: "center",
    marginTop: 4,
  },
  switchModeText: {
    fontSize: 13,
    color: "#4B93D6",
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#fde8e8",
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#c53030",
  },
  statusBox: {
    backgroundColor: "#e6fffa",
    padding: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    color: "#234e52",
  },
});
