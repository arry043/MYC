import { ArrowLeft, CheckCircle2, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatAuthError, isValidEmail, validatePassword } from "@myc/utils";

import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { signInWithGoogleMobile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

export type AuthViewMode = "signin" | "signup" | "forgot" | "verify";

export interface AuthScreenProps {
  initialMode?: AuthViewMode;
}

export function AuthScreen({ initialMode = "signin" }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthViewMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleEmailAuth = async () => {
    resetFormState();

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        const supabase = getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "myc://auth/callback?type=recovery",
        });

        if (error) {
          setErrorMessage(formatAuthError(error));
        } else {
          setSuccessMessage("Password reset instructions have been sent to your email.");
        }
      } catch (err) {
        setErrorMessage(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setErrorMessage(passwordValidation.message ?? "Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: "myc://auth/callback",
          },
        });

        if (error) {
          setErrorMessage(formatAuthError(error));
        } else if (data.user && !data.user.email_confirmed_at) {
          setMode("verify");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("email not confirmed") ||
            (error as any).code === "email_not_confirmed"
          ) {
            setMode("verify");
          } else {
            setErrorMessage(formatAuthError(error));
          }
        } else if (data.user && !data.user.email_confirmed_at) {
          setMode("verify");
        }
      }
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetFormState();
    setLoading(true);
    const result = await signInWithGoogleMobile();
    if (!result.ok && result.error) {
      setErrorMessage(result.error);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <BrandMark size={44} />
          <Text style={styles.brandName}>MYC</Text>
          <Text style={styles.brandTagline}>Don&apos;t rely on motivation. Build consistency.</Text>
        </View>

        {mode === "verify" ? (
          <Card style={styles.card}>
            <View style={styles.verifyIconContainer}>
              <Mail size={32} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Verify your email</Text>
            <Text style={styles.verifyDescription}>
              We sent a confirmation link to{" "}
              <Text style={styles.boldText}>{email || "your address"}</Text>. Please tap the link in
              that email to activate your account.
            </Text>

            <Button
              variant="secondary"
              onPress={() => {
                resetFormState();
                setMode("signin");
              }}
              style={styles.backButton}
              icon={<ArrowLeft size={16} color={colors.foreground} />}
            >
              Back to Sign in
            </Button>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                  ? "Begin consistency"
                  : "Reset password"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === "signin"
                ? "Sign in to continue your consistency journey."
                : mode === "signup"
                  ? "Create your single account for web, mobile and widget."
                  : "Enter your email to receive a password reset link."}
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Google OAuth (only for signin/signup) */}
            {mode !== "forgot" && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  style={styles.googleBtn}
                >
                  Continue with Google
                </Button>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or with email</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            {/* Email form */}
            <View style={styles.form}>
              <Input
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              {mode !== "forgot" && (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  editable={!loading}
                />
              )}

              {mode === "signup" && (
                <Input
                  label="Confirm password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  isPassword
                  editable={!loading}
                />
              )}

              {mode === "signin" && (
                <Pressable
                  onPress={() => {
                    resetFormState();
                    setMode("forgot");
                  }}
                  style={styles.forgotPassBtn}
                >
                  <Text style={styles.forgotPassText}>Forgot password?</Text>
                </Pressable>
              )}

              <Button
                variant="primary"
                size="lg"
                onPress={handleEmailAuth}
                loading={loading}
                disabled={loading}
                style={styles.submitBtn}
              >
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
              </Button>
            </View>

            {/* Switch mode links */}
            <View style={styles.footerRow}>
              {mode === "signin" ? (
                <Text style={styles.footerText}>
                  Don&apos;t have an account?{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => {
                      resetFormState();
                      setMode("signup");
                    }}
                  >
                    Create one
                  </Text>
                </Text>
              ) : mode === "signup" ? (
                <Text style={styles.footerText}>
                  Already have an account?{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => {
                      resetFormState();
                      setMode("signin");
                    }}
                  >
                    Sign in
                  </Text>
                </Text>
              ) : (
                <Text
                  style={styles.linkText}
                  onPress={() => {
                    resetFormState();
                    setMode("signin");
                  }}
                >
                  Back to Sign in
                </Text>
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 20,
  },
  brandHeader: {
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
    marginTop: -8,
  },
  googleBtn: {
    width: "100%",
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
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  form: {
    gap: 14,
    width: "100%",
  },
  forgotPassBtn: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotPassText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  submitBtn: {
    width: "100%",
    marginTop: 4,
  },
  footerRow: {
    alignItems: "center",
    marginTop: 6,
  },
  footerText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  errorBox: {
    backgroundColor: colors.destructiveSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radii.md,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.destructive,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radii.md,
    padding: 12,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: colors.successForeground,
    lineHeight: 18,
  },
  verifyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  verifyDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: colors.foreground,
  },
  backButton: {
    marginTop: 8,
    width: "100%",
  },
});
