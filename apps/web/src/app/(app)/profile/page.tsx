import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { ProfileDetailsSection } from "./_components/profile-details-section";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your profile & journey"
        description="Your identity, timezone, and consistency journey start date."
      />

      <div className="grid gap-stack">
        <ProfileDetailsSection />

        <Card className="flex flex-col gap-4 border-border/70 bg-card p-card shadow-raised sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="type-small font-bold text-foreground">
              Account Security &amp; Preferences
            </h3>
            <p className="type-caption text-muted-foreground">
              Manage your password, connected Google sign-in, reminders, and app installation.
            </p>
          </div>
          <Link href="/settings" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Open Settings
          </Link>
        </Card>
      </div>
    </>
  );
}
