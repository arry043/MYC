import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { motionEasings } from "@/lib/motion";
import { colors, radii } from "@/lib/theme";

export interface ColumnDataPoint {
  label: string;
  value: number; // 0 to 100
  date?: string;
  isToday?: boolean;
}

export interface ColumnChartProps {
  data: readonly ColumnDataPoint[];
  height?: number;
  highlightLast?: boolean;
}

export function ColumnChart({ data, height = 90, highlightLast = true }: ColumnChartProps) {
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      {/* Columns Row */}
      <View style={[styles.columnsRow, { height }]}>
        {data.map((item, index) => {
          const isHighlighted = highlightLast && index === data.length - 1;
          const isSelected = selectedCol === index;

          return (
            <AnimatedColumnBar
              key={item.date || item.label + index}
              item={item}
              index={index}
              maxHeight={height - 18}
              isHighlighted={isHighlighted}
              isSelected={isSelected}
              onPress={() => setSelectedCol(isSelected ? null : index)}
            />
          );
        })}
      </View>

      {/* Baseline */}
      <View style={styles.baseline} />

      {/* Labels Row */}
      <View style={styles.labelsRow}>
        {data.map((item, index) => {
          const isHighlighted = highlightLast && index === data.length - 1;
          return (
            <View key={item.date || item.label + index} style={styles.labelCol}>
              <Text
                style={[
                  styles.colLabel,
                  isHighlighted && styles.colLabelHighlighted,
                  item.isToday && styles.colLabelToday,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface AnimatedColumnBarProps {
  item: ColumnDataPoint;
  index: number;
  maxHeight: number;
  isHighlighted: boolean;
  isSelected: boolean;
  onPress: () => void;
}

function AnimatedColumnBar({
  item,
  index,
  maxHeight,
  isHighlighted,
  isSelected,
  onPress,
}: AnimatedColumnBarProps) {
  const clampedVal = Math.min(Math.max(item.value, 0), 100);
  const targetHeight = clampedVal > 0 ? Math.max(8, (clampedVal / 100) * maxHeight) : 6;

  const [barAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    barAnim.setValue(0);
    const delay = index * 45;

    const timer = setTimeout(() => {
      Animated.timing(barAnim, {
        toValue: targetHeight,
        duration: 550,
        easing: motionEasings.soft,
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [targetHeight, index, barAnim]);

  let barColor: string = colors.intensity.level0;
  if (clampedVal >= 100) barColor = colors.intensity.level4;
  else if (clampedVal >= 67) barColor = colors.intensity.level3;
  else if (clampedVal >= 33) barColor = colors.intensity.level2;
  else if (clampedVal > 0) barColor = colors.intensity.level1;

  if (isHighlighted && clampedVal > 0) {
    barColor = colors.primary;
  }

  return (
    <Pressable onPress={onPress} style={styles.colTouchArea}>
      {/* Floating tooltip on selection */}
      {isSelected && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{Math.round(clampedVal)}%</Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.bar,
          {
            height: barAnim,
            backgroundColor: barColor,
          },
          item.isToday && styles.todayBarOutline,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  columnsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  colTouchArea: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    top: -24,
    backgroundColor: colors.foreground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    zIndex: 10,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  bar: {
    width: 22,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 4,
  },
  todayBarOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  baseline: {
    height: 1,
    backgroundColor: colors.border,
    width: "100%",
    marginTop: 2,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  labelCol: {
    flex: 1,
    alignItems: "center",
  },
  colLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500",
  },
  colLabelHighlighted: {
    fontWeight: "700",
    color: colors.foreground,
  },
  colLabelToday: {
    color: colors.primary,
    fontWeight: "700",
  },
});
