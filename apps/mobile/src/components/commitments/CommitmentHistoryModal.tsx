import { CheckCircle2, Clock, MessageSquare } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { Commitment, CompletionHistoryEntry } from "@myc/types";
import { formatCompletionTimestamp, formatDisplayDate, getCompletionHistory } from "@myc/utils";

import { Modal } from "@/components/ui/Modal";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

export interface CommitmentHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  timezone?: string;
}

export function CommitmentHistoryModal({
  visible,
  onClose,
  commitment,
  timezone = "UTC",
}: CommitmentHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<CompletionHistoryEntry[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!visible || !commitment) {
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      const supabase = getSupabase();
      const res = await getCompletionHistory(supabase, {
        commitmentId: commitment.id,
        limit: 50,
      });

      if (isMounted) {
        setEntries(res.entries);
        setLoading(false);
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [visible, commitment]);

  if (!commitment) return null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Completion History"
      description={`Permanent completion logs for "${commitment.title}"`}
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No completions yet</Text>
            <Text style={styles.emptyDescription}>
              When you complete this commitment on scheduled days, permanent completion records will
              appear here.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const formattedDate = formatDisplayDate(entry.date);
            const formattedTime = formatCompletionTimestamp(entry.completedAt, timezone);

            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.dateRow}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={styles.entryDate}>{formattedDate}</Text>
                  </View>

                  <View style={styles.timeRow}>
                    <Clock size={12} color={colors.mutedForeground} />
                    <Text style={styles.entryTime}>{formattedTime}</Text>
                  </View>
                </View>

                {entry.comment && (
                  <View style={styles.commentBox}>
                    <MessageSquare size={14} color={colors.primary} style={styles.commentIcon} />
                    <Text style={styles.commentText}>{entry.comment}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  centerContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    gap: 10,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  entryTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  commentBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.secondary,
    borderRadius: radii.sm,
    padding: 10,
    gap: 8,
  },
  commentIcon: {
    marginTop: 2,
  },
  commentText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
});
