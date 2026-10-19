import { Check, ChevronsUpDown, Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Profile } from "@myc/types";
import { isValidTimezone } from "@myc/utils";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSupabase } from "@/lib/supabase";
import { colors, radii, shadows } from "@/lib/theme";

const COMMON_TIMEZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (Asia/Kolkata, GMT+5:30)" },
  { value: "America/New_York", label: "Eastern Time (America/New_York, GMT-4/5)" },
  { value: "America/Chicago", label: "Central Time (America/Chicago, GMT-5/6)" },
  { value: "America/Denver", label: "Mountain Time (America/Denver, GMT-6/7)" },
  { value: "America/Los_Angeles", label: "Pacific Time (America/Los_Angeles, GMT-7/8)" },
  { value: "Europe/London", label: "Greenwich / BST (Europe/London, GMT+0/1)" },
  { value: "Europe/Paris", label: "Central European (Europe/Paris, GMT+1/2)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Asia/Dubai, GMT+4)" },
  { value: "Asia/Singapore", label: "Singapore / HK (Asia/Singapore, GMT+8)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Asia/Tokyo, GMT+9)" },
  { value: "Australia/Sydney", label: "Australian Eastern (Australia/Sydney, GMT+10/11)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

export interface ProfileScreenProps {
  onBack?: () => void;
  onNavigateToSettings?: () => void;
}

export function ProfileScreen({ onNavigateToSettings }: ProfileScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingTz, setSavingTz] = useState(false);

  // Timezone selection
  const [timezone, setTimezone] = useState<string>("UTC");
  const [initialTimezone, setInitialTimezone] = useState<string>("UTC");
  const [tzModalVisible, setTzModalVisible] = useState(false);
  const [tzSearchQuery, setTzSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserEmail(user.email ?? "");

        let detectedTz = "UTC";
        try {
          const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (browserTz && isValidTimezone(browserTz)) {
            detectedTz = browserTz;
          }
        } catch {
          // fallback
        }

        const { data: profileData } = await supabase.rpc("ensure_profile", {
          detected_timezone: detectedTz,
        });

        if (profileData) {
          const p = profileData as Profile;
          setProfile(p);
          const tz = p.timezone || detectedTz;
          setTimezone(tz);
          setInitialTimezone(tz);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveTimezone = async () => {
    if (!profile) return;
    if (!isValidTimezone(timezone)) {
      Alert.alert("Invalid timezone", "Please select a valid timezone.");
      return;
    }

    setSavingTz(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ timezone, updated_at: new Date().toISOString() })
        .eq("user_id", profile.user_id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setInitialTimezone(timezone);
      setProfile((prev) => (prev ? { ...prev, timezone } : null));
      Alert.alert("Timezone updated", `Your MYC day boundary is now set to ${timezone}.`);
    } catch {
      Alert.alert("Error", "Could not update timezone.");
    } finally {
      setSavingTz(false);
    }
  };

  const handleCancelTimezone = () => {
    setTimezone(initialTimezone);
  };

  const isTzDirty = timezone !== initialTimezone;

  const timezoneOptions = COMMON_TIMEZONES.some((tz) => tz.value === timezone)
    ? COMMON_TIMEZONES
    : [{ value: timezone, label: `${timezone} (Active)` }, ...COMMON_TIMEZONES];

  const currentTzLabel = timezoneOptions.find((tz) => tz.value === timezone)?.label || timezone;

  const filteredTimezones = timezoneOptions.filter(
    (tz) =>
      tz.label.toLowerCase().includes(tzSearchQuery.toLowerCase()) ||
      tz.value.toLowerCase().includes(tzSearchQuery.toLowerCase()),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROFILE</Text>
        <Text style={styles.title}>Your profile & journey</Text>
        <Text style={styles.description}>
          Your identity, timezone, and consistency journey start date.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.cardsList}>
          {/* 1. Profile Details Card */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Profile Details</Text>
            <Text style={styles.cardSub}>
              Your account identity and the day boundary MYC uses for daily consistency.
            </Text>

            {/* Email Address Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {userEmail || "Signed in"}
                </Text>
              </View>
              <Text style={styles.fieldHint}>
                Need to change your password or providers? Visit{" "}
                <Text style={styles.linkText} onPress={() => onNavigateToSettings?.()}>
                  Settings
                </Text>
                .
              </Text>
            </View>

            {/* MYC Journey Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>MYC Journey</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {profile?.myc_started_at
                    ? `Started on ${profile.myc_started_at}`
                    : "Not started yet"}
                </Text>
              </View>
              <Text style={styles.fieldHint}>
                {profile?.myc_started_at
                  ? "Your consistency journey is active."
                  : 'Starts officially upon confirming "I COMMIT".'}
              </Text>
            </View>

            {/* Timezone Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Timezone</Text>
              <Pressable
                onPress={() => {
                  setTzSearchQuery("");
                  setTzModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.selectButton,
                  pressed && styles.selectButtonPressed,
                ]}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {currentTzLabel}
                </Text>
                <ChevronsUpDown size={16} color={colors.mutedForeground} />
              </Pressable>
              <Text style={styles.fieldHint}>
                Your day starts and ends at midnight in this timezone. Used for all daily completion
                and streak calculations.
              </Text>
            </View>

            {/* Action buttons if timezone changed */}
            {isTzDirty && (
              <View style={styles.dirtyActionsRow}>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleCancelTimezone}
                  disabled={savingTz}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onPress={handleSaveTimezone} loading={savingTz}>
                  Save timezone
                </Button>
              </View>
            )}
          </Card>

          {/* 2. Account Security & Preferences Card */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Account Security & Preferences</Text>
            <Text style={styles.cardSub}>
              Manage your password, connected Google sign-in, reminders, and app installation.
            </Text>

            <Button
              variant="secondary"
              size="md"
              onPress={() => onNavigateToSettings?.()}
              style={styles.openSettingsButton}
            >
              Open Settings
            </Button>
          </Card>
        </View>
      )}

      {/* Timezone Picker Modal */}
      <RNModal
        visible={tzModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTzModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <Pressable
                onPress={() => setTzModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search timezone..."
                placeholderTextColor={colors.mutedForeground}
                value={tzSearchQuery}
                onChangeText={setTzSearchQuery}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredTimezones}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === timezone;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.tzItem,
                      isSelected && styles.tzItemSelected,
                      pressed && styles.tzItemPressed,
                    ]}
                    onPress={() => {
                      setTimezone(item.value);
                      setTzModalVisible(false);
                    }}
                  >
                    <Text
                      style={[styles.tzItemLabel, isSelected && styles.tzItemLabelSelected]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
              style={styles.tzList}
            />
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.88,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginTop: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  cardsList: {
    gap: 16,
  },
  card: {
    padding: 18,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  cardSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 6,
  },
  readOnlyInput: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
    marginTop: 6,
  },
  linkText: {
    fontWeight: "600",
    color: colors.foreground,
    textDecorationLine: "underline",
  },
  selectButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectButtonPressed: {
    backgroundColor: colors.secondary,
  },
  selectText: {
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  dirtyActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  openSettingsButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 20,
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    paddingVertical: 0,
  },
  tzList: {
    maxHeight: 320,
  },
  tzItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
  tzItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  tzItemPressed: {
    backgroundColor: colors.secondary,
  },
  tzItemLabel: {
    fontSize: 13,
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  tzItemLabelSelected: {
    fontWeight: "600",
    color: colors.primarySoftForeground,
  },
});
