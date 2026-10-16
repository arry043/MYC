"use client";

import { useState } from "react";

import type { Commitment } from "@myc/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface DeleteCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment | null;
  onDeleted: (commitmentId: string) => void;
}

export function DeleteCommitmentDialog({
  open,
  onOpenChange,
  commitment,
  onDeleted,
}: DeleteCommitmentDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!commitment) return null;

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase.from("commitments").delete().eq("id", commitment.id);

    setDeleting(false);

    if (error) {
      toast({
        title: "Could not delete commitment",
        description: error.message,
        tone: "error",
      });
      return;
    }

    toast({
      title: "Commitment deleted",
      description: `"${commitment.title}" has been deleted.`,
      tone: "info",
    });

    onDeleted(commitment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h3 text-destructive">Delete commitment?</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete &ldquo;
            <span className="font-semibold text-foreground">{commitment.title}</span>&rdquo;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete commitment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
