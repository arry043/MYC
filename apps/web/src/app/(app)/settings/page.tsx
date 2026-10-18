import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Card } from "@/components/ui/card";
import { Field, Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { AccountSecuritySection } from "./_components/account-security-section";

export const metadata: Metadata = { title: "Settings" };

const reminderTimes = [
  { value: "07:00", label: "7:00 AM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:30", label: "9:30 PM" },
];

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

function SwitchRow({
  id,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="grid gap-0.5">
        <p id={id} className="type-label">
          {label}
        </p>
        <p className="type-small text-muted-foreground">{hint}</p>
      </div>
      <Switch aria-labelledby={id} defaultChecked={defaultChecked} className="mt-0.5" />
    </div>
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
        <SettingsSection
          title="Reminders"
          description="Gentle nudges, never spam. Turn off anything you don't need."
        >
          <SwitchRow
            id="daily-reminder"
            label="Daily reminder"
            hint="A short note at the time you choose."
            defaultChecked
          />
          <Separator />
          <SwitchRow
            id="unfinished-reminder"
            label="Unfinished commitments"
            hint="Only if something is still open late in the day."
          />
          <Separator />
          <Field>
            <Label id="reminder-time-label">Reminder time</Label>
            <Select items={reminderTimes} defaultValue="20:00">
              <SelectTrigger aria-labelledby="reminder-time-label" className="sm:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderTimes.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </SettingsSection>

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
