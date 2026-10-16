import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldHint, Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export const metadata: Metadata = { title: "Settings" };

const timezones = [
  { value: "Asia/Kolkata", label: "India (GMT+5:30)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "America/New_York", label: "New York (GMT−4)" },
];

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
        description="Your profile, reminders and account."
      />

      <div className="grid gap-stack">
        <SettingsSection
          title="Profile"
          description="How MYC greets you, and the day boundary it uses."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" placeholder="Your name" autoComplete="name" />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" disabled />
              <FieldHint>Set when you create your account.</FieldHint>
            </Field>
          </div>
          <Field>
            <Label id="timezone-label">Timezone</Label>
            <Select items={timezones} defaultValue="Asia/Kolkata">
              <SelectTrigger aria-labelledby="timezone-label" className="sm:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHint>Your day starts and ends at midnight in this timezone.</FieldHint>
          </Field>
        </SettingsSection>

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

        <SettingsSection
          title="Account"
          description="Sign-in and data controls arrive with accounts."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-0.5">
              <p className="type-label">Delete account</p>
              <p className="type-small text-muted-foreground">
                Permanently removes your commitments and history.
              </p>
            </div>
            <Button variant="destructive" disabled>
              Delete account
            </Button>
          </div>
        </SettingsSection>

        <div className="flex justify-end gap-2.5 max-sm:flex-col-reverse">
          <Button variant="ghost">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </div>
    </>
  );
}
