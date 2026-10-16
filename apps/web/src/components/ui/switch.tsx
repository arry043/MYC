"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

/** On/off toggle. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-soft outline-none after:absolute after:-inset-2 focus-visible:ring-4 focus-visible:ring-ring/30 data-checked:bg-primary data-unchecked:bg-[color-mix(in_oklch,var(--input),var(--foreground)_8%)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_3px_oklch(0.3_0.03_250/0.25)] transition-transform duration-300 ease-soft group-active/switch:scale-95 data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
