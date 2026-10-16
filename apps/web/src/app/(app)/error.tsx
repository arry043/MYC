"use client";

import { RotateCwIcon } from "lucide-react";

import { ErrorState } from "@/components/feedback/state-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Card className="py-6">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load this page. Your data is safe. Try again in a moment."
        action={
          <Button variant="secondary" onClick={() => retry()}>
            <RotateCwIcon />
            Try again
          </Button>
        }
      />
    </Card>
  );
}
