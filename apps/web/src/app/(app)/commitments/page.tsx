import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import type { Commitment, Profile } from "@myc/types";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { CommitmentsView } from "./_components/commitments-view";

export const metadata: Metadata = { title: "Commitments" };

async function CommitmentsDataLoader() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <CommitmentsView initialCommitments={[]} initialProfile={null} />;
  }

  // Ensure profile exists idempotently
  const { data: profileData } = await supabase.rpc("ensure_profile");

  // Fetch all user commitments
  const { data: commitmentsData } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <CommitmentsView
      initialCommitments={(commitmentsData as Commitment[]) || []}
      initialProfile={(profileData as Profile) || null}
    />
  );
}

function CommitmentsLoadingFallback() {
  return (
    <div className="grid gap-stack">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <div className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-48 gap-4 p-6">
            <div className="flex justify-between">
              <Skeleton className="size-11 rounded-2xl" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CommitmentsPage() {
  return (
    <Suspense fallback={<CommitmentsLoadingFallback />}>
      <CommitmentsDataLoader />
    </Suspense>
  );
}
