"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "cn";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, XIcon } from "lucide-react";

type ToastTone = "info" | "success" | "error";

/** App-wide toast queue, so `toast()` can be called from any client code. */
const toastManager = ToastPrimitive.createToastManager();

type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds; 0 keeps it open until dismissed. */
  timeout?: number;
};

function toast({ title, description, tone = "info", timeout }: ToastOptions) {
  return toastManager.add({
    title,
    description,
    type: tone,
    timeout,
    priority: tone === "error" ? "high" : "low",
  });
}

const icons: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  info: InfoIcon,
  success: CircleCheckIcon,
  error: CircleAlertIcon,
};

const iconTone: Record<ToastTone, string> = {
  info: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  error: "bg-destructive-soft text-destructive",
};

function isTone(value: string | undefined): value is ToastTone {
  return value === "info" || value === "success" || value === "error";
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((item) => {
    const tone = isTone(item.type) ? item.type : "info";
    const Icon = icons[tone];
    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        swipeDirection={["right", "down"]}
        className={cn(
          "relative flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-popover p-3.5 pr-11 shadow-floating",
          "transition-[opacity,translate,scale] duration-300 ease-soft select-none",
          "translate-x-(--toast-swipe-movement-x) translate-y-(--toast-swipe-movement-y)",
          "data-starting-style:translate-y-3 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
          "data-ending-style:opacity-0 data-limited:opacity-0 data-swiping:transition-none",
        )}
      >
        <span
          aria-hidden
          className={cn("grid size-8 shrink-0 place-content-center rounded-lg", iconTone[tone])}
        >
          <Icon className="size-4" />
        </span>
        <ToastPrimitive.Content className="grid gap-0.5 pt-0.5">
          <ToastPrimitive.Title className="type-label text-foreground" />
          <ToastPrimitive.Description className="type-small text-muted-foreground" />
        </ToastPrimitive.Content>
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 grid size-8 cursor-pointer place-content-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <XIcon className="size-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  });
}

/**
 * Provides the toast queue and renders the viewport. On phones toasts sit above the bottom
 * navigation; on larger screens in the bottom-right corner.
 */
function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} limit={3}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-60 mx-auto flex max-w-sm flex-col-reverse gap-2 outline-none md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

export { Toaster, toast };
