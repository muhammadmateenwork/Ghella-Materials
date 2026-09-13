"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ShowSuccessFn = (message: string) => Promise<void>;

const SuccessContext = createContext<ShowSuccessFn | null>(null);

const DISPLAY_MS = 1300;

export function SuccessOverlayProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback<ShowSuccessFn>((msg) => {
    setMessage(msg);
    return new Promise((resolve) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
        resolve();
      }, DISPLAY_MS);
    });
  }, []);

  return (
    <SuccessContext.Provider value={showSuccess}>
      {children}
      {message ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/35 px-4"
          style={{ animation: "success-fade-in 150ms ease-out" }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-sm bg-surface px-9 py-8 text-center shadow-[0_20px_56px_rgba(20,33,61,0.28)]"
            style={{ animation: "success-pop 220ms cubic-bezier(0.2,0.9,0.3,1.2)" }}
          >
            <CheckmarkBadge />
            <p className="max-w-[220px] text-[15px] font-semibold text-text">{message}</p>
          </div>
        </div>
      ) : null}
    </SuccessContext.Provider>
  );
}

function CheckmarkBadge() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <circle
        cx="30"
        cy="30"
        r="27"
        stroke="var(--color-success)"
        strokeWidth="4"
        pathLength={100}
        strokeDasharray={100}
        style={{ animation: "success-ring 420ms ease-out forwards" }}
      />
      <path
        d="M18 31 L26.5 39.5 L42 22"
        stroke="var(--color-success)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={40}
        strokeDasharray={40}
        style={{ animation: "success-check 260ms ease-out 380ms forwards", strokeDashoffset: 40 }}
      />
    </svg>
  );
}

export function useSuccessOverlay() {
  const ctx = useContext(SuccessContext);
  if (!ctx) throw new Error("useSuccessOverlay must be used within a <SuccessOverlayProvider>");
  return ctx;
}
