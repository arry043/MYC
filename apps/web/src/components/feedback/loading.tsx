import { cn } from "cn";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-2 w-full rounded-full" />
    </Card>
  );
}

function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("gap-0 py-2", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${70 - index * 9}%` }} />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </Card>
  );
}

/** Full-page placeholder shaped like a typical MYC page: header, stat row, two panels. */
function PageLoading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-section">
      <div className="grid gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="grid gap-stack lg:grid-cols-[3fr_2fr]">
        <SkeletonList rows={5} />
        <SkeletonCard className="min-h-56" />
      </div>
    </div>
  );
}

export { PageLoading, SkeletonCard, SkeletonList };
