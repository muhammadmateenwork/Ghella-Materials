"use client";

import { useItem, useProfile } from "@ghella/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackButton } from "../../../../../../components/BackButton";
import { ErrorState } from "../../../../../../components/ErrorState";
import { ItemReservationsList } from "../../../../../../components/ItemReservationsList";
import { PageTitle } from "../../../../../../components/PageTitle";
import { StackLoader } from "../../../../../../components/StackLoader";

export default function ItemReservationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const itemQuery = useItem(id);

  // Same ownership rule as the edit page — reservations against an item are
  // only visible to the item's own owner (RLS enforces this too; this just
  // bounces a non-owner before they see a permission-denied empty state).
  const item = itemQuery.data;
  const canView = !item || item.created_by === null || item.created_by === profile?.id;
  useEffect(() => {
    if (item && !canView) router.replace(`/items/${id}`);
  }, [item, canView, id, router]);

  if (itemQuery.isError) {
    return <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />;
  }

  if (itemQuery.isLoading || !item || !canView) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <StackLoader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <BackButton onClick={() => router.push("/admin/items")} />
      <PageTitle>Reservations</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-text-muted">{item.name}</p>

      <ItemReservationsList
        itemId={item.id}
        itemName={item.name}
        unit={item.unit}
        isApproximate={item.is_approximate}
        showEmptyState
      />
    </div>
  );
}
