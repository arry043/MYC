import { LogOut, Settings, UserRound } from "lucide-react-native";
import React, { useState } from "react";
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/shared/BrandMark";
import { colors, radii, shadows } from "@/lib/theme";

export interface AppHeaderProps {
  userEmail?: string | null;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
  activeScreenTitle?: string;
}

export function AppHeader({
  userEmail,
  onNavigateToProfile,
  onNavigateToSettings,
  onSignOut,
  activeScreenTitle,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          {/* Brand mark & title */}
          <View style={styles.leftGroup}>
            <BrandMark size={32} />
            <Text style={styles.brandTitle}>MYC</Text>
          </View>

          {/* User profile dropdown button */}
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarPressed]}
            accessibilityLabel="Account menu"
          >
            <UserRound size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* User menu modal */}
      <RNModal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[styles.menuPopover, { marginTop: insets.top + 50 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuUserEmail} numberOfLines={1}>
                {userEmail?.toUpperCase() || "ACCOUNT"}
              </Text>
            </View>

            {/* Profile option */}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                setMenuVisible(false);
                onNavigateToProfile();
              }}
            >
              <UserRound size={16} color={colors.foreground} />
              <Text style={styles.menuItemText}>Profile</Text>
            </Pressable>

            {/* Settings option */}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                setMenuVisible(false);
                onNavigateToSettings();
              }}
            >
              <Settings size={16} color={colors.foreground} />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Logout option */}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                setMenuVisible(false);
                onSignOut();
              }}
            >
              <LogOut size={16} color={colors.destructive} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </RNModal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: radii.curvedBar,
    borderBottomRightRadius: radii.curvedBar,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.cardBorder,
    paddingBottom: 14,
    paddingHorizontal: 20,
    ...shadows.raised,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  crumbGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slash: {
    color: colors.border,
    fontSize: 16,
    fontWeight: "400",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.raised,
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  menuPopover: {
    width: 220,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    ...shadows.floating,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  menuUserEmail: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 0.6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItemPressed: {
    backgroundColor: colors.secondary,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  logoutText: {
    color: colors.destructive,
  },
});
