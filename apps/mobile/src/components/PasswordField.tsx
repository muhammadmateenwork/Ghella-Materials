import { Eye, EyeOff } from "lucide-react-native";
import { useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radius, spacing } from "../lib/theme";
import { ScrollIntoViewContext } from "./Screen";

export function PasswordField({
  label,
  error,
  onFocus,
  ...inputProps
}: Omit<TextInputProps, "secureTextEntry"> & { label: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const registerFocusedField = useContext(ScrollIntoViewContext);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={[styles.input, error && styles.inputError]}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          secureTextEntry={!visible}
          onFocus={(e) => {
            registerFocusedField?.(inputRef.current);
            onFocus?.(e);
          }}
          {...inputProps}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eyeButton}
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff size={18} color={colors.textFaint} strokeWidth={2} />
          ) : (
            <Eye size={18} color={colors.textFaint} strokeWidth={2} />
          )}
        </Pressable>
      </View>
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
  inputWrap: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingRight: spacing.xl + spacing.xs,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    fontFamily: fonts.body,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  eyeButton: { position: "absolute", right: spacing.sm + 4 },
  error: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs },
});
