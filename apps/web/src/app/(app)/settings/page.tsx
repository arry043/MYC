import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Card } from "@/components/ui/card";

import { AccountSecuritySection } from "./_components/account-security-section";
import { NotificationSettingsSection } from "./_components/notification-settings-section";

export const metadata: Metadata = { title: "Settings" };

/** Heading and description on the left, controls on the right (stacked on phones). */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="type-h3">{title}</h2>
        <p className="type-small text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-5">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Make MYC work for you"
        description="Your reminders, app preferences, and account security."
      />

      <div className="grid gap-stack">
        {/* Interactive Reminders & Notifications Section */}
        <NotificationSettingsSection />

        {/* App & Installation Section */}
        <SettingsSection
          title="App & Installation"
          description="Install MYC to your desktop or mobile home screen for a fast, standalone app experience."
        >
          <InstallPrompt />
        </SettingsSection>

        {/* Real Account & Security Section wrapped in Suspense for useSearchParams */}
        <Suspense
          fallback={
            <Card className="gap-6 p-card shadow-raised">
              <div className="grid gap-2">
                <h2 className="type-h3">Account & Security</h2>
                <p className="type-small text-muted-foreground">
                  Loading account security settings...
                </p>
              </div>
            </Card>
          }
        >
          <AccountSecuritySection />
        </Suspense>
      </div>
    </>
  );
}
