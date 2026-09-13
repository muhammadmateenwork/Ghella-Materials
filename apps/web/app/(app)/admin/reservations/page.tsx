"use client";

import { useAllReservationsInfinite } from "@ghella/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarClock, ClipboardList, Phone, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { Badge } from "../../../../components/Badge";
import { Card } from "../../../../components/Card";
import { EmptyState } from "../../../../components/EmptyState";
import { ErrorState } from "../../../../components/ErrorState";
import { PageTitle } from "../../../../components/PageTitle";
import { StackLoader } from "../../../../components/StackLoader";

export default function AdminReservationsPage() {
  const query = useAllReservationsInfinite();
  const reservations = useMemo(() => query.data?.pages.flatMap((page) => page.reservations) ?? [], [query.data]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // A "recycler view" for the log: only the rows actually on screen exist
  // in the DOM at any moment, however long the history gets over the life
  // of the project.
  const virtualizer = useVirtualizer({
    count: reservations.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 132,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= reservations.length - 5 && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualItems, reservations.length, query.hasNextPage, query.isFetchingNextPage]);

  return (
    <div>
      <PageTitle className="mb-5">Reservation Log</PageTitle>

      {query.isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <StackLoader />
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      ) : reservations.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No reservations yet" />
      ) : (
        <div ref={scrollRef} className="h-[calc(100vh-14rem)] overflow-y-auto pr-1">
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((virtualRow) => {
              const reservation = reservations[virtualRow.index];
              return (
                <div
                  key={reservation.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: 12,
                  }}
                >
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      {reservation.item ? (
                        <Link
                          href={`/items/${reservation.item.id}`}
                          className="font-semibold text-text hover:text-primary"
                        >
                          {reservation.item.name}
                        </Link>
                      ) : (
                        <span className="font-semibold italic text-text-faint">Material deleted</span>
                      )}
                      <Badge
                        label={reservation.status === "active" ? "Active" : "Cancelled"}
                        tone={reservation.status === "active" ? "success" : "neutral"}
                      />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
                      <User size={13} strokeWidth={2} />
                      {reservation.user ? `${reservation.user.name} (${reservation.user.email})` : "Deleted user"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">Quantity: {reservation.quantity}</p>
                    {reservation.contact_info ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                        <Phone size={13} strokeWidth={2} />
                        {reservation.contact_info}
                      </p>
                    ) : null}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                      <CalendarClock size={13} strokeWidth={2} />
                      {new Date(reservation.created_at).toLocaleString()}
                    </p>
                  </Card>
                </div>
              );
            })}
          </div>
          {query.isFetchingNextPage ? (
            <div className="flex justify-center py-4">
              <StackLoader size="sm" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
