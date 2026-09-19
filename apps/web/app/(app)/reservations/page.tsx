"use client";

import {
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  useCancelReservation,
  useItem,
  useLocations,
  useMyReservationsInfinite,
  useSupabaseClient,
  type ReservationWithDetails,
} from "@ghella/shared";
import { CalendarClock, ImageOff, PackageSearch, PackageOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { useConfirm } from "../../../components/ConfirmDialog";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ItemQuickView } from "../../../components/ItemQuickView";
import { PageTitle } from "../../../components/PageTitle";
import { StackLoader } from "../../../components/StackLoader";
import { useSuccessOverlay } from "../../../components/SuccessOverlay";
import { useToast } from "../../../components/Toast";
import { useLoadMoreSentinel } from "../../../components/useLoadMoreSentinel";

const STATUS_TABS: { value: "all" | "active" | "cancelled"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ReservationsPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all");
  const [quickViewReservation, setQuickViewReservation] = useState<ReservationWithDetails | null>(null);
  const reservationsQuery = useMyReservationsInfinite();
  const locationsQuery = useLocations();
  const allReservations = useMemo(
    () => reservationsQuery.data?.pages.flatMap((page) => page.reservations) ?? [],
    [reservationsQuery.data]
  );
  const reservations = useMemo(
    () => (statusFilter === "all" ? allReservations : allReservations.filter((r) => r.status === statusFilter)),
    [allReservations, statusFilter]
  );
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();

  // The list only carries a thumbnail-sized slice of the item — the quick
  // view needs the item's full details (location, condition, notes,
  // creator), so fetch those lazily only once a reservation is tapped.
  const quickViewItemQuery = useItem(quickViewReservation?.item?.id ?? "", {
    enabled: Boolean(quickViewReservation?.item),
  });

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

      <div className="mb-5 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              statusFilter === tab.value
                ? "border-primary bg-primary text-primary-text"
                : "border-border bg-surface text-text-muted hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reservationsQuery.isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <StackLoader />
        </div>
      ) : reservationsQuery.isError ? (
        <ErrorState message={reservationsQuery.error?.message} onRetry={() => reservationsQuery.refetch()} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={statusFilter === "all" ? "Nothing reserved yet" : `No ${statusFilter} reservations`}
          subtitle={
            statusFilter === "all" ? "Materials you reserve will show up here." : "Try a different filter above."
          }
          action={
            statusFilter === "all"
              ? { label: "Browse materials", icon: PackageSearch, onClick: () => router.push("/browse") }
              : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {reservations.map((reservation) => {
              const photo = reservation.item?.item_photos[0];
              const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;
              return (
              <Card
                key={reservation.id}
                onClick={reservation.item ? () => setQuickViewReservation(reservation) : undefined}
                className={reservation.item ? "cursor-pointer transition-shadow hover:shadow-[0_10px_28px_rgba(20,33,61,0.1)]" : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-alt">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff size={16} className="text-text-faint" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      {reservation.item ? (
                        <span className="font-semibold text-text">{reservation.item.name}</span>
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
                    <p className="mt-1 text-xs text-text-muted">
                      Quantity: {reservation.quantity}
                      {reservation.item?.unit ? ` ${reservation.item.unit}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                      <CalendarClock size={13} strokeWidth={2} />
                      {new Date(reservation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {reservation.status === "active" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(reservation);
                    }}
                    disabled={cancelReservation.isPending && cancelReservation.variables === reservation.id}
                    className="mt-2 text-xs font-bold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                  >
                    {cancelReservation.isPending && cancelReservation.variables === reservation.id
                      ? "Cancelling…"
                      : "Cancel reservation"}
                  </button>
                ) : null}
              </Card>
              );
            })}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-6">
            {reservationsQuery.isFetchingNextPage ? <StackLoader size="sm" /> : null}
          </div>
        </>
      )}

      {quickViewReservation && quickViewItemQuery.data ? (
        <ItemQuickView
          item={quickViewItemQuery.data}
          locations={locationsQuery.data ?? []}
          myReservation={{ quantity: quickViewReservation.quantity, status: quickViewReservation.status }}
          onClose={() => setQuickViewReservation(null)}
          onViewDetails={() => {
            router.push(`/items/${quickViewReservation.item!.id}`);
            setQuickViewReservation(null);
          }}
        />
      ) : null}
    </div>
  );
}
