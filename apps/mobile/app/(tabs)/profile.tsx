import { changePasswordSchema, getFriendlyErrorMessage, useChangePassword, useProfile, useSignOut } from "@ghella/shared";
import { KeyRound, LogOut, Shield, User } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { useConfirm } from "../../src/components/ConfirmDialog";
import { PageHeading } from "../../src/components/PageHeading";
import { PasswordField } from "../../src/components/PasswordField";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/Toast";
import { colors, fonts, radius, spacing, shadow, typography } from "../../src/lib/theme";

export default function ProfileScreen() {
  const { profile, isMaxTier } = useProfile();
  const signOut = useSignOut();
  const changePassword = useChangePassword();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSignOut = async () => {
    const confirmed = await confirmDialog({ title: "Sign out?", confirmLabel: "Sign out", danger: true });
    if (confirmed) signOut.mutate();
  };

  const handleChangePassword = () => {
    const result = changePasswordSchema.safeParse({ password: newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    changePassword.mutate(result.data.password, {
      onSuccess: () => {
        setNewPassword("");
        setConfirmPassword("");
        showToast("Password updated.");
      },
      onError: (error) => showToast(`Couldn't update password: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Screen scroll>
      <PageHeading style={styles.title}>Profile</PageHeading>

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? "—"}</Text>
        <Badge
          label={isMaxTier ? "Maximum" : "Standard"}
          tone={isMaxTier ? "primary" : "neutral"}
        />
      </View>

      <Card style={styles.card}>
        <Row icon={User} label="Email" value={profile?.email ?? "—"} />
        <View style={styles.rowDivider} />
        <Row icon={Shield} label="Access level" value={isMaxTier ? "Maximum" : "Standard"} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <KeyRound size={15} color={colors.text} strokeWidth={2} />
          <Text style={styles.sectionTitle}>Change password</Text>
        </View>
        <PasswordField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          error={fieldErrors.password}
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
        />
        <Button
          title="Update password"
          variant="secondary"
          onPress={handleChangePassword}
          loading={changePassword.isPending}
        />
      </Card>

      <Button
        title="Sign out"
        variant="secondary"
        icon={LogOut}
        onPress={handleSignOut}
        loading={signOut.isPending}
        style={styles.signOut}
      />
    </Screen>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon size={16} color={colors.textMuted} strokeWidth={2} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  avatarWrap: { alignItems: "center", marginBottom: spacing.lg, gap: spacing.xs },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  avatarText: { color: colors.primaryText, fontSize: 26, fontFamily: fonts.displayBold },
  name: { ...typography.title, color: colors.text },
  card: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { ...typography.caption, color: colors.textFaint },
  rowValue: { ...typography.bodyStrong, color: colors.text },
  rowDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, marginBottom: spacing.md },
  sectionTitle: { ...typography.subtitle, color: colors.text },
  signOut: {},
});
