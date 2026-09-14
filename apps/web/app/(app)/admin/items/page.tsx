"use client";

import { formatQuantity, getFriendlyErrorMessage, useDeleteItem, useItemsInfinite, useProfile } from "@ghella/shared";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "../../../../components/Button";
import { useConfirm } from "../../../../components/ConfirmDialog";
import { EmptyState } from "../../../../components/EmptyState";
import { ErrorState } from "../../../../components/ErrorState";
import { PageTitle } from "../../../../components/PageTitle";
import { StackLoader } from "../../../../components/StackLoader";
import { useToast } from "../../../../components/Toast";
import { useLoadMoreSentinel } from "../../../../components/useLoadMoreSentinel";

export default function AdminItemsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const itemsQuery = useItemsInfinite();
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);

  const sentinelRef = useLoadMoreSentinel(
    () => itemsQuery.fetchNextPage(),
    Boolean(itemsQuery.hasNextPage) && !itemsQuery.isFetchingNextPage
  );

  const handleDelete = async (item: { id: string; name: string }) => {
    const confirmed = await confirmDialog({
      title: "Delete this material?",
      message: `This removes "${item.name}" and its photos. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => showToast(`"${item.name}" deleted.`),
      onError: (error) => showToast(`Couldn't delete item: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <PageTitle className="">Materials</PageTitle>
        <Link href="/admin/items/new">
          <Button icon={Plus}>Add item</Button>
        </Link>
      </div>

      {itemsQuery.isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <StackLoader />
        </div>
      ) : itemsQuery.isError ? (
        <ErrorState message={itemsQuery.error?.message} onRetry={() => itemsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="No materials yet" subtitle="Add the first item to get started." />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              // Items added before ownership was tracked (created_by null)
              // stay editable by any maximum-tier user; otherwise only the
              // person who added it can edit or delete it.
              const canEdit = item.created_by === null || item.created_by === profile?.id;
              return (
                <div
                  key={item.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/admin/items/${item.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/admin/items/${item.id}`);
                  }}
                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-border bg-surface p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,33,61,0.1)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{item.name}</p>
                    <p className="truncate text-xs text-text-muted">
                      {item.location.name} · Qty {formatQuantity(item.quantity, item.unit, item.is_approximate)}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/items/${item.id}`);
                        }}
                        disabled={deleteItem.isPending && deleteItem.variables === item.id}
                        aria-label={`Edit ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-surface-alt hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={15} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        disabled={deleteItem.isPending && deleteItem.variables === item.id}
                        aria-label={`Delete ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleteItem.isPending && deleteItem.variables === item.id ? (
                          <Loader2 size={15} className="animate-spin" strokeWidth={2} />
                        ) : (
                          <Trash2 size={15} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-xs italic text-text-faint">Added by another manager</span>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-6">
            {itemsQuery.isFetchingNextPage ? <StackLoader size="sm" /> : null}
          </div>
        </>
      )}
    </div>
  );
}
