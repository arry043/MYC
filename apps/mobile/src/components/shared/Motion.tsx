import React, { useEffect, useState } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { motionDurations, motionEasings } from "@/lib/motion";
import { colors, radii } from "@/lib/theme";

export interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fades and gently lifts its content into place on mount.
 * Mirrors `FadeIn` / `riseIn` from web.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = motionDurations.base,
  distance = 10,
  style,
}: FadeInProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(distance));

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: motionEasings.soft,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: motionEasings.soft,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, distance, duration, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export interface ScreenTransitionProps {
  screenKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen transition container.
 * Plays a soft fade & rise transition whenever `screenKey` changes.
 */
export function ScreenTransition({ screenKey, children, style }: ScreenTransitionProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(8));

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: motionEasings.outCubic,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: motionEasings.outCubic,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenKey, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.screenFill,
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated pulsing skeleton loader for smooth data fetching UX.
 */
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = radii.md,
  style,
}: SkeletonProps) {
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 750,
          easing: motionEasings.soft,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          easing: motionEasings.soft,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.muted,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "#FFFFFF",
            opacity: pulse,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flex: 1,
  },
});
