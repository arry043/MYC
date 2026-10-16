import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

/** Shared field styling, also used by Textarea and SelectTrigger. */
export const fieldClassName =
  "w-full min-w-0 rounded-lg border border-input bg-card text-foreground shadow-[inset_0_1px_1px_oklch(0.3_0.03_250/0.03)] transition-[border-color,box-shadow] duration-200 ease-soft outline-none placeholder:text-muted-foreground/80 hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_12%)] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClassName,
        // 16px on phones prevents iOS zoom-on-focus.
        "h-11 px-3.5 text-base md:h-10 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
