import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import type { AnalyticsReportingPeriod } from "@myc/types";
import { getAnalyticsData } from "@myc/utils";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { AnalyticsView } from "./_components/analytics-view";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Consistency patterns, weekly and monthly trends, and commitment performance.",
};

interface AnalyticsPageProps {
  searchParams: Promise<{
    period?: string;
    filter?: string;
    year?: string;
    month?: string;
  }>;
}

function AnalyticsLoadingFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-stack lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

async function AnalyticsDataLoader({ searchParams }: AnalyticsPageProps) {
  await connection();
  const params = await searchParams;

  const reportingPeriod = (params.period as AnalyticsReportingPeriod) || "7d";
  const filterCommitmentId = params.filter || "all";
  const selectedYear = params.year ? Number(params.year) : undefined;
  const selectedMonth = params.month ? Number(params.month) : undefined;

  const supabase = await createClient();
  const data = await getAnalyticsData(supabase, {
    reportingPeriod,
    filterCommitmentId,
    selectedYear,
    selectedMonth,
  });

  return <AnalyticsView initialData={data} />;
}

export default function AnalyticsPage(props: AnalyticsPageProps) {
  return (
    <Suspense fallback={<AnalyticsLoadingFallback />}>
      <AnalyticsDataLoader {...props} />
    </Suspense>
  );
}
