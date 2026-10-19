import React, { useEffect, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AnalyticsChartPoint } from "@myc/types";

import { motionEasings } from "@/lib/motion";
import { colors } from "@/lib/theme";

export interface AnalyticsChartProps {
  points: readonly AnalyticsChartPoint[];
  isMonthly?: boolean;
}

function AnimatedBar({
  point,
  index,
  maxBarWidth = 18,
}: {
  point: AnalyticsChartPoint;
  index: number;
  maxBarWidth?: number;
}) {
  const isUnscheduled = point.percentage === null;
  const val = isUnscheduled ? 0 : Math.min(100, Math.max(0, point.percentage!));
  const isFull = point.isConsistent === true;

  const [scaleY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    scaleY.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(scaleY, {
        toValue: 1,
        duration: 350,
        easing: motionEasings.outCubic,
        useNativeDriver: true,
      }).start();
    }, index * 15);

    return () => clearTimeout(timer);
  }, [point.percentage, index, scaleY]);

  const barColor = isFull ? colors.primary : val > 0 ? "#7DD3FC" : colors.muted;

  const heightPercent = Math.max(val, 4);

  return (
    <View style={styles.colContainer}>
      <View style={styles.barSlot}>
        {isUnscheduled ? (
          <View style={[styles.unscheduledMark, { maxWidth: maxBarWidth }]} />
        ) : (
          <Animated.View
            style={[
              styles.barFill,
              {
                height: `${heightPercent}%`,
                backgroundColor: barColor,
                maxWidth: maxBarWidth,
                transform: [{ scaleY }],
              },
            ]}
          />
        )}
      </View>
      <Text style={styles.barLabel} numberOfLines={1}>
        {point.label}
      </Text>
    </View>
  );
}

export function AnalyticsChart({ points, isMonthly = false }: AnalyticsChartProps) {
  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available for this period.</Text>
      </View>
    );
  }

  if (isMonthly) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthlyScrollContent}
      >
        <View style={styles.monthlyRow}>
          {points.map((pt, idx) => (
            <AnimatedBar key={pt.date} point={pt} index={idx} maxBarWidth={10} />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.weeklyRow}>
      {points.map((pt, idx) => (
        <AnimatedBar key={pt.date} point={pt} index={idx} maxBarWidth={20} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  weeklyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  monthlyScrollContent: {
    paddingRight: 10,
  },
  monthlyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    minWidth: 400,
  },
  colContainer: {
    flex: 1,
    minWidth: 14,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barSlot: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  unscheduledMark: {
    width: "100%",
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  barLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 6,
    textAlign: "center",
  },
});
