"use client";

import {
  fetchItemsForExport,
  getFriendlyErrorMessage,
  itemsToCsv,
  useLocations,
  useSupabaseClient,
  type ExportReservationStatus,
} from "@ghella/shared";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { downloadCsv } from "../lib/downloadCsv";
import { useToast } from "./Toast";

const STATUS_OPTIONS: { value: ExportReservationStatus; label: string }[] = [
  { value: "all", label: "All materials" },
  { value: "none", label: "Not reserved" },
  { value: "partial", label: "Partially reserved" },
  { value: "full", label: "Fully reserved" },
];

export function ExportMaterialsButton({ ownedByUserId }: { ownedByUserId?: string | null }) {
  const supabase = useSupabaseClient();
  const locationsQuery = useLocations();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [status, setStatus] = useState<ExportReservationStatus>("all");
  const [includeDetails, setIncludeDetails] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const items = await fetchItemsForExport(supabase, {
        ownedByUserId,
        createdFrom: createdFrom || null,
        createdTo: createdTo || null,
        reservationStatus: status,
        includeReservationDetails: includeDetails,
      });
      if (items.length === 0) {
        showToast("No materials match those filters.", "error");
        return;
      }
      const csv = itemsToCsv(items, locationsQuery.data ?? [], includeDetails);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`ghella-materials-${stamp}.csv`, csv);
      setOpen(false);
    } catch (err) {
      showToast(`Couldn't export: ${getFriendlyErrorMessage(err)}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
      >
        <Download size={14} strokeWidth={2} /> Export CSV
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-md bg-surface p-5 shadow-[0_20px_60px_rgba(12,21,38,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-black uppercase tracking-tight text-text">Export CSV</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-text-faint hover:text-text">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-muted">Added from</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="w-full rounded-sm border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-muted">Added to</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="w-full rounded-sm border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-primary"
                />
              </label>
            </div>

            <div className="mb-4">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Reservation status
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      status === opt.value
                        ? "border-primary bg-primary text-primary-text"
                        : "border-border bg-surface text-text-muted hover:bg-surface-alt"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-4 flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Include who reserved what (one row per reservation)
            </label>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-text transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={15} strokeWidth={2} />
              {isExporting ? "Preparing…" : "Download CSV"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
