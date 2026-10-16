import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type StatTone = "sky" | "lavender" | "peach" | "mint" | "sun";

const iconTone: Record<StatTone, string> = {
  sky: "bg-primary-soft text-primary-soft-foreground",
  lavender: "bg-lavender text-lavender-foreground",
  peach: "bg-peach text-peach-foreground",
  mint: "bg-mint text-mint-foreground",
  sun: "bg-sun text-sun-foreground",
};

type StatCardProps = {
  label: string;
  value: string;
  /** Unit shown after the value in smaller type, e.g. "days". */
  unit?: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Supporting line under the value, e.g. a MetricIndicator. */
  footer?: React.ReactNode;
  className?: string;
};

/** Headline number with a tinted icon tile. Colour marks identity; the text carries meaning. */
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  tone = "sky",
  footer,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="type-label text-muted-foreground">{label}</p>
        <span
          aria-hidden
          className={cn("grid size-9 place-content-center rounded-xl", iconTone[tone])}
        >
          <Icon className="size-[1.125rem]" strokeWidth={2} />
        </span>
      </div>
      <div className="grid gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="type-metric">{value}</span>
          {unit && <span className="type-small font-medium text-muted-foreground">{unit}</span>}
        </p>
        {footer}
      </div>
    </Card>
  );
}

export { StatCard, type StatTone };
