import { ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { LinearProgress } from "@/components/progress/linear-progress";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleCommitments, sampleMonth, sampleToday } from "@/lib/sample-data";

import { MonthHeatmap } from "./_components/month-heatmap";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  const active = sampleCommitments.filter((commitment) => commitment.status === "active");

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Your consistency, day by day"
        description="Every shaded day is a day you showed up. Darker means more got done."
      />

      <div className="grid gap-stack lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="items-center">
            <h2 className="type-h2">{sampleMonth.title}</h2>
            <div className="flex gap-1.5">
              <Button variant="secondary" size="icon-sm" aria-label="Previous month">
                <ChevronLeftIcon />
              </Button>
              <Button variant="secondary" size="icon-sm" aria-label="Next month">
                <ChevronRightIcon />
              </Button>
            </div>
          </CardHeader>
          <MonthHeatmap {...sampleMonth} />
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div className="grid gap-0.5">
              <p className="type-eyebrow text-primary-soft-foreground">Today</p>
              <CardTitle className="type-h2">16 October</CardTitle>
              <CardDescription>
                {sampleToday.done} of {sampleToday.total} commitments
              </CardDescription>
            </div>
          </CardHeader>
          <LinearProgress value={sampleToday.percent} label="Completed on 16 October" size="sm" />
          <ul className="grid gap-3 pt-2">
            {active.map((commitment) => (
              <li key={commitment.id} className="flex items-center gap-3 type-small">
                {commitment.doneToday ? (
                  <CircleCheckIcon aria-hidden className="size-5 fill-primary text-card" />
                ) : (
                  <CircleIcon aria-hidden className="size-5 text-input" strokeWidth={1.75} />
                )}
                <span className="flex-1 font-medium">{commitment.title}</span>
                <span className="sr-only">{commitment.doneToday ? "done" : "not done"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
