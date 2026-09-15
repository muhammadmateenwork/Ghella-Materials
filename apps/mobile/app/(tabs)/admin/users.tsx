import {
  createUserSchema,
  getFriendlyErrorMessage,
  useCreateUser,
  useDeleteUser,
  useProfile,
  useUpdateUserRole,
  useUsers,
  type Profile,
  type UserRole,
} from "@ghella/shared";
import { Mail, Share2, ShieldCheck, Trash2, UserPlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { useConfirm } from "../../../src/components/ConfirmDialog";
import { Screen, useKeyboardHeight } from "../../../src/components/Screen";
import { StackLoader } from "../../../src/components/StackLoader";
import { TextField } from "../../../src/components/TextField";
import { ThemedRefreshControl } from "../../../src/components/ThemedRefreshControl";
import { useToast } from "../../../src/components/Toast";
import { colors, fonts, radius, spacing, typography } from "../../../src/lib/theme";

export default function AdminUsersScreen() {
  const usersQuery = useUsers();
  const users = usersQuery.data ?? [];
  const { profile: currentProfile } = useProfile();
  const updateRole = useUpdateUserRole();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  // This screen's form lives in a FlatList header, not Screen's own
  // ScrollView, so it doesn't get Screen's built-in keyboard padding —
  // added directly to the list's contentContainerStyle below instead.
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("minimum");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ name: string; link: string; emailSent: boolean } | null>(
    null
  );

  const handleCreate = () => {
    setFormError(null);
    const result = createUserSchema.safeParse({ name, email, role });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    createUser.mutate(
      { ...result.data, siteUrl: process.env.EXPO_PUBLIC_WEB_URL },
      {
        onSuccess: (data) => {
          setName("");
          setEmail("");
          setRole("minimum");
          setPendingInvite({ name: result.data.name, link: data.inviteLink, emailSent: data.emailSent });
        },
        onError: (error) => setFormError(getFriendlyErrorMessage(error)),
      }
    );
  };

  const handleShareInviteLink = () => {
    if (!pendingInvite) return;
    Share.share({ message: `Set your Ghella Materials password: ${pendingInvite.link}` });
  };

  const handleToggleRole = async (user: Profile) => {
    const nextRole = user.role === "maximum" ? "minimum" : "maximum";
    const confirmed = await confirmDialog({
      title: `${nextRole === "maximum" ? "Grant" : "Remove"} maximum access?`,
      message: `Set ${user.name}'s access to ${nextRole}?`,
      confirmLabel: "Confirm",
    });
    if (!confirmed) return;
    updateRole.mutate(
      { userId: user.id, role: nextRole },
      { onError: (error) => showToast(`Couldn't update role: ${getFriendlyErrorMessage(error)}`, "error") }
    );
  };

  const handleDelete = async (user: Profile) => {
    const confirmed = await confirmDialog({
      title: "Delete this account?",
      message: `This permanently removes ${user.name}'s account and sign-in access. Their past reservations stay on record but are no longer linked to them.`,
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!confirmed) return;
    deleteUser.mutate(user.id, {
      onSuccess: () => showToast(`${user.name}'s account was deleted.`),
      onError: (error) => showToast(`Couldn't delete account: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        contentContainerStyle={[styles.list, keyboardHeight > 0 && { paddingBottom: keyboardHeight + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<ThemedRefreshControl refreshing={usersQuery.isFetching} onRefresh={() => usersQuery.refetch()} />}
        ListHeaderComponent={
          <View style={styles.form}>
            {pendingInvite ? (
              <Card style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <Text style={styles.inviteTitle}>Account created for {pendingInvite.name}</Text>
                  <Pressable onPress={() => setPendingInvite(null)} hitSlop={8}>
                    <X size={16} color={colors.textFaint} strokeWidth={2} />
                  </Pressable>
                </View>
                <Text style={styles.inviteHint}>
                  {pendingInvite.emailSent
                    ? "We've emailed them a link to set their password. If it doesn't arrive (check spam), share this link directly instead:"
                    : "The email didn't send — share this one-time link with them directly (WhatsApp, text, in person):"}
                </Text>
                <Text style={styles.inviteLink} numberOfLines={1}>
                  {pendingInvite.link}
                </Text>
                <Button title="Share link" icon={Share2} size="sm" onPress={handleShareInviteLink} />
              </Card>
            ) : null}

            <Card style={styles.formCard}>
              <Text style={styles.sectionTitle}>Create a new account</Text>
              <Text style={styles.hint}>
                They'll be emailed a link to set their own password — no password to share yourself.
              </Text>
              <TextField label="Name *" value={name} onChangeText={setName} error={fieldErrors.name} />
              <TextField
                label="Email *"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={fieldErrors.email}
              />

              <Text style={styles.label}>Access level</Text>
              <View style={styles.roleRow}>
                <RoleOption
                  label="Standard"
                  selected={role === "minimum"}
                  onPress={() => setRole("minimum")}
                />
                <RoleOption label="Maximum" selected={role === "maximum"} onPress={() => setRole("maximum")} />
              </View>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Button title="Create account" icon={UserPlus} onPress={handleCreate} loading={createUser.isPending} />
            </Card>

            <Text style={styles.sectionTitle}>Existing users</Text>
            {usersQuery.isLoading ? <StackLoader size="sm" style={styles.loading} /> : null}
          </View>
        }
        renderItem={({ item: user }) => {
          const isSelf = user.id === currentProfile?.id;
          return (
            <Card style={styles.row}>
              <View style={styles.rowContent}>
                <View style={styles.rowIcon}>
                  {user.role === "maximum" ? (
                    <ShieldCheck size={17} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <Mail size={17} color={colors.textMuted} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{user.name}</Text>
                  <Text style={styles.rowMeta}>{user.email}</Text>
                  <Badge
                    label={user.role === "maximum" ? "Maximum" : "Standard"}
                    tone={user.role === "maximum" ? "primary" : "neutral"}
                  />
                </View>
              </View>
              {isSelf ? (
                <Text style={styles.selfNote}>This is you — you can't change your own access level</Text>
              ) : (
                <View style={styles.rowActions}>
                  <Button
                    title={user.role === "maximum" ? "Set to Standard" : "Set to Maximum"}
                    variant="secondary"
                    size="sm"
                    onPress={() => handleToggleRole(user)}
                    loading={updateRole.isPending && updateRole.variables?.userId === user.id}
                    disabled={deleteUser.isPending && deleteUser.variables === user.id}
                  />
                  <Pressable
                    onPress={() => handleDelete(user)}
                    disabled={deleteUser.isPending && deleteUser.variables === user.id}
                    hitSlop={8}
                    style={styles.deleteButton}
                    accessibilityLabel={`Delete ${user.name}`}
                  >
                    {deleteUser.isPending && deleteUser.variables === user.id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function RoleOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.roleOption, selected && styles.roleOptionSelected]}>
      <Text style={[styles.roleOptionText, selected && styles.roleOptionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: spacing.md },
  inviteCard: { marginBottom: spacing.lg, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  inviteHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  inviteTitle: { ...typography.bodyStrong, fontSize: 14, color: colors.text, flexShrink: 1 },
  inviteHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.sm },
  inviteLink: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  formCard: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  label: { ...typography.bodyStrong, fontSize: 13, color: colors.text, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.textFaint, marginBottom: spacing.md },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  roleOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleOptionText: { ...typography.captionStrong, color: colors.text },
  roleOptionTextSelected: { color: colors.primaryText },
  formError: { color: colors.danger, fontFamily: fonts.bodySemiBold, marginBottom: spacing.md },
  loading: { marginTop: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  row: { marginBottom: spacing.sm + 2 },
  rowContent: { flexDirection: "row", gap: spacing.sm + 2 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { ...typography.subtitle, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  selfNote: { ...typography.caption, color: colors.textFaint, fontStyle: "italic", marginTop: spacing.sm },
  rowActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
});
