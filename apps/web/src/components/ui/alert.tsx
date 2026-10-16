import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-xl px-4 py-3.5 text-left [&>svg]:row-span-2 [&>svg]:mt-0.5 [&>svg]:size-[1.125rem]",
  {
    variants: {
      tone: {
        info: "bg-primary-soft [&>svg]:text-primary-soft-foreground",
        success: "bg-success-soft [&>svg]:text-success",
        warning: "bg-warning-soft [&>svg]:text-warning",
        destructive: "bg-destructive-soft [&>svg]:text-destructive",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const icons = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  destructive: CircleAlertIcon,
};

type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/** Inline message. The icon pairs with the colour so meaning never relies on colour alone. */
function Alert({ className, tone, children, ...props }: AlertProps) {
  const Icon = icons[tone ?? "info"];
  return (
    <div
      data-slot="alert"
      role={tone === "destructive" || tone === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden />
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="alert-title" className={cn("type-label text-foreground", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 type-small text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
