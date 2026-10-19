import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { colors, radii } from "@/lib/theme";

export interface BadgeProps {
  children: React.ReactNode;
  tone?:
    | "sky"
    | "lavender"
    | "peach"
    | "mint"
    | "sun"
    | "default"
    | "success"
    | "destructive"
    | "outline";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({ children, tone = "default", style, textStyle }: BadgeProps) {
  const getContainerStyle = (): ViewStyle => {
    switch (tone) {
      case "sky":
        return {
          backgroundColor: colors.tones.sky.bg,
          borderColor: colors.tones.sky.border,
        };
      case "lavender":
        return {
          backgroundColor: colors.tones.lavender.bg,
          borderColor: colors.tones.lavender.border,
        };
      case "peach":
        return {
          backgroundColor: colors.tones.peach.bg,
          borderColor: colors.tones.peach.border,
        };
      case "mint":
        return {
          backgroundColor: colors.tones.mint.bg,
          borderColor: colors.tones.mint.border,
        };
      case "sun":
        return {
          backgroundColor: colors.tones.sun.bg,
          borderColor: colors.tones.sun.border,
        };
      case "success":
        return {
          backgroundColor: colors.successSoft,
          borderColor: "#BBF7D0",
        };
      case "destructive":
        return {
          backgroundColor: colors.destructiveSoft,
          borderColor: "#FECACA",
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: colors.border,
        };
      default:
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        };
    }
  };

  const getTextColor = (): string => {
    switch (tone) {
      case "sky":
        return colors.tones.sky.text;
      case "lavender":
        return colors.tones.lavender.text;
      case "peach":
        return colors.tones.peach.text;
      case "mint":
        return colors.tones.mint.text;
      case "sun":
        return colors.tones.sun.text;
      case "success":
        return colors.successForeground;
      case "destructive":
        return colors.destructive;
      case "outline":
        return colors.mutedForeground;
      default:
        return colors.foreground;
    }
  };

  const hasReactElement = React.Children.toArray(children).some((c) => React.isValidElement(c));

  const renderContent = () => {
    if (!hasReactElement) {
      return <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{children}</Text>;
    }

    return React.Children.map(children, (child) => {
      if (child === null || child === undefined || typeof child === "boolean") {
        return null;
      }
      if (typeof child === "string") {
        if (!child.trim()) {
          return null;
        }
        return <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{child}</Text>;
      }
      if (typeof child === "number") {
        return <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{child}</Text>;
      }
      return child;
    });
  };

  return <View style={[styles.badge, getContainerStyle(), style]}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
