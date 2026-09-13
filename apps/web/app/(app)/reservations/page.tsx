"use client";

import {
  getFriendlyErrorMessage,
  useCancelReservation,
  useMyReservationsInfinite,
  type ReservationWithDetails,
} from "@ghella/shared";
import { CalendarClock, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { useConfirm } from "../../../components/ConfirmDialog";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { PageTitle } from "../../../components/PageTitle";
import { StackLoader } from "../../../components/StackLoader";
import { useSuccessOverlay } from "../../../components/SuccessOverlay";
import { useToast } from "../../../components/Toast";
import { useLoadMoreSentinel } from "../../../components/useLoadMoreSentinel";

export default function ReservationsPage() {
  const reservationsQuery = useMyReservationsInfinite();
  const reservations = useMemo(
    () => reservationsQuery.data?.pages.flatMap((page) => page.reservations) ?? [],
    [reservationsQuery.data]
  );
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();

  const sentinelRef = useLoadMoreSentinel(
    () => reservationsQuery.fetchNextPage(),
    Boolean(reservationsQuery.hasNextPage) && !reservationsQuery.isFetchingNextPage
  );

  const handleCancel = async (reservation: ReservationWithDetails) => {
    const confirmed = await confirmDialog({
      title: "Cancel this reservation?",
      message: `Cancel your reservation of ${reservation.quantity} x ${reservation.item?.name ?? "this material"}?`,
      confirmLabel: "Cancel reservation",
      danger: true,
    });
    if (!confirmed) return;
    cancelReservation.mutate(reservation.id, {
      onSuccess: () => showSuccess("Reservation cancelled"),
      onError: (error) => showToast(`Couldn't cancel reservation: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  return (
    <div>
      <PageTitle className="mb-5">My Reservations</PageTitle>

      {reservationsQuery.isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <StackLoader />
        </div>
      ) : reservationsQuery.isError ? (
        <ErrorState message={reservationsQuery.error?.message} onRetry={() => reservationsQuery.refetch()} />
      ) : reservations.length === 0 ? (
        <EmptyState icon={PackageOpen} title="Nothing reserved yet" subtitle="Materials you reserve will show up here." />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {reservations.map((reservation) => (
              <Card key={reservation.id}>
                <div className="flex items-start justify-between gap-3">
                  {reservation.item ? (
                    <Link
                      href={`/items/${reservation.item.id}`}
                      className="font-semibold text-text hover:text-primary"
                    >
                      {reservation.item.name}
                    </Link>
                  ) : (
                    <span className="font-semibold italic text-text-faint">Material removed</span>
                  )}
                  <Badge
                    label={reservation.status === "active" ? "Active" : "Cancelled"}
                    tone={reservation.status === "active" ? "success" : "neutral"}
                  />
                </div>
                {reservation.item?.identification_number ? (
                  <p className="mt-1 text-xs text-text-muted">ID: {reservation.item.identification_number}</p>
                ) : null}
                <p className="mt-1 text-xs text-text-muted">Quantity: {reservation.quantity}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                  <CalendarClock size={13} strokeWidth={2} />
                  {new Date(reservation.created_at).toLocaleDateString()}
                </p>
                {reservation.status === "active" ? (
                  <button
                    onClick={() => handleCancel(reservation)}
                    disabled={cancelReservation.isPending && cancelReservation.variables === reservation.id}
                    className="mt-2 text-xs font-bold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                  >
                    {cancelReservation.isPending && cancelReservation.variables === reservation.id
                      ? "Cancelling…"
                      : "Cancel reservation"}
                  </button>
                ) : null}
              </Card>
            ))}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-6">
            {reservationsQuery.isFetchingNextPage ? <StackLoader size="sm" /> : null}
          </div>
        </>
      )}
    </div>
  );
}
