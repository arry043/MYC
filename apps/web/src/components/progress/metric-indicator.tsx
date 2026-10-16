import { cn } from "cn";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";

type Trend = "up" | "down" | "flat";

type MetricIndicatorProps = {
  trend: Trend;
  /** Short change label, e.g. "+6% this week". */
  children: React.ReactNode;
  className?: string;
};

const trendIcon = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: MinusIcon };

/**
 * Compact change indicator. A dip is shown in neutral grey, not red: a slower week is
 * information, not failure.
 */
function MetricIndicator({ trend, children, className }: MetricIndicatorProps) {
  const Icon = trendIcon[trend];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 type-caption font-semibold",
        trend === "up" ? "text-success" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

export { MetricIndicator };
