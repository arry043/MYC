import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { motionEasings } from "@/lib/motion";
import { colors, radii } from "@/lib/theme";

export interface ProgressBarProps {
  value?: number; // 0 to 100
  progress?: number; // 0 to 100
  height?: number;
  color?: string;
  tone?: "mint" | "sky" | "peach" | "lavender" | "sun";
  backgroundColor?: string;
}

export function ProgressBar({
  value,
  progress,
  height = 8,
  color,
  tone,
  backgroundColor = colors.muted,
}: ProgressBarProps) {
  const actualValue = value ?? progress ?? 0;
  const clampedValue = Math.min(Math.max(actualValue, 0), 100);

  const [animatedWidth] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedValue,
      duration: 700,
      easing: motionEasings.outCubic,
      useNativeDriver: false,
    }).start();
  }, [clampedValue, animatedWidth]);

  const getBarColor = (): string => {
    if (color) return color;
    if (tone) {
      switch (tone) {
        case "mint":
          return colors.success;
        case "sky":
          return colors.primary;
        case "peach":
          return colors.tones.peach.text;
        case "lavender":
          return colors.tones.lavender.text;
        case "sun":
          return colors.tones.sun.text;
      }
    }
    return colors.primary;
  };

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height, backgroundColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            backgroundColor: getBarColor(),
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: radii.full,
  },
});
