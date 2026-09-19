"use client";

import { formatQuantity, getFriendlyErrorMessage, reservationsToCsv, useCancelReservation, useItemReservations } from "@ghella/shared";
import { ClipboardList, Download, Mail, User } from "lucide-react";
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
      <div className="flex flex-col gap-2">
        {reservations.map((r) => (
          <div key={r.id} className="rounded-sm border border-border bg-surface p-3.5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-text">
                  <User size={14} className="shrink-0 text-text-faint" strokeWidth={2} />
                  {r.user?.name ?? "Deleted user"}
                </p>
                {r.user?.email ? (
                  <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                    <Mail size={12} className="shrink-0 text-text-faint" strokeWidth={2} />
                    {r.user.email}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-bold text-primary">
                {formatQuantity(r.quantity, unit, isApproximate)}
              </span>
            </div>
            {r.contact_info ? (
              <p className="mb-2 whitespace-pre-wrap rounded-sm bg-surface-alt px-2.5 py-2 text-xs text-text-muted">
                {r.contact_info}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => handleCancel(r.id, r.user?.name ?? "This person")}
              disabled={cancelReservation.isPending && cancelReservation.variables === r.id}
              className="text-xs font-semibold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelReservation.isPending && cancelReservation.variables === r.id
                ? "Cancelling…"
                : "Cancel reservation"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
