import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { LoaderCircleIcon } from "lucide-react";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,translate,scale] duration-200 ease-soft outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/35 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:opacity-80 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-raised hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] hover:shadow-floating",
        secondary:
          "border-border bg-card text-foreground shadow-raised hover:border-[color-mix(in_oklch,var(--border),var(--foreground)_10%)] hover:bg-secondary aria-expanded:bg-secondary",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-[color-mix(in_oklch,var(--primary-soft),var(--primary)_10%)]",
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-white shadow-raised hover:bg-[color-mix(in_oklch,var(--destructive),black_8%)] focus-visible:ring-destructive/30",
        link: "h-auto! px-0! font-medium text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 rounded-md px-3 type-small font-semibold",
        default: "h-10 px-4 type-small font-semibold",
        lg: "h-12 rounded-xl px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, keeps the label for layout stability, and blocks interaction. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && <LoaderCircleIcon aria-hidden className="animate-spin" />}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
