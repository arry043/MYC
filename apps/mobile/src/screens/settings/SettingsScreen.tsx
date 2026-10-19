import type { User } from "@supabase/supabase-js";
import { Check, ChevronsUpDown, KeyRound, LogOut, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
  canUnlinkProvider,
  extractAuthIdentities,
  formatAuthError,
  validatePassword,
} from "@myc/utils";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { signInWithGoogleMobile, signOutMobile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { colors, radii, shadows } from "@/lib/theme";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

const REMINDER_TIMES = [
  { value: "07:00", label: "7:00 AM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:30", label: "9:30 PM" },
];

export interface SettingsScreenProps {
  onBack?: () => void;
  onSignOut: () => void;
}

export function SettingsScreen({ onSignOut }: SettingsScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reminders state
  const [dailyReminder, setDailyReminder] = useState(true);
  const [unfinishedReminder, setUnfinishedReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // Change password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);

  const refreshUser = async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load user in settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) {
          setCurrentUser(user);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load user in settings:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const identitiesSummary = extractAuthIdentities(currentUser);

  const handleChangePassword = async () => {
    setPasswordError(null);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.message ?? "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setActionLoading(true);
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(formatAuthError(error));
        return;
      }

      setPasswordModalVisible(false);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(
        "Success",
        isSettingNewPassword
          ? "Password established. You can now sign in with either your password or Google."
          : "Your account password was updated successfully.",
      );
      await refreshUser();
    } catch (err) {
      setPasswordError(formatAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!currentUser?.email) return;

    try {
      setActionLoading(true);
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: "myc://auth/callback",
      });

      if (error) {
        Alert.alert("Error", formatAuthError(error));
        return;
      }

      Alert.alert(
        "Reset link sent",
        `Password reset instructions have been sent to ${currentUser.email}.`,
      );
    } catch (err) {
      Alert.alert("Error", formatAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      setActionLoading(true);
      const result = await signInWithGoogleMobile();
      if (!result.ok && result.error) {
        Alert.alert("Could not connect Google", result.error);
      } else {
        Alert.alert("Connected", "Your Google account is now linked.");
        await refreshUser();
      }
    } catch {
      Alert.alert("Error", "Could not link Google account.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    const canDisconnect = canUnlinkProvider(identitiesSummary, "google");
    if (!canDisconnect) {
      Alert.alert(
        "Cannot disconnect Google",
        "You must establish a password before disconnecting Google to avoid account lockout.",
      );
      return;
    }

    Alert.alert(
      "Disconnect Google?",
      "Are you sure you want to disconnect Google sign-in from your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const supabase = getSupabase();
              const fullIdentities =
                (await supabase.auth.getUserIdentities()).data?.identities ?? [];
              const googleIdentity = fullIdentities.find((id) => id.provider === "google");

              if (!googleIdentity) {
                Alert.alert("Error", "Could not locate your Google identity.");
                return;
              }

              const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
              if (error) {
                Alert.alert("Error", formatAuthError(error));
                return;
              }

              Alert.alert("Disconnected", "Google sign-in has been unlinked from your account.");
              await refreshUser();
            } catch {
              Alert.alert("Error", "Could not unlink Google.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLocalSignOut = () => {
    Alert.alert("Sign out?", "Sign out on this mobile device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOutMobile();
          onSignOut();
        },
      },
    ]);
  };

  const selectedReminderLabel =
    REMINDER_TIMES.find((t) => t.value === reminderTime)?.label || "8:00 PM";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title}>Make MYC work for you</Text>
        <Text style={styles.description}>
          Your reminders, app preferences, and account security.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.cardsList}>
          {/* 1. Reminders Card */}
          <Card style={styles.card}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>Reminders</Text>
              <Text style={styles.cardSubtitle}>
                Gentle nudges, never spam. Turn off anything you don&apos;t need.
              </Text>
            </View>

            {/* Daily reminder switch row */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchLabel}>Daily reminder</Text>
                <Text style={styles.switchHint}>A short note at the time you choose.</Text>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                trackColor={{ false: "#E2E8F0", true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.separator} />

            {/* Unfinished commitments switch row */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchLabel}>Unfinished commitments</Text>
                <Text style={styles.switchHint}>
                  Only if something is still open late in the day.
                </Text>
              </View>
              <Switch
                value={unfinishedReminder}
                onValueChange={setUnfinishedReminder}
                trackColor={{ false: "#E2E8F0", true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.separator} />

            {/* Reminder time select row */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Reminder time</Text>
              <Pressable
                style={({ pressed }) => [styles.selectBox, pressed && styles.selectBoxPressed]}
                onPress={() => setTimePickerVisible(true)}
              >
                <Text style={styles.selectValueText}>{selectedReminderLabel}</Text>
                <ChevronsUpDown size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </Card>

          {/* 2. Account & Security Card */}
          <Card style={styles.card}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>Account & Security</Text>
              <Text style={styles.cardSubtitle}>
                Manage your sign-in methods, linked identities, and multi-device sessions.
              </Text>
            </View>

            {/* Email Address Section */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabelMuted}>Email address</Text>
              <View style={styles.emailBox}>
                <Text style={styles.emailText}>{currentUser?.email ?? "Signed in"}</Text>
                <Badge tone="mint">Verified</Badge>
              </View>
              <Text style={styles.fieldHint}>
                Your identity across web, mobile, and future widgets.
              </Text>
            </View>

            <View style={styles.separator} />

            {/* Sign-in Methods Section */}
            <View style={styles.fieldGroup}>
              <Text style={styles.subHeading}>Sign-in methods</Text>

              {/* Email & Password */}
              <View style={styles.methodCard}>
                <View style={styles.methodTop}>
                  <View style={styles.methodIconWrap}>
                    <KeyRound size={18} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.methodTitleRow}>
                      <Text style={styles.methodTitle}>Email & Password</Text>
                      {identitiesSummary.hasEmail ? (
                        <Badge tone="mint">Active</Badge>
                      ) : (
                        <Badge tone="outline">Not set</Badge>
                      )}
                    </View>
                    <Text style={styles.methodDesc}>
                      {identitiesSummary.hasEmail
                        ? "Sign in with your email and password."
                        : "Establish a password to allow password-based sign in."}
                    </Text>
                  </View>
                </View>

                <View style={styles.methodButtonsRow}>
                  {identitiesSummary.hasEmail ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => {
                          setIsSettingNewPassword(false);
                          setPasswordModalVisible(true);
                        }}
                      >
                        <Text style={styles.btnTextSecondary}>Change password</Text>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading}
                        onPress={handleSendResetEmail}
                      >
                        <Text style={styles.btnTextGhost}>Reset via email</Text>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        setIsSettingNewPassword(true);
                        setPasswordModalVisible(true);
                      }}
                    >
                      <Text style={styles.btnTextPrimary}>Set Password</Text>
                    </Button>
                  )}
                </View>
              </View>

              {/* Google Account */}
              <View style={styles.methodCard}>
                <View style={styles.methodTop}>
                  <View style={styles.methodIconWrap}>
                    <GoogleIcon size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.methodTitleRow}>
                      <Text style={styles.methodTitle}>Google Account</Text>
                      {identitiesSummary.hasGoogle ? (
                        <Badge tone="mint">Connected</Badge>
                      ) : (
                        <Badge tone="outline">Not linked</Badge>
                      )}
                    </View>
                    <Text style={styles.methodDesc}>
                      {identitiesSummary.hasGoogle
                        ? "Your Google identity is linked to this account."
                        : "Connect Google for seamless one-click sign in."}
                    </Text>
                  </View>
                </View>

                <View style={styles.methodButtonsRow}>
                  {identitiesSummary.hasGoogle ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading}
                      onPress={handleDisconnectGoogle}
                    >
                      <Text style={styles.btnTextSecondary}>Disconnect</Text>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading}
                      onPress={handleLinkGoogle}
                    >
                      <Text style={styles.btnTextSecondary}>Link Google Account</Text>
                    </Button>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.separator} />

            {/* Session Section */}
            <View style={styles.sessionGroup}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.subHeading}>Session</Text>
                <Text style={styles.fieldHint}>
                  Signed in on this device. Sign out affects only this app session.
                </Text>
              </View>

              <Button
                variant="secondary"
                size="sm"
                onPress={handleLocalSignOut}
                style={styles.signOutBtn}
              >
                <LogOut size={16} color={colors.foreground} />
                <Text style={styles.signOutBtnText}>Sign out</Text>
              </Button>
            </View>
          </Card>
        </View>
      )}

      {/* Reminder Time Picker Modal */}
      <RNModal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTimePickerVisible(false)}>
          <View style={styles.timePickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeaderTitle}>Select reminder time</Text>
            {REMINDER_TIMES.map((time) => {
              const isSelected = reminderTime === time.value;
              return (
                <Pressable
                  key={time.value}
                  style={[styles.timeOptionRow, isSelected && styles.timeOptionRowActive]}
                  onPress={() => {
                    setReminderTime(time.value);
                    setTimePickerVisible(false);
                  }}
                >
                  <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextActive]}>
                    {time.label}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </RNModal>

      {/* Change Password Modal */}
      <RNModal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPasswordModalVisible(false)}>
          <View style={styles.passwordModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                {isSettingNewPassword ? "Set a password" : "Change password"}
              </Text>
              <Pressable onPress={() => setPasswordModalVisible(false)} hitSlop={8}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={styles.modalHeaderDesc}>
              {isSettingNewPassword
                ? "Establish a secure password so you can sign in to MYC using your email and password on any device."
                : "Enter a new password for your MYC account."}
            </Text>

            {passwordError && (
              <View style={styles.modalAlert}>
                <Text style={styles.modalAlertText}>{passwordError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New password</Text>
              <Input
                secureTextEntry
                placeholder="At least 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm new password</Text>
              <Input
                secureTextEntry
                placeholder="Repeat new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <Button
                variant="outline"
                onPress={() => setPasswordModalVisible(false)}
                style={{ flex: 1 }}
              >
                <Text style={styles.btnTextSecondary}>Cancel</Text>
              </Button>
              <Button
                variant="primary"
                loading={actionLoading}
                onPress={handleChangePassword}
                style={{ flex: 1 }}
              >
                <Text style={styles.btnTextPrimary}>Save password</Text>
              </Button>
            </View>
          </View>
        </Pressable>
      </RNModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
  },
  cardsList: {
    gap: 16,
  },
  card: {
    padding: 18,
    gap: 16,
  },
  cardTitleBlock: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  switchHint: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  fieldLabelMuted: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadows.raised,
  },
  selectBoxPressed: {
    backgroundColor: colors.secondary,
  },
  selectValueText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  emailBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emailText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  methodCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    gap: 12,
    backgroundColor: colors.card,
  },
  methodTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  methodIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.raised,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  methodDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
    marginTop: 2,
  },
  methodButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 50,
  },
  btnTextSecondary: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
  },
  btnTextGhost: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  btnTextPrimary: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  sessionGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  timePickerCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 16,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  timeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  timeOptionRowActive: {
    backgroundColor: colors.secondary,
  },
  timeOptionText: {
    fontSize: 14,
    color: colors.foreground,
  },
  timeOptionTextActive: {
    fontWeight: "600",
    color: colors.primary,
  },
  passwordModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 20,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalHeaderDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  modalAlert: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: radii.md,
  },
  modalAlertText: {
    fontSize: 12,
    color: "#DC2626",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
});
