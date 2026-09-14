import { useContext, useRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radius, spacing } from "../lib/theme";
import { ScrollIntoViewContext } from "./Screen";

export function TextField({
  label,
  error,
  onFocus,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const inputRef = useRef<TextInput>(null);
  const registerFocusedField = useContext(ScrollIntoViewContext);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        onFocus={(e) => {
          registerFocusedField?.(inputRef.current);
          onFocus?.(e);
        }}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    fontFamily: fonts.body,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs },
});
