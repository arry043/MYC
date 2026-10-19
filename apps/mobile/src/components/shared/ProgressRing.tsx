import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { motionEasings } from "@/lib/motion";
import { colors } from "@/lib/theme";

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  color?: string;
  trackColor?: string;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  children,
  color = colors.primary,
  trackColor = colors.muted,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const [anim] = useState(() => new Animated.Value(0));
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clampedValue,
      duration: 850,
      easing: motionEasings.outCubic,
      useNativeDriver: false,
    }).start();

    const listenerId = anim.addListener(({ value: v }) => {
      setAnimatedPct(v);
    });

    return () => {
      anim.removeListener(listenerId);
    };
  }, [clampedValue, anim]);

  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Active Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children && <View style={styles.centerContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});
