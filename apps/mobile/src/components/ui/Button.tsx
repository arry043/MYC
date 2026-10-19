import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { colors, radii } from "@/lib/theme";

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isInteractive = !disabled && !loading;

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    // Sizes
    if (size === "sm") list.push(styles.sizeSm);
    else if (size === "lg") list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    // Variants
    if (variant === "primary") list.push(styles.variantPrimary);
    else if (variant === "secondary") list.push(styles.variantSecondary);
    else if (variant === "outline") list.push(styles.variantOutline);
    else if (variant === "destructive") list.push(styles.variantDestructive);
    else if (variant === "ghost") list.push(styles.variantGhost);

    if (disabled) list.push(styles.disabled);
    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText];

    if (size === "sm") list.push(styles.textSm);
    else if (size === "lg") list.push(styles.textLg);
    else list.push(styles.textMd);

    if (variant === "primary") list.push(styles.textPrimary);
    else if (variant === "secondary") list.push(styles.textSecondary);
    else if (variant === "outline") list.push(styles.textOutline);
    else if (variant === "destructive") list.push(styles.textDestructive);
    else if (variant === "ghost") list.push(styles.textGhost);

    if (disabled) list.push(styles.textDisabled);
    return list;
  };

  const spinnerColor = variant === "primary" ? colors.primaryForeground : colors.foreground;

  const hasReactElement = React.Children.toArray(children).some((c) => React.isValidElement(c));

  const renderContent = () => {
    if (!hasReactElement) {
      return <Text style={[getTextStyle(), textStyle]}>{children}</Text>;
    }

    return React.Children.map(children, (child) => {
      if (child === null || child === undefined || typeof child === "boolean") {
        return null;
      }
      if (typeof child === "string") {
        if (!child.trim()) {
          return null;
        }
        return <Text style={[getTextStyle(), textStyle]}>{child}</Text>;
      }
      if (typeof child === "number") {
        return <Text style={[getTextStyle(), textStyle]}>{child}</Text>;
      }
      return child;
    });
  };

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [
        getContainerStyle(),
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {renderContent()}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  sizeSm: {
    height: 36,
    paddingHorizontal: 12,
  },
  sizeMd: {
    height: 44,
    paddingHorizontal: 16,
  },
  sizeLg: {
    height: 50,
    paddingHorizontal: 20,
  },
  variantPrimary: {
    backgroundColor: colors.primary,
  },
  variantSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantDestructive: {
    backgroundColor: colors.destructiveSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  variantGhost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  baseText: {
    fontWeight: "600",
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 15,
  },
  textPrimary: {
    color: colors.primaryForeground,
  },
  textSecondary: {
    color: colors.foreground,
  },
  textOutline: {
    color: colors.foreground,
  },
  textDestructive: {
    color: colors.destructive,
  },
  textGhost: {
    color: colors.mutedForeground,
  },
  textDisabled: {
    color: colors.mutedForeground,
  },
});
