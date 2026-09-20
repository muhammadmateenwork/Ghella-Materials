"use client";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LABEL_CLASSES } from "./TextField";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** A custom month-grid calendar dropdown instead of the browser's native
 * `<input type="date">` — same "no default UI" reasoning as the rest of
 * the app's pickers (location, condition, reservation status). */
export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const [viewYear, setViewYear] = useState((parsed ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed ?? today).getMonth());

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative" ref={containerRef}>
      <span className={LABEL_CLASSES}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-border bg-surface px-2.5 py-2 text-left text-sm outline-none transition-colors focus:border-primary"
      >
        <span className={value ? "text-text" : "text-text-faint"}>{value || "Any date"}</span>
        <Calendar size={14} className="shrink-0 text-text-faint" strokeWidth={2} />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-surface p-3 shadow-[0_12px_32px_rgba(12,21,38,0.18)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else setViewMonth((m) => m - 1);
              }}
              className="rounded-sm p-1 text-text-muted hover:bg-surface-alt"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-bold uppercase tracking-wide text-text">{monthLabel}</span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else setViewMonth((m) => m + 1);
              }}
              className="rounded-sm p-1 text-text-muted hover:bg-surface-alt"
              aria-label="Next month"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-text-faint">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const iso = toIso(viewYear, viewMonth, day);
              const isSelected = iso === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-sm text-xs font-semibold transition-colors ${
                    isSelected ? "bg-primary text-primary-text" : "text-text hover:bg-surface-alt"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-alt"
            >
              <X size={12} strokeWidth={2} /> Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
