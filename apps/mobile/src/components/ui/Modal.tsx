import { X } from "lucide-react-native";
import React from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { colors, radii, shadows } from "@/lib/theme";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  contentStyle,
}: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.dialogCard, contentStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {description && <Text style={styles.description}>{description}</Text>}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
              accessibilityLabel="Close dialog"
            >
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {/* Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.curvedBar,
    borderTopRightRadius: radii.curvedBar,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.floating,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  description: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  closeButton: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
  },
  body: {
    maxHeight: 450,
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
