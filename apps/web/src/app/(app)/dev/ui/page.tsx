import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";

import { Gallery } from "./_components/gallery";

export const metadata: Metadata = { title: "Design system" };

/** Development-only gallery of every design-system component and state. 404 in production. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <>
      <PageHeader
        eyebrow="Development"
        title="Design system"
        description="Every MYC component and state in one place. Not part of the production app."
      />
      <Gallery />
    </>
  );
}
