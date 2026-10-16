import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import type { Commitment, DailyCompletion } from "@myc/types";
import { getDashboardConsistencyData, getUserLocalDateString } from "@myc/utils";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { DashboardView } from "./_components/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardDataLoader() {
  await connection();
  const supabase = await createClient();

  const { metrics, todayItems, profile } = await getDashboardConsistencyData(supabase);

  const { data: commitmentsData } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: true });

  const allCommitments = (commitmentsData as Commitment[]) || [];
  const timezone = profile?.timezone || "UTC";
  const todayDate = getUserLocalDateString(timezone);

  let allCompletions: DailyCompletion[] = [];
  if (profile?.myc_started_at && profile.myc_started_at <= todayDate) {
    const { data: compsData } = await supabase
      .from("daily_completions")
      .select("*")
      .gte("date", profile.myc_started_at)
      .lte("date", todayDate);

    if (compsData) {
      allCompletions = compsData as DailyCompletion[];
    }
  }

  return (
    <DashboardView
      initialMetrics={metrics}
      initialTodayItems={todayItems}
      allCommitments={allCommitments}
      allCompletions={allCompletions}
      initialProfile={profile}
      todayDate={todayDate}
    />
  );
}

function DashboardLoadingFallback() {
  return (
    <div className="grid gap-stack">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      <div className="grid gap-stack lg:grid-cols-5">
        <Card className="h-48 gap-4 p-6 lg:col-span-3">
          <Skeleton className="size-24 rounded-full" />
        </Card>
        <Card className="h-48 gap-4 p-6 lg:col-span-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-28 p-4">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="mt-2 h-7 w-12 rounded-lg" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DashboardDataLoader />
    </Suspense>
  );
}
