"use client";

import { getFriendlyErrorMessage, loginSchema, useSession, useSignIn } from "@ghella/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { Logomark } from "../../components/Logomark";
import { PasswordField } from "../../components/PasswordField";
import { TextField } from "../../components/TextField";

const YARDS = ["ORMISTON", "GREENWOOD", "HERNE BAY"];

const FEATURES = [
  { label: "Every yard, one list", detail: "Materials tracked across all sites, not a spreadsheet per yard." },
  { label: "Live availability", detail: "See what's already reserved before you order anything new." },
  { label: "A record that holds up", detail: "Every reservation logged — who took what, and when." },
];

export default function LoginPage() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const signIn = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionLoading && session) {
      router.replace("/browse");
    }
  }, [isSessionLoading, session, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    signIn.mutate(result.data, {
      onSuccess: () => router.replace("/browse"),
      onError: (error) => setFormError(getFriendlyErrorMessage(error)),
    });
  };

  return (
    // md:h-screen + overflow-hidden: on laptop/desktop this is a single
    // glance splash, not a scrolling page. Mobile stays a normal scrolling
    // stack (min-h-screen) since a phone in portrait genuinely can't fit
    // hero + form without it.
    <main className="flex min-h-screen flex-1 flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Hero panel */}
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-ink px-8 py-10 text-white sm:px-14 sm:py-14 md:w-[55%] md:flex-none md:justify-center md:gap-5 md:px-10 md:py-5">
        {/* Blueprint grid — the drafting-paper texture behind everything */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#E8590C" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>

        {/* Elevation drawing: ascending crates with a dimension line, like an
            annotated site plan rather than stock hero imagery */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-6 opacity-[0.22] sm:opacity-30 md:-bottom-16 md:-right-10 md:opacity-[0.16]"
        >
          <svg width="360" height="340" viewBox="0 0 200 200" fill="none">
            <rect x="26" y="142" width="52" height="38" stroke="#E8590C" strokeWidth="1.5" />
            <rect x="82" y="108" width="52" height="72" stroke="#E8590C" strokeWidth="1.5" />
            <rect x="138" y="66" width="46" height="114" stroke="#E8590C" strokeWidth="1.5" />
            <line x1="192" y1="66" x2="192" y2="180" stroke="#E8590C" strokeWidth="1" />
            <line x1="188" y1="66" x2="196" y2="66" stroke="#E8590C" strokeWidth="1" />
            <line x1="188" y1="180" x2="196" y2="180" stroke="#E8590C" strokeWidth="1" />
            <line x1="8" y1="180" x2="184" y2="180" stroke="#E8590C" strokeWidth="1" strokeDasharray="2 4" />
          </svg>
        </div>

        <div className="relative z-10">
          <Logomark size={40} />
          <p className="mt-10 text-xs font-bold tracking-[0.3em] text-primary md:mt-4">{YARDS.join("  ·  ")}</p>
          <h1 className="mt-3 font-display text-[2.5rem] font-black uppercase leading-[0.95] tracking-tight sm:text-[4.25rem] md:mt-2 md:text-[3rem] md:leading-[0.95]">
            Every crate.
            <br />
            Every pallet.
            <br />
            <span className="text-primary">Accounted for.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/70 md:hidden">
            Ghella Materials replaces the yard spreadsheet — search what&apos;s on hand across every
            site, and reserve it before it walks onto a truck.
          </p>
          <p className="mt-3 hidden max-w-xs text-[13px] leading-snug text-white/70 md:block">
            Replaces the yard spreadsheet — search stock across every site before it walks onto a truck.
          </p>
        </div>

        <div className="relative z-10 mt-12 flex flex-col gap-5 sm:mt-16 md:mt-0 md:gap-2.5">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="flex items-baseline gap-3">
              <span className="h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden />
              <div>
                <p className="text-sm font-bold tracking-wide text-white">{feature.label}</p>
                <p className="text-[13px] text-white/60 md:hidden">{feature.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-1 items-center justify-center bg-background px-6 py-14 sm:px-12 md:py-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 md:mb-6">
            <span className="h-4 w-1 bg-primary" aria-hidden />
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight text-text">Sign in</h2>
          </div>
          <p className="-mt-6 mb-8 text-[15px] text-text-muted md:mb-6">Enter the details your manager gave you.</p>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            <div className="-mt-2 mb-4 flex justify-end">
              <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {formError ? (
              <p className="mb-4 text-sm font-semibold text-danger">{formError}</p>
            ) : null}

            <Button type="submit" className="w-full" loading={signIn.isPending}>
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-xs text-text-faint md:mt-6">
            Accounts are created by a manager. Contact your site lead if you don&apos;t have one yet.
          </p>
        </div>
      </section>
    </main>
  );
}
