import {
  Calendar,
  Check,
  Circle,
  History,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal as RNModal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Commitment, CommitmentStatus, DailyCompletion, Profile } from "@myc/types";
import { formatFrequency, getUserLocalDateString, isCommitmentExpectedOnDate } from "@myc/utils";

import { CommitmentFormModal } from "@/components/commitments/CommitmentFormModal";
import { CommitmentHistoryModal } from "@/components/commitments/CommitmentHistoryModal";
import { CompleteCommitmentModal } from "@/components/commitments/CompleteCommitmentModal";
import { Skeleton } from "@/components/shared/Motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSupabase } from "@/lib/supabase";
import { colors, radii, shadows } from "@/lib/theme";

const TILE_TONE: Record<string, { bg: string; text: string }> = {
  sky: { bg: "#E0F2FE", text: "#0369A1" },
  lavender: { bg: "#F0EBF8", text: "#6D28D9" },
  peach: { bg: "#FCEFEA", text: "#C2410C" },
  mint: { bg: "#EAF6F0", text: "#047857" },
  sun: { bg: "#FDF5E6", text: "#B45309" },
};

export function CommitmentsScreen() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayCompletions, setTodayCompletions] = useState<DailyCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"active" | "paused" | "archived">("active");

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [completingCommitment, setCompletingCommitment] = useState<Commitment | null>(null);
  const [historyCommitment, setHistoryCommitment] = useState<Commitment | null>(null);

  // Options Action Sheet state
  const [actionCommitment, setActionCommitment] = useState<Commitment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [profileRes, commitmentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("commitments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }

      if (commitmentsRes.data) {
        setCommitments(commitmentsRes.data as Commitment[]);
      }

      const today = getUserLocalDateString(profileRes.data?.timezone);
      const { data: completionsData } = await supabase
        .from("daily_completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (completionsData) {
        setTodayCompletions(completionsData as DailyCompletion[]);
      }
    } catch (err) {
      console.error("Failed to load commitments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCommitments = async () => {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const [profileRes, commitmentsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase
            .from("commitments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
        ]);

        if (isMounted) {
          if (profileRes.data) {
            setProfile(profileRes.data as Profile);
          }
          if (commitmentsRes.data) {
            setCommitments(commitmentsRes.data as Commitment[]);
          }
        }

        const today = getUserLocalDateString(profileRes.data?.timezone);
        const { data: completionsData } = await supabase
          .from("daily_completions")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today);

        if (isMounted) {
          if (completionsData) {
            setTodayCompletions(completionsData as DailyCompletion[]);
          }
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err) {
        console.error("Failed to load commitments:", err);
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchCommitments();

    return () => {
      isMounted = false;
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("mobile:commitments_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "commitments" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_completions" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const todayDate = getUserLocalDateString(profile?.timezone);
  const hasStartedMyc = Boolean(profile?.myc_started_at);

  const filteredCommitments = commitments.filter((c) => c.status === filter);
  const activeCount = commitments.filter((c) => c.status === "active").length;
  const pausedCount = commitments.filter((c) => c.status === "paused").length;
  const archivedCount = commitments.filter((c) => c.status === "archived").length;

  const handleUpdateStatus = async (commitment: Commitment, nextStatus: CommitmentStatus) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("commitments")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", commitment.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setCommitments((prev) =>
        prev.map((c) => (c.id === commitment.id ? { ...c, status: nextStatus } : c)),
      );
    } catch {
      Alert.alert("Error", "Could not update commitment status.");
    }
  };

  const handleDeleteCommitment = (commitment: Commitment) => {
    Alert.alert(
      "Delete commitment?",
      `Are you sure you want to permanently delete "${commitment.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const supabase = getSupabase();
            const { error } = await supabase.from("commitments").delete().eq("id", commitment.id);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            setCommitments((prev) => prev.filter((c) => c.id !== commitment.id));
            setTodayCompletions((prev) => prev.filter((c) => c.commitment_id !== commitment.id));
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMMITMENTS</Text>
        <Text style={styles.title}>What you&apos;ve committed to</Text>
        <Text style={styles.description}>
          Keep the list short and honest. A few commitments kept beat many abandoned.
        </Text>
      </View>

      {/* Full-width + New commitment Button */}
      <Button
        variant="primary"
        size="md"
        onPress={() => setCreateModalVisible(true)}
        style={styles.newButtonFull}
      >
        <Plus size={16} color={colors.primaryForeground} />
        New commitment
      </Button>

      {/* Filter Tabs */}
      <SegmentedControl
        options={[
          { value: "active", label: `Active (${activeCount})` },
          { value: "paused", label: `Paused (${pausedCount})` },
          { value: "archived", label: `Archived (${archivedCount})` },
        ]}
        value={filter}
        onValueChange={(val) => setFilter(val as typeof filter)}
      />

      <Text style={styles.totalCountText}>
        {commitments.length} total commitment{commitments.length === 1 ? "" : "s"}
      </Text>

      {loading && !refreshing && (
        <View style={{ gap: 14 }}>
          <Skeleton height={140} borderRadius={radii.xl} />
          <Skeleton height={140} borderRadius={radii.xl} />
        </View>
      )}

      {/* Commitments List */}
      {!loading && (
        <View style={{ gap: 14 }}>
          {filteredCommitments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Calendar size={28} color={colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>No {filter} commitments</Text>
              <Text style={styles.emptySubtitle}>
                {filter === "active"
                  ? "You don't have any active commitments yet. Start with 1 to 3 meaningful daily habits."
                  : `You don't have any ${filter} commitments.`}
              </Text>
              {filter === "active" && (
                <Button
                  variant="primary"
                  onPress={() => setCreateModalVisible(true)}
                  style={{ marginTop: 8 }}
                >
                  <Sparkles size={16} color={colors.primaryForeground} />
                  Create first commitment
                </Button>
              )}
            </Card>
          ) : (
            filteredCommitments.map((commitment) => {
              const tone = TILE_TONE[commitment.tone || "sky"] ?? {
                bg: colors.primarySoft,
                text: colors.primary,
              };
              const isDoneToday = todayCompletions.some((c) => c.commitment_id === commitment.id);
              const isScheduledToday = isCommitmentExpectedOnDate(commitment, todayDate);
              const isPaused = commitment.status === "paused";
              const isArchived = commitment.status === "archived";

              const initialChar = commitment.title[0]?.toUpperCase() || "C";

              return (
                <Card key={commitment.id} style={styles.commitmentCard}>
                  {/* Top Row: Tile + Status Badge + Options */}
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.tileBox, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.tileChar, { color: tone.text }]}>{initialChar}</Text>
                    </View>

                    <View style={styles.topRightActions}>
                      {isPaused ? (
                        <Badge tone="outline">
                          <View
                            style={[styles.statusDot, { backgroundColor: colors.mutedForeground }]}
                          />
                          Paused
                        </Badge>
                      ) : isArchived ? (
                        <Badge tone="outline">Archived</Badge>
                      ) : (
                        <Badge tone="success">
                          <View style={styles.statusDot} />
                          Active
                        </Badge>
                      )}

                      <Pressable
                        onPress={() => setActionCommitment(commitment)}
                        style={styles.moreButton}
                        hitSlop={8}
                        accessibilityLabel={`Options for ${commitment.title}`}
                      >
                        <MoreVertical size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Title & Frequency */}
                  <View style={styles.cardBody}>
                    <Text style={styles.commitmentTitle}>{commitment.title}</Text>
                    <Text style={styles.commitmentFreq}>
                      {formatFrequency(
                        commitment.frequency,
                        commitment.schedule_days,
                        commitment.scheduled_date,
                      )}
                    </Text>
                    {commitment.description ? (
                      <Text style={styles.commitmentDesc} numberOfLines={2}>
                        {commitment.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Bottom Row: Started Date + Today Action */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.startedGroup}>
                      <Calendar size={13} color={colors.mutedForeground} />
                      <Text style={styles.startedText}>
                        {commitment.frequency === "single_day"
                          ? `Scheduled ${commitment.scheduled_date || commitment.start_date}`
                          : `Started ${commitment.start_date || "2026-10-16"}`}
                      </Text>
                    </View>

                    <View style={styles.footerRightGroup}>
                      {commitment.status === "active" ? (
                        isDoneToday ? (
                          <View style={styles.doneBadgePill}>
                            <Check size={12} color="#166534" />
                            <Text style={styles.doneBadgeText}>Done</Text>
                          </View>
                        ) : isScheduledToday ? (
                          <Pressable
                            onPress={() => setCompletingCommitment(commitment)}
                            style={styles.markDoneButton}
                          >
                            <Circle size={12} color={colors.mutedForeground} />
                            <Text style={styles.markDoneText}>Mark done</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.notScheduledText}>Not scheduled today</Text>
                        )
                      ) : null}

                      <Pressable
                        onPress={() => setHistoryCommitment(commitment)}
                        style={styles.historyBtn}
                        hitSlop={8}
                        accessibilityLabel="View commitment history"
                      >
                        <History size={15} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          {/* Add a Commitment Dashed Card (matches Screenshot Group 2 Page 3) */}
          {filter === "active" && (
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              style={({ pressed }) => [
                styles.dashedAddCard,
                pressed && styles.dashedAddCardPressed,
              ]}
            >
              <View style={styles.dashedAddIconCircle}>
                <Plus size={20} color={colors.primary} />
              </View>
              <Text style={styles.dashedAddText}>Add a commitment</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Options Menu Modal */}
      <RNModal
        visible={Boolean(actionCommitment)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionCommitment(null)}
      >
        <Pressable style={styles.actionModalOverlay} onPress={() => setActionCommitment(null)}>
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle} numberOfLines={1}>
                {actionCommitment?.title}
              </Text>
              <Pressable
                onPress={() => setActionCommitment(null)}
                style={styles.closeBtn}
                hitSlop={8}
              >
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Pressable
              style={styles.actionItem}
              onPress={() => {
                const c = actionCommitment;
                setActionCommitment(null);
                if (c) setHistoryCommitment(c);
              }}
            >
              <History size={18} color={colors.foreground} />
              <Text style={styles.actionItemText}>View history</Text>
            </Pressable>

            <Pressable
              style={styles.actionItem}
              onPress={() => {
                const c = actionCommitment;
                setActionCommitment(null);
                if (c) setEditingCommitment(c);
              }}
            >
              <Pencil size={18} color={colors.foreground} />
              <Text style={styles.actionItemText}>Edit commitment</Text>
            </Pressable>

            {actionCommitment?.status === "active" ? (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  const c = actionCommitment;
                  setActionCommitment(null);
                  if (c) void handleUpdateStatus(c, "paused");
                }}
              >
                <Pause size={18} color={colors.foreground} />
                <Text style={styles.actionItemText}>Pause commitment</Text>
              </Pressable>
            ) : actionCommitment?.status === "paused" ? (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  const c = actionCommitment;
                  setActionCommitment(null);
                  if (c) void handleUpdateStatus(c, "active");
                }}
              >
                <Play size={18} color={colors.foreground} />
                <Text style={styles.actionItemText}>Resume commitment</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.actionItem}
              onPress={() => {
                const c = actionCommitment;
                setActionCommitment(null);
                if (c) handleDeleteCommitment(c);
              }}
            >
              <Trash2 size={18} color={colors.destructive} />
              <Text style={[styles.actionItemText, { color: colors.destructive }]}>
                Delete commitment
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </RNModal>

      {/* Create / Edit Modal */}
      <CommitmentFormModal
        visible={createModalVisible || Boolean(editingCommitment)}
        commitment={editingCommitment}
        isFirstCommitment={!hasStartedMyc}
        timezone={profile?.timezone || "UTC"}
        onClose={() => {
          setCreateModalVisible(false);
          setEditingCommitment(null);
        }}
        onSuccess={() => {
          setCreateModalVisible(false);
          setEditingCommitment(null);
          void loadData();
        }}
      />

      {/* Complete Commitment Modal */}
      <CompleteCommitmentModal
        visible={Boolean(completingCommitment)}
        commitment={completingCommitment}
        date={todayDate}
        onClose={() => setCompletingCommitment(null)}
        onSuccess={() => {
          setCompletingCommitment(null);
          void loadData();
        }}
      />

      {/* History Modal */}
      <CommitmentHistoryModal
        visible={Boolean(historyCommitment)}
        commitment={historyCommitment}
        timezone={profile?.timezone || "UTC"}
        onClose={() => setHistoryCommitment(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.88,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginTop: 2,
  },
  newButtonFull: {
    width: "100%",
  },
  totalCountText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: -4,
  },
  commitmentCard: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileChar: {
    fontSize: 18,
    fontWeight: "700",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 4,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    gap: 2,
  },
  commitmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  commitmentFreq: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 2,
  },
  commitmentDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  startedGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  startedText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  footerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doneBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 4,
  },
  doneBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  markDoneButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
  },
  markDoneText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  notScheduledText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  historyBtn: {
    padding: 4,
  },
  dashedAddCard: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FAFAF8",
    borderRadius: radii.xl,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  dashedAddCardPressed: {
    backgroundColor: colors.secondary,
  },
  dashedAddIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dashedAddText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.curvedBar,
    borderTopRightRadius: radii.curvedBar,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
    ...shadows.floating,
  },
  actionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.foreground,
  },
});
