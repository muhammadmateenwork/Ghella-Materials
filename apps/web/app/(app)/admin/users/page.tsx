"use client";

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
import { Copy, Loader2, Mail, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../../components/Badge";
import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { useConfirm } from "../../../../components/ConfirmDialog";
import { PageTitle } from "../../../../components/PageTitle";
import { StackLoader } from "../../../../components/StackLoader";
import { TextField } from "../../../../components/TextField";
import { useToast } from "../../../../components/Toast";

export default function AdminUsersPage() {
  const usersQuery = useUsers();
  const users = usersQuery.data ?? [];
  const { profile: currentProfile } = useProfile();
  const updateRole = useUpdateUserRole();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("minimum");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ name: string; link: string; emailSent: boolean } | null>(
    null
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = createUserSchema.safeParse({ name, email, role });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    createUser.mutate(
      { ...result.data, siteUrl: window.location.origin },
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

  const handleCopyInviteLink = () => {
    if (!pendingInvite) return;
    navigator.clipboard.writeText(pendingInvite.link);
    showToast("Link copied.");
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
    <div className="mx-auto max-w-xl">
      <PageTitle>Users</PageTitle>

      {pendingInvite ? (
        <Card className="mb-6 border-primary bg-primary-soft">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm font-bold text-text">Account created for {pendingInvite.name}</p>
            <button
              type="button"
              onClick={() => setPendingInvite(null)}
              aria-label="Dismiss"
              className="shrink-0 text-text-faint hover:text-text"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <p className="mb-3 text-xs text-text-muted">
            {pendingInvite.emailSent
              ? "We've emailed them a link to set their password. If it doesn't arrive (check spam), share this link with them directly instead:"
              : "The email didn't send — share this one-time link with them directly (WhatsApp, text, in person) so they can set their password:"}
          </p>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-sm border border-border bg-surface px-3 py-2 text-xs text-text-muted">
              {pendingInvite.link}
            </div>
            <Button type="button" size="sm" icon={Copy} onClick={handleCopyInviteLink}>
              Copy
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6">
        <p className="mb-1 text-sm font-bold text-text">Create a new account</p>
        <p className="mb-4 text-xs text-text-faint">
          They'll be emailed a link to set their own password — no password to share yourself.
        </p>
        <form onSubmit={handleCreate}>
          <TextField label="Name *" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
          <TextField
            label="Email *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />

          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-semibold text-text">Access level</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <RoleOption label="Standard" selected={role === "minimum"} onClick={() => setRole("minimum")} />
              <RoleOption label="Maximum" selected={role === "maximum"} onClick={() => setRole("maximum")} />
            </div>
          </div>

          {formError ? <p className="mb-4 text-sm font-semibold text-danger">{formError}</p> : null}

          <Button type="submit" icon={UserPlus} loading={createUser.isPending}>
            Create account
          </Button>
        </form>
      </Card>

      <p className="mb-3 text-sm font-bold text-text">Existing users</p>
      {usersQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <StackLoader size="sm" />
        </div>
      ) : usersQuery.isError ? (
        <p className="text-sm text-danger">Couldn&apos;t load users: {usersQuery.error?.message}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => {
            const isSelf = user.id === currentProfile?.id;
            return (
              <Card key={user.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-alt">
                    {user.role === "maximum" ? (
                      <ShieldCheck size={16} className="text-primary" strokeWidth={2} />
                    ) : (
                      <Mail size={16} className="text-text-muted" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">{user.name}</p>
                    <p className="truncate text-xs text-text-muted">{user.email}</p>
                    <Badge
                      label={user.role === "maximum" ? "Maximum" : "Standard"}
                      tone={user.role === "maximum" ? "primary" : "neutral"}
                    />
                  </div>
                </div>
                {isSelf ? (
                  <span className="text-xs italic text-text-faint sm:shrink-0">This is you</span>
                ) : (
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleToggleRole(user)}
                      loading={updateRole.isPending && updateRole.variables?.userId === user.id}
                      disabled={deleteUser.isPending && deleteUser.variables === user.id}
                    >
                      {user.role === "maximum" ? "Set to Standard" : "Set to Maximum"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deleteUser.isPending && deleteUser.variables === user.id}
                      aria-label={`Delete ${user.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteUser.isPending && deleteUser.variables === user.id ? (
                        <Loader2 size={15} className="animate-spin" strokeWidth={2} />
                      ) : (
                        <Trash2 size={15} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoleOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 flex-1 truncate rounded-sm border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
        selected ? "border-primary bg-primary text-primary-text" : "border-border bg-surface text-text"
      }`}
    >
      {label}
    </button>
  );
}
