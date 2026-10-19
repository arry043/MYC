import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { motionSprings } from "@/lib/motion";
import { colors, radii, shadows } from "@/lib/theme";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  onValueChange?: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md";
}

const CONTAINER_PADDING = 3;

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  onValueChange,
  style,
  size = "md",
}: SegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  // Using useState to ensure stable Animated.Value without accessing ref during render
  const [thumbTranslateX] = useState(() => new Animated.Value(0));
  const isInitialized = useRef(false);

  const handleChange = (v: T) => {
    onChange?.(v);
    onValueChange?.(v);
  };

  const itemWidth =
    containerWidth > 0 ? (containerWidth - CONTAINER_PADDING * 2) / options.length : 0;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      const computedItemWidth = (width - CONTAINER_PADDING * 2) / options.length;
      const targetX = activeIndex * computedItemWidth;
      if (!isInitialized.current) {
        thumbTranslateX.setValue(targetX);
        isInitialized.current = true;
      }
    }
  };

  useEffect(() => {
    if (containerWidth > 0 && itemWidth > 0) {
      const targetX = activeIndex * itemWidth;
      Animated.spring(thumbTranslateX, {
        toValue: targetX,
        tension: motionSprings.nativeLayout.tension,
        friction: motionSprings.nativeLayout.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, containerWidth, itemWidth, thumbTranslateX]);

  const containerHeight = size === "sm" ? 36 : 42;
  const thumbHeight = containerHeight - CONTAINER_PADDING * 2;

  return (
    <View
      onLayout={handleLayout}
      style={[styles.container, size === "sm" ? styles.containerSm : styles.containerMd, style]}
    >
      {/* Animated Sliding Thumb */}
      {itemWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingThumb,
            {
              width: itemWidth,
              height: thumbHeight,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      )}

      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => handleChange(opt.value)}
            style={({ pressed }) => [
              styles.item,
              size === "sm" ? styles.itemSm : styles.itemMd,
              pressed && styles.itemPressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                size === "sm" ? styles.labelSm : styles.labelMd,
                isActive ? styles.activeLabel : styles.inactiveLabel,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.secondary,
    borderRadius: radii.full,
    padding: CONTAINER_PADDING,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  containerSm: {
    height: 36,
  },
  containerMd: {
    height: 42,
  },
  slidingThumb: {
    position: "absolute",
    top: CONTAINER_PADDING,
    left: CONTAINER_PADDING,
    backgroundColor: colors.card,
    borderRadius: radii.full,
    ...shadows.raised,
    zIndex: 0,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    zIndex: 1,
  },
  itemPressed: {
    opacity: 0.85,
  },
  itemSm: {
    paddingHorizontal: 8,
  },
  itemMd: {
    paddingHorizontal: 12,
  },
  label: {
    fontWeight: "500",
  },
  labelSm: {
    fontSize: 12,
  },
  labelMd: {
    fontSize: 13,
  },
  activeLabel: {
    color: colors.foreground,
    fontWeight: "600",
  },
  inactiveLabel: {
    color: colors.mutedForeground,
  },
});
