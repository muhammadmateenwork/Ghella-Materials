"use client";

import { changePasswordSchema, getFriendlyErrorMessage, useChangePassword, useSupabaseClient } from "@ghella/shared";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { Logomark } from "../../components/Logomark";
import { PasswordField } from "../../components/PasswordField";
import { StackLoader } from "../../components/StackLoader";

type LinkState = "verifying" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const changePassword = useChangePassword();

  const [linkState, setLinkState] = useState<LinkState>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's reset-password email can land here in any of three shapes
    // depending on project settings — the classic implicit-flow hash
    // (#access_token=...&refresh_token=...&type=recovery), a PKCE
    // authorization code (?code=...), or a one-time verification token
    // (?token_hash=...&type=recovery). Our client has detectSessionInUrl
    // false, so nothing consumes any of these automatically — every shape
    // has to be handled here, or a perfectly valid, fresh link reads as
    // "invalid" regardless of how much time is left on it.
    let cancelled = false;

    async function establishSession() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash") ?? hashParams.get("token_hash");
      // "invite" shows up here too — the admin-create-user flow now invites
      // new users the same way Supabase invites anyone else, landing them
      // on this same page to set their first password.
      const otpType = (searchParams.get("type") ?? hashParams.get("type") ?? "recovery") as
        | "recovery"
        | "invite"
        | "email";

      // If this browser already has a session for a different account
      // (e.g. the admin who sent this invite, still signed in from
      // creating it), that session has to be cleared before establishing
      // the new one below — otherwise it can win the race and this page
      // ends up authenticated as whoever was already logged in instead of
      // whoever the link was actually for. Local-only: this doesn't touch
      // the existing account's session anywhere else, just this browser.
      await supabase.auth.signOut({ scope: "local" });

      let error: { message: string } | null = null;

      if (accessToken && refreshToken) {
        ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
      } else if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else if (tokenHash) {
        ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType }));
      } else {
        error = { message: "Missing recovery token" };
      }

      if (cancelled) return;
      setLinkState(error ? "invalid" : "valid");
      if (!error) window.history.replaceState(null, "", window.location.pathname);
    }

    establishSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = changePasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    changePassword.mutate(result.data.password, {
      onSuccess: () => setDone(true),
      onError: (error) => setFieldErrors({ password: getFriendlyErrorMessage(error) }),
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-6 py-14">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logomark size={40} />
        </div>

        <div className="mt-10 flex min-h-[260px] flex-col items-center justify-center text-center">
          {linkState === "verifying" ? (
            <StackLoader label="Checking your link…" />
          ) : linkState === "invalid" ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-danger-soft">
                <TriangleAlert size={22} className="text-danger" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-text">Link expired</h1>
              <p className="mt-2 text-[15px] text-text-muted">
                This reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Link href="/forgot-password" className="w-full">
                <Button className="mt-6 w-full">Request a new link</Button>
              </Link>
            </>
          ) : done ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-success-soft">
                <CheckCircle2 size={22} className="text-success" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-text">
                Password updated
              </h1>
              <p className="mt-2 text-[15px] text-text-muted">You can now sign in with your new password.</p>
              <Button className="mt-6 w-full" onClick={() => router.replace("/login")}>
                Go to sign in
              </Button>
            </>
          ) : (
            <div className="w-full text-left">
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-text">
                Set a new password
              </h1>
              <p className="mt-1 mb-8 text-[15px] text-text-muted">Choose a new password for your account.</p>

              <form onSubmit={handleSubmit} noValidate>
                <PasswordField
                  label="New password *"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                />
                <PasswordField
                  label="Confirm new password *"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={fieldErrors.confirmPassword}
                />
                <Button type="submit" className="w-full" loading={changePassword.isPending}>
                  Update password
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
