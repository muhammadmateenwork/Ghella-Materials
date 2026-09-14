"use client";

import { getFriendlyErrorMessage, useRequestPasswordReset } from "@ghella/shared";
import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Logomark } from "../../components/Logomark";
import { TextField } from "../../components/TextField";

export default function ForgotPasswordPage() {
  const requestReset = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    requestReset.mutate(
      { email: email.trim(), redirectTo: `${window.location.origin}/reset-password` },
      {
        onSuccess: () => setSent(true),
        onError: (err) => setError(getFriendlyErrorMessage(err)),
      }
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-14">
      <div className="w-full max-w-sm">
        <Logomark size={40} />

        {sent ? (
          <div className="mt-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
              <MailCheck size={22} className="text-success" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text">Check your email</h1>
            <p className="mt-2 text-[15px] text-text-muted">
              If an account exists for <span className="font-semibold text-text">{email}</span>, a link to reset
              its password is on its way.
            </p>
            <Link
              href="/login"
              className="mt-8 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={15} strokeWidth={2} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight text-text">
              Reset your password
            </h1>
            <p className="mt-1 mb-8 text-[15px] text-text-muted">
              Enter your account email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <TextField
                label="Email *"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error ?? undefined}
              />
              <Button type="submit" className="w-full" loading={requestReset.isPending}>
                Send reset link
              </Button>
            </form>

            <Link
              href="/login"
              className="mt-8 flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
            >
              <ArrowLeft size={15} strokeWidth={2} /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
