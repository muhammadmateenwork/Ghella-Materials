export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-surface-alt ${className}`} />;
}

export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-border bg-surface">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-1 h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}
