import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/** Pill for status and compact metadata. Pills are reserved for these uses. */
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 type-caption font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-muted-foreground",
        outline: "border border-border bg-card text-muted-foreground",
        sky: "bg-primary-soft text-primary-soft-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        destructive: "bg-destructive-soft text-destructive",
        lavender: "bg-lavender text-lavender-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function Badge({
  className,
  tone,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ tone }), className) }, props),
    render,
    state: { slot: "badge" },
  });
}

/** Small coloured dot that precedes a status label. */
function StatusDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("size-1.5 rounded-full bg-current", className)} />;
}

export { Badge, StatusDot, badgeVariants };
