import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Commitment, CommitmentFrequency, CommitmentTone, Weekday } from "@myc/types";
import { VALID_TONES, validateCommitmentInput, WEEKDAYS } from "@myc/utils";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

export interface CommitmentFormModalProps {
  visible: boolean;
  onClose: () => void;
  commitment?: Commitment | null; // null for create, object for edit
  isFirstCommitment?: boolean;
  onSaved?: () => void;
  onSuccess?: () => void;
}

const TONE_NAMES: Record<CommitmentTone, string> = {
  sky: "Sky",
  lavender: "Lavender",
  peach: "Peach",
  mint: "Mint",
  sun: "Sun",
};

const WEEKDAY_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export function CommitmentFormModal({
  visible,
  onClose,
  commitment,
  onSaved,
  onSuccess,
}: CommitmentFormModalProps) {
  const isEditing = Boolean(commitment);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<CommitmentFrequency>("daily");
  const [scheduleDays, setScheduleDays] = useState<Weekday[]>([1, 2, 3, 4, 5, 6, 7]);
  const [tone, setTone] = useState<CommitmentTone>("sky");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevCommitment, setPrevCommitment] = useState(commitment);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (commitment !== prevCommitment || visible !== prevVisible) {
    setPrevCommitment(commitment);
    setPrevVisible(visible);
    if (commitment) {
      setTitle(commitment.title);
      setDescription(commitment.description || "");
      setFrequency(commitment.frequency as CommitmentFrequency);
      setScheduleDays((commitment.schedule_days as Weekday[]) || [1, 2, 3, 4, 5, 6, 7]);
      setTone(commitment.tone as CommitmentTone);
    } else {
      setTitle("");
      setDescription("");
      setFrequency("daily");
      setScheduleDays([1, 2, 3, 4, 5, 6, 7]);
      setTone("sky");
    }
    setErrors({});
  }

  const toggleDay = (day: Weekday) => {
    if (scheduleDays.includes(day)) {
      if (scheduleDays.length > 1) {
        setScheduleDays(scheduleDays.filter((d) => d !== day));
      }
    } else {
      setScheduleDays([...scheduleDays, day].sort((a, b) => a - b) as Weekday[]);
    }
  };

  const handleSave = async () => {
    const validation = validateCommitmentInput({
      title,
      description,
      frequency,
      schedule_days: frequency === "daily" ? [1, 2, 3, 4, 5, 6, 7] : scheduleDays,
      tone,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      setErrors({ title: "You must be signed in to save commitments." });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      frequency,
      schedule_days: frequency === "daily" ? [1, 2, 3, 4, 5, 6, 7] : scheduleDays,
      tone,
    };

    if (isEditing && commitment) {
      const { error } = await supabase.from("commitments").update(payload).eq("id", commitment.id);

      setIsSubmitting(false);
      if (error) {
        setErrors({ title: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from("commitments").insert({
        ...payload,
        user_id: user.id,
        status: "active",
      });

      setIsSubmitting(false);
      if (error) {
        setErrors({ title: error.message });
        return;
      }
    }

    onSaved?.();
    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Edit Commitment" : "New Commitment"}
      description={
        isEditing
          ? "Update commitment details and schedule."
          : "Define a meaningful, recurring commitment."
      }
      footer={
        <View style={styles.footer}>
          <Button
            variant="secondary"
            onPress={onClose}
            disabled={isSubmitting}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitBtn}
          >
            {isEditing ? "Save Changes" : "Create Commitment"}
          </Button>
        </View>
      }
    >
      <View style={styles.container}>
        <Input
          label="Commitment Title"
          placeholder="e.g. Morning running or LeetCode problem"
          value={title}
          onChangeText={setTitle}
          error={errors.title}
          editable={!isSubmitting}
        />

        <Input
          label="Description (optional)"
          placeholder="Why does this commitment matter to you?"
          value={description}
          onChangeText={setDescription}
          multiline
          editable={!isSubmitting}
        />

        {/* Frequency selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Frequency</Text>
          <SegmentedControl
            options={[
              { value: "daily", label: "Every Day" },
              { value: "selected_days", label: "Specific Days" },
            ]}
            value={frequency}
            onChange={(val) => setFrequency(val as CommitmentFrequency)}
          />
        </View>

        {/* Days of week picker if specific days */}
        {frequency === "specific_days" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Select Active Days</Text>
            <View style={styles.daysRow}>
              {WEEKDAYS.map((day, idx) => {
                const dayId = day.id as Weekday;
                const isSelected = scheduleDays.includes(dayId);
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => toggleDay(dayId)}
                    style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                  >
                    <Text
                      style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}
                    >
                      {WEEKDAY_SHORT[idx]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.schedule_days && <Text style={styles.errorText}>{errors.schedule_days}</Text>}
          </View>
        )}

        {/* Tone accent picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Card Accent Color</Text>
          <View style={styles.tonesRow}>
            {VALID_TONES.map((t) => {
              const toneCfg = colors.tones[t];
              const isSelected = tone === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTone(t)}
                  style={[
                    styles.toneItem,
                    {
                      backgroundColor: toneCfg.bg,
                      borderColor: isSelected ? colors.foreground : toneCfg.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.toneText, { color: toneCfg.text }]}>{TONE_NAMES[t]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  daysRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  dayButtonTextSelected: {
    color: "#FFFFFF",
  },
  tonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  toneText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
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
