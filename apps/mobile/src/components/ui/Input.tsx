import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { colors, radii } from "@/lib/theme";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  isPassword?: boolean;
}

export function Input({
  label,
  hint,
  error,
  containerStyle,
  inputStyle,
  isPassword = false,
  secureTextEntry,
  multiline,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          Boolean(error) && styles.errorWrapper,
          multiline && styles.multilineWrapper,
        ]}
      >
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          multiline={multiline}
          {...rest}
        />

        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            hitSlop={8}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.mutedForeground} />
            ) : (
              <Eye size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 48,
  },
  focusedWrapper: {
    borderColor: colors.primary,
  },
  errorWrapper: {
    borderColor: colors.destructive,
  },
  multilineWrapper: {
    height: "auto",
    minHeight: 88,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    padding: 0,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  hintText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    fontWeight: "500",
  },
});
