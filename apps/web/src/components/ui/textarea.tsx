import { cn } from "cn";

import { fieldClassName } from "@/components/ui/input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClassName,
        "flex field-sizing-content min-h-24 px-3.5 py-2.5 text-base md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
