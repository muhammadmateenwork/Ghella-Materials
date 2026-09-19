"use client";

import { formatQuantity, getFriendlyErrorMessage, reservationsToCsv, useCancelReservation, useItemReservations } from "@ghella/shared";
import { ClipboardList, Download, Mail, MessageSquare, X } from "lucide-react";
import { downloadCsv } from "../lib/downloadCsv";
import { useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { StackLoader } from "./StackLoader";
import { useToast } from "./Toast";

export function ItemReservationsList({
  itemId,
  itemName,
  unit,
  isApproximate,
  showEmptyState = false,
}: {
  itemId: string;
  itemName: string;
  unit: string | null;
  isApproximate: boolean;
  // Inline (edit-material page) just shows nothing when there's nothing to
  // show. The dedicated reservations page passes this so an empty list
  // still reads as "loaded, nothing here" rather than a blank page.
  showEmptyState?: boolean;
}) {
  const reservationsQuery = useItemReservations(itemId);
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const reservations = reservationsQuery.data ?? [];

  const handleCancel = async (reservationId: string, reserverName: string) => {
    const confirmed = await confirmDialog({
      title: "Cancel this reservation?",
      message: `${reserverName} will be notified (email + app) that their reservation was cancelled.`,
      confirmLabel: "Cancel reservation",
      danger: true,
    });
    if (!confirmed) return;
    cancelReservation.mutate(reservationId, {
      onSuccess: () => showToast("Reservation cancelled."),
      onError: (error) => showToast(`Couldn't cancel: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  if (reservationsQuery.isLoading) {
    return (
      <div className="mb-6 flex justify-center py-4">
        <StackLoader size="sm" />
      </div>
    );
  }

  if (reservations.length === 0) {
    if (!showEmptyState) return null;
    return (
      <EmptyState
        icon={ClipboardList}
        title="No reservations yet"
        subtitle="Nobody has reserved this material."
      />
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-text">
          Reservations on this material <span className="font-normal text-text-faint">({reservations.length})</span>
        </p>
        <button
          type="button"
          onClick={() => downloadCsv(`${itemName}-reservations.csv`, reservationsToCsv(itemName, reservations))}
          className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text"
        >
          <Download size={13} strokeWidth={2} /> Export CSV
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {reservations.map((r) => {
          const name = r.user?.name ?? "Deleted user";
          const isCancelling = cancelReservation.isPending && cancelReservation.variables === r.id;
          return (
            <div key={r.id} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-sm font-bold text-text">{name}</p>
                    {r.user?.email ? (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-text-muted">
                        <Mail size={12} className="shrink-0 text-text-faint" strokeWidth={2} />
                        {r.user.email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-faint">Reserved</p>
                  <p className="font-display text-lg font-black tracking-tight text-primary">
                    {formatQuantity(r.quantity, unit, isApproximate)}
                  </p>
                </div>
              </div>

              {r.contact_info ? (
                <div className="mt-3 rounded-sm border border-border bg-surface-alt p-2.5">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-text-faint">
                    <MessageSquare size={11} strokeWidth={2} /> Contact info
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">{r.contact_info}</p>
                </div>
              ) : null}

              <div className="mt-3 flex justify-end border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => handleCancel(r.id, name)}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={13} strokeWidth={2.5} />
                  {isCancelling ? "Cancelling…" : "Cancel reservation"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
