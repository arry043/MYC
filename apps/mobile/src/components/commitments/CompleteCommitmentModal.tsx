import { Lock } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Commitment, DailyCompletion } from "@myc/types";
import { completeCommitment, formatDisplayDate } from "@myc/utils";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

export interface CompleteCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  date: string;
  onSuccess: (completion: DailyCompletion) => void;
}

export function CompleteCommitmentModal({
  visible,
  onClose,
  commitment,
  date,
  onSuccess,
}: CompleteCommitmentModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!commitment) return null;

  const formattedDate = formatDisplayDate(date);
  const maxCommentLength = 1000;
  const isOverLimit = comment.length > maxCommentLength;

  const handleSubmit = async () => {
    if (isSubmitting || isOverLimit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = getSupabase();
    const trimmed = comment.trim();

    const { data, error } = await completeCommitment(supabase, {
      commitmentId: commitment.id,
      date,
      comment: trimmed ? trimmed : null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (data) {
      setComment("");
      onSuccess(data);
      onClose();
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrorMessage(null);
      setComment("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Complete commitment?"
      description={`Record your work for "${commitment.title}" on ${formattedDate}.`}
      footer={
        <View style={styles.footer}>
          <Button
            variant="secondary"
            onPress={handleClose}
            disabled={isSubmitting}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isOverLimit}
            style={styles.submitBtn}
          >
            Submit Completion
          </Button>
        </View>
      }
    >
      <View style={styles.container}>
        <View style={styles.commentHeader}>
          <Text style={styles.label}>What did you accomplish?</Text>
          <Text style={[styles.counter, isOverLimit && styles.counterOverLimit]}>
            {comment.length} / {maxCommentLength}
          </Text>
        </View>

        <Input
          placeholder="e.g. Solved 2 problems and read system design chapter"
          value={comment}
          onChangeText={setComment}
          multiline
          editable={!isSubmitting}
          maxLength={maxCommentLength + 50}
          hint="Add a note about what you did. This is optional."
        />

        {/* Permanent completion notice */}
        <View style={styles.noticeBox}>
          <Lock size={16} color={colors.primary} style={styles.lockIcon} />
          <Text style={styles.noticeText}>
            Once submitted, this completion and its comment cannot be changed, deleted, or undone.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  counter: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  counterOverLimit: {
    color: colors.destructive,
    fontWeight: "700",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  lockIcon: {
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.destructiveSoft,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 13,
    color: colors.destructive,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
