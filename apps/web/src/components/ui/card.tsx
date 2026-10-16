import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const cardVariants = cva("group/card relative flex flex-col gap-stack rounded-card p-card", {
  variants: {
    tone: {
      default: "border border-border/70 bg-card text-card-foreground shadow-raised",
      sky: "bg-primary-soft text-foreground",
      lavender: "bg-lavender text-foreground",
      peach: "bg-peach text-foreground",
      mint: "bg-mint text-foreground",
      sun: "bg-sun text-foreground",
      /** Dashed outline for "add something" slots and empty placeholders. */
      dashed: "border border-dashed border-input bg-transparent text-foreground",
    },
    interactive: {
      // Subtle lift on hover, a small press on click. Reduced-motion users get the shadow only.
      true: "cursor-pointer transition-[translate,box-shadow,border-color,background-color] duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-floating focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-0 motion-reduce:hover:translate-y-0",
      false: "",
    },
  },
  defaultVariants: { tone: "default", interactive: false },
});

type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>;

function Card({ className, tone, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ tone, interactive }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("type-h3", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("type-small text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex-1", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 pt-1", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
