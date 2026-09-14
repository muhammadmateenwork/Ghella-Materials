import { getFriendlyErrorMessage, useRequestPasswordReset } from "@ghella/shared";
import { router } from "expo-router";
import { ArrowLeft, MailCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Button } from "../../src/components/Button";
import { Logomark } from "../../src/components/Logomark";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { colors, radius, spacing, typography } from "../../src/lib/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

export default function ForgotPasswordScreen() {
  const requestReset = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    requestReset.mutate(
      { email: email.trim(), redirectTo: WEB_URL ? `${WEB_URL}/reset-password` : undefined },
      {
        onSuccess: () => setSent(true),
        onError: (err) => setError(getFriendlyErrorMessage(err)),
      }
    );
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Logomark size={56} />
      </View>

      {sent ? (
        <View>
          <View style={styles.iconWrap}>
            <MailCheck size={22} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If an account exists for {email}, a link to reset its password is on its way. Open it on any device to
            finish resetting your password.
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
            <ArrowLeft size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.backLinkText}>Back to sign in</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>Enter your account email and we&apos;ll send you a reset link.</Text>

          <TextField
            label="Email *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            error={error ?? undefined}
          />
          <Button title="Send reset link" onPress={handleSubmit} loading={requestReset.isPending} />

          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
            <ArrowLeft size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.backLinkTextMuted}>Back to sign in</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  backLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg, alignSelf: "center" },
  backLinkText: { ...typography.captionStrong, color: colors.primary },
  backLinkTextMuted: { ...typography.captionStrong, color: colors.textMuted },
});
