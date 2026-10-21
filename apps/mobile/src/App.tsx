import type { User } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav, type TabKey } from "@/components/layout/BottomNav";
import { ScreenTransition } from "@/components/shared/Motion";
import { setupMobileAuth, signOutMobile } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { clearWidgets } from "@/lib/widgets";
import { AnalyticsScreen } from "@/screens/analytics/AnalyticsScreen";
import { AuthScreen } from "@/screens/auth/AuthScreen";
import { CalendarScreen } from "@/screens/calendar/CalendarScreen";
import { CommitmentsScreen } from "@/screens/commitments/CommitmentsScreen";
import { DashboardScreen } from "@/screens/dashboard/DashboardScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";

export type ScreenState = TabKey | "profile" | "settings";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenState>("dashboard");
  const [deepLinkTarget, setDeepLinkTarget] = useState<{
    commitmentId: string;
    action: "complete" | "detail";
  } | null>(null);

  useEffect(() => {
    const cleanup = setupMobileAuth((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url || !url.startsWith("myc://")) return;
      if (url.includes("code=") || url.includes("access_token=") || url.includes("error=")) {
        return;
      }

      try {
        const pathWithoutScheme = url.replace(/^myc:\/\//, "");
        const [pathPart, queryPart] = pathWithoutScheme.split("?");
        if (!pathPart) return;

        if (pathPart === "dashboard") {
          setActiveScreen("dashboard");
        } else if (pathPart.startsWith("commitment/")) {
          const commitmentId = pathPart.replace("commitment/", "");
          const params = new URLSearchParams(queryPart || "");
          const action = params.get("action") === "detail" ? "detail" : "complete";

          setActiveScreen("dashboard");
          setDeepLinkTarget({ commitmentId, action });
        } else if (pathPart === "auth") {
          setActiveScreen("dashboard");
        }
      } catch (err) {
        console.warn("Failed to handle deep link:", err);
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    void Linking.getInitialURL().then((initialUrl) => {
      handleUrl(initialUrl);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const handleSignOut = async () => {
    await clearWidgets();
    await signOutMobile();
    setCurrentUser(null);
    setActiveScreen("dashboard");
  };

  const getScreenTitle = (screen: ScreenState): string => {
    switch (screen) {
      case "dashboard":
        return "Dashboard";
      case "calendar":
        return "Calendar";
      case "commitments":
        return "Commitments";
      case "analytics":
        return "Analytics";
      case "profile":
        return "Profile";
      case "settings":
        return "Settings";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Active tab key for BottomNav indicator (if on subscreen, defaults to dashboard)
  const currentTab: TabKey =
    activeScreen === "calendar" || activeScreen === "commitments" || activeScreen === "analytics"
      ? activeScreen
      : "dashboard";

  return (
    <SafeAreaProvider>
      <View style={styles.appShell}>
        {/* Curved Top Navbar with Avatar / Dropdown */}
        <AppHeader
          userEmail={currentUser.email}
          activeScreenTitle={getScreenTitle(activeScreen)}
          onNavigateToProfile={() => setActiveScreen("profile")}
          onNavigateToSettings={() => setActiveScreen("settings")}
          onSignOut={handleSignOut}
        />

        {/* Screen Content Body with Animated Transitions */}
        <View style={styles.contentBody}>
          <ScreenTransition screenKey={activeScreen}>
            {activeScreen === "dashboard" && (
              <DashboardScreen
                onNavigateToCalendar={() => setActiveScreen("calendar")}
                onNavigateToCommitments={() => setActiveScreen("commitments")}
                deepLinkTarget={deepLinkTarget}
                onClearDeepLinkTarget={() => setDeepLinkTarget(null)}
              />
            )}

            {activeScreen === "calendar" && (
              <CalendarScreen onNavigateToCommitments={() => setActiveScreen("commitments")} />
            )}

            {activeScreen === "commitments" && <CommitmentsScreen />}

            {activeScreen === "analytics" && (
              <AnalyticsScreen onNavigateToCommitments={() => setActiveScreen("commitments")} />
            )}

            {activeScreen === "profile" && (
              <ProfileScreen onBack={() => setActiveScreen("dashboard")} />
            )}

            {activeScreen === "settings" && (
              <SettingsScreen
                onBack={() => setActiveScreen("dashboard")}
                onSignOut={handleSignOut}
              />
            )}
          </ScreenTransition>
        </View>

        {/* Curved Bottom Navigation Pill */}
        <BottomNav currentTab={currentTab} onTabChange={(tab) => setActiveScreen(tab)} />

        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentBody: {
    flex: 1,
  },
});
