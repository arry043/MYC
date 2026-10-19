import { LucideIcon } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { colors } from "@/lib/theme";

export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  tone?: "sky" | "lavender" | "peach" | "mint" | "sun";
  icon?: LucideIcon;
  sublabel?: string;
}

export function StatCard({
  label,
  value,
  unit,
  tone = "sky",
  icon: Icon,
  sublabel,
}: StatCardProps) {
  const toneStyle = colors.tones[tone] || colors.tones.sky;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {Icon && (
          <View style={[styles.iconWrapper, { backgroundColor: toneStyle.bg }]}>
            <Icon size={18} color={toneStyle.text} strokeWidth={2} />
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.6,
  },
  unit: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  sublabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
