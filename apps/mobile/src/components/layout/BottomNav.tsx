import { CalendarDays, ChartColumn, LayoutGrid, ListChecks } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { motionSprings } from "@/lib/motion";
import { colors, radii, shadows } from "@/lib/theme";

export type TabKey = "dashboard" | "calendar" | "commitments" | "analytics";

export interface BottomNavProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "dashboard", label: "Home", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "commitments", label: "Commitments", icon: ListChecks },
  { key: "analytics", label: "Analytics", icon: ChartColumn },
];

const PILL_WIDTH = 56;
const PILL_HEIGHT = 32;

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.key === currentTab),
  );

  // Animated horizontal translation for sliding active pill (using useState for stable React 19 ref)
  const [pillTranslateX] = useState(() => new Animated.Value(0));
  const isInitialized = useRef(false);

  const handleRowLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== rowWidth) {
      setRowWidth(width);
      const tabWidth = width / TABS.length;
      const targetX = activeIndex * tabWidth + (tabWidth - PILL_WIDTH) / 2;
      if (!isInitialized.current) {
        pillTranslateX.setValue(targetX);
        isInitialized.current = true;
      }
    }
  };

  useEffect(() => {
    if (rowWidth > 0) {
      const tabWidth = rowWidth / TABS.length;
      const targetX = activeIndex * tabWidth + (tabWidth - PILL_WIDTH) / 2;

      Animated.spring(pillTranslateX, {
        toValue: targetX,
        tension: motionSprings.nativeLayout.tension,
        friction: motionSprings.nativeLayout.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, rowWidth, pillTranslateX]);

  return (
    <View style={[styles.navContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabRow} onLayout={handleRowLayout}>
        {/* Animated Sliding Pill Indicator */}
        {rowWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          />
        )}

        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconContainer}>
                <Icon
                  size={20}
                  color={isActive ? colors.primarySoftForeground : colors.mutedForeground}
                  strokeWidth={isActive ? 2.3 : 1.9}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.curvedBar,
    borderTopRightRadius: radii.curvedBar,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: 8,
    paddingHorizontal: 8,
    ...shadows.floating,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  slidingPill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  tabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  iconContainer: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.primarySoftForeground,
    fontWeight: "600",
  },
  tabLabelInactive: {
    color: colors.mutedForeground,
  },
});
