import { cn } from "cn";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

function SearchInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div data-slot="search-input" className={cn("relative", className)}>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input type="search" className="pl-10 [&::-webkit-search-cancel-button]:hidden" {...props} />
    </div>
  );
}

export { SearchInput };
