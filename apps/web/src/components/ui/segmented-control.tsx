"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "cn";
import { motion } from "motion/react";
import { useId } from "react";

import { transition } from "@/lib/motion";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/** Pill-shaped single choice (e.g. Year / Month / Week). The thumb glides between options. */
function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const thumbId = useId();
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        const match = options.find((option) => option.value === next);
        if (match) onValueChange(match.value);
      }}
      aria-label={props["aria-label"]}
      className={cn("inline-flex rounded-full bg-secondary p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Radio.Root
            key={option.value}
            value={option.value}
            className="relative h-8 cursor-pointer rounded-full px-3.5 type-small font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 data-checked:text-foreground"
          >
            {selected && (
              <motion.span
                layoutId={thumbId}
                transition={transition.layout}
                aria-hidden
                className="absolute inset-0 rounded-full bg-card shadow-raised"
              />
            )}
            <span className="relative">{option.label}</span>
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}

export { SegmentedControl };
