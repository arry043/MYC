import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radii, shadows } from "@/lib/theme";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    ...shadows.raised,
  },
});
