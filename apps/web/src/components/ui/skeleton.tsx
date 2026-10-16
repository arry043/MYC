import { cn } from "cn";

/** Placeholder block. A slow, low-contrast pulse; static when reduced motion is on. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_4%)] [animation-duration:2.2s]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
