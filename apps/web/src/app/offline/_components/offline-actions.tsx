"use client";

import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";

export function OfflineActions() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className={buttonVariants({
          variant: "default",
          size: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        <RefreshCwIcon className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
        {isRetrying ? "Retrying..." : "Try again"}
      </button>

      <Link
        href="/dashboard"
        className={buttonVariants({
          variant: "secondary",
          size: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        <ArrowLeftIcon className="size-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}
