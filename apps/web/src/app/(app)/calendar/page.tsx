import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import type { CalendarView as ViewType } from "@myc/types";
import { getCalendarData } from "@myc/utils";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { CalendarView } from "./_components/calendar-view";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Contribution calendar, month, week, and day consistency views.",
};

interface CalendarPageProps {
  searchParams: Promise<{
    view?: string;
    date?: string;
    filter?: string;
    year?: string;
    month?: string;
  }>;
}

function CalendarLoadingFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-stack lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  );
}

async function CalendarDataLoader({ searchParams }: CalendarPageProps) {
  await connection();
  const params = await searchParams;

  const view = (params.view as ViewType) || "day";
  const date = params.date;
  const filter = params.filter || "all";
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;

  const supabase = await createClient();
  const data = await getCalendarData(supabase, {
    view,
    date,
    filterCommitmentId: filter,
    year,
    month,
  });

  return <CalendarView initialData={data} />;
}

export default function CalendarPage(props: CalendarPageProps) {
  return (
    <Suspense fallback={<CalendarLoadingFallback />}>
      <CalendarDataLoader {...props} />
    </Suspense>
  );
}
