import { cn } from "cn";
import Link from "next/link";

import { APP_NAME } from "@/lib/app";

/** The MYC mark: a small grid of days, echoing the consistency calendar. */
function BrandMark({ className }: { className?: string }) {
  const cells = [0.35, 1, 0.6, 1, 0.6, 1, 0.6, 1, 0.35];
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      {cells.map((opacity, index) => (
        <rect
          key={index}
          x={6.5 + (index % 3) * 6.75}
          y={6.5 + Math.floor(index / 3) * 6.75}
          width="5.25"
          height="5.25"
          rx="1.4"
          fill="white"
          opacity={opacity}
        />
      ))}
    </svg>
  );
}

/** Mark + wordmark linking home. `compact` hides the wordmark (tablet rail). */
function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label={`${APP_NAME} home`}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
        className,
      )}
    >
      <BrandMark />
      {!compact && <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>}
    </Link>
  );
}

export { Brand, BrandMark };
