import { getFriendlyErrorMessage, loginSchema, useSignIn } from "@ghella/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { Button } from "../../src/components/Button";
import { Logomark } from "../../src/components/Logomark";
import { PasswordField } from "../../src/components/PasswordField";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { colors, fonts, spacing, typography } from "../../src/lib/theme";

const YARDS = "ORMISTON  ·  GREENWOOD  ·  HERNE BAY";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const signIn = useSignIn();

  const handleSubmit = () => {
    setFormError(null);
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    signIn.mutate(result.data, {
      onError: (error) => setFormError(getFriendlyErrorMessage(error)),
    });
  };

  return (
    <Screen scroll padded={false}>
      <View style={styles.hero}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <Pattern id="grid" width={32} height={32} patternUnits="userSpaceOnUse">
              <Path d="M 32 0 L 0 0 0 32" fill="none" stroke={colors.primary} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grid)" opacity={0.14} />
        </Svg>

        <Logomark size={48} />
        <Text style={styles.eyebrow}>{YARDS}</Text>
        <Text style={styles.headline}>
          Every crate.{"\n"}Every pallet.{"\n"}
          <Text style={styles.headlineAccent}>Accounted for.</Text>
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.titleRow}>
          <View style={styles.titleBar} />
          <Text style={styles.title}>Sign in</Text>
        </View>
        <Text style={styles.subtitle}>Enter the details your manager gave you.</Text>

        <TextField
          label="Email *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <PasswordField
          label="Password *"
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
          error={fieldErrors.password}
        />

        <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button title="Sign in" onPress={handleSubmit} loading={signIn.isPending} />

        <Text style={styles.footerNote}>
          Accounts are created by a manager. Contact your site lead if you don&apos;t have one yet.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  eyebrow: {
    marginTop: spacing.lg,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    color: colors.primary,
  },
  headline: {
    marginTop: spacing.sm,
    fontSize: 34,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase",
    lineHeight: 34,
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  headlineAccent: { color: colors.primary },
  form: { padding: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  titleBar: { width: 4, height: 20, backgroundColor: colors.primary },
  title: { fontSize: 26, fontFamily: fonts.displayBold, textTransform: "uppercase", color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  forgotLink: { alignSelf: "flex-end", marginTop: -spacing.sm, marginBottom: spacing.md },
  forgotText: { ...typography.captionStrong, color: colors.primary },
  formError: {
    color: colors.danger,
    fontFamily: fonts.bodySemiBold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  footerNote: {
    ...typography.caption,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
