/**
 * Surface and open/close transition shared by every floating element (dropdown, select,
 * popover). Base UI sets `data-starting-style` / `data-ending-style` around mount and unmount.
 */
export const popupSurface =
  "rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-floating outline-none";

export const popupTransition =
  "origin-(--transform-origin) transition-[opacity,translate,scale] duration-200 ease-soft data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150";

/** Row inside a menu or listbox. */
export const popupItem =
  "relative flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 type-small font-medium outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-45 data-highlighted:bg-secondary md:min-h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-4";
