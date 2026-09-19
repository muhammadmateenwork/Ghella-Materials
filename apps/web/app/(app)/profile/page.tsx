"use client";

import { changePasswordSchema, getFriendlyErrorMessage, useChangePassword, useProfile, useSignOut } from "@ghella/shared";
import { ChevronDown, ChevronUp, KeyRound, LogOut, Mail, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { useConfirm } from "../../../components/ConfirmDialog";
import { PageTitle } from "../../../components/PageTitle";
import { PasswordField } from "../../../components/PasswordField";
import { useToast } from "../../../components/Toast";

export default function ProfilePage() {
  const { profile, isMaxTier } = useProfile();
  const signOut = useSignOut();
  const changePassword = useChangePassword();
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    const confirmed = await confirmDialog({ title: "Sign out?", confirmLabel: "Sign out", danger: true });
    if (!confirmed) return;
    signOut.mutate(undefined, { onSuccess: () => router.replace("/login") });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const result = changePasswordSchema.safeParse({ password: newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    changePassword.mutate(result.data.password, {
      onSuccess: () => {
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
        showToast("Password updated.");
      },
      onError: (error) => showToast(`Couldn't update password: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Profile</PageTitle>

      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-display font-semibold text-primary-text shadow-md">
          {initials}
        </div>
        <p className="text-lg font-bold text-text">{profile?.name ?? "—"}</p>
        <Badge label={isMaxTier ? "Maximum" : "Standard"} tone={isMaxTier ? "primary" : "neutral"} />
      </div>

      <Card className="mb-6 flex flex-col gap-4">
        <Row icon={Mail} label="Email" value={profile?.email ?? "—"} />
        <div className="h-px bg-border" />
        <Row icon={Shield} label="Access level" value={isMaxTier ? "Maximum" : "Standard"} />
      </Card>

      <Card className="mb-6">
        <button
          type="button"
          onClick={() => setShowPasswordForm((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-bold text-text"
        >
          <span className="flex items-center gap-2">
            <KeyRound size={15} strokeWidth={2} /> Change password
          </span>
          {showPasswordForm ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
        </button>
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="mt-4" noValidate>
            <PasswordField
              label="New password *"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <PasswordField
              label="Confirm new password *"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
            />
            <Button type="submit" variant="secondary" loading={changePassword.isPending}>
              Update password
            </Button>
          </form>
        ) : null}
      </Card>

      <Button variant="secondary" icon={LogOut} className="w-full" loading={signOut.isPending} onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-surface-alt">
        <Icon size={16} className="text-text-muted" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs text-text-faint">{label}</p>
        <p className="font-semibold text-text">{value}</p>
      </div>
    </div>
  );
}
