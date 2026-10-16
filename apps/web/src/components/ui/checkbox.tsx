"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // The ::after extends the hit area to a comfortable touch target without changing layout.
        "peer relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[0.4rem] border-[1.5px] border-input bg-card transition-[background-color,border-color,box-shadow,translate,scale] duration-200 ease-soft outline-none after:absolute after:-inset-2.5 hover:border-primary/60 focus-visible:ring-4 focus-visible:ring-ring/30 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-[opacity,translate,scale] duration-200 ease-soft data-starting-style:scale-50 data-starting-style:opacity-0 [&>svg]:size-3.5"
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
