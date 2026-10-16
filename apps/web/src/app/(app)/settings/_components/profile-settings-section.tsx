"use client";

import { useEffect, useState } from "react";

import { isValidTimezone } from "@myc/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const COMMON_TIMEZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (Asia/Kolkata, GMT+5:30)" },
  { value: "America/New_York", label: "Eastern Time (America/New_York, GMT-4/5)" },
  { value: "America/Chicago", label: "Central Time (America/Chicago, GMT-5/6)" },
  { value: "America/Denver", label: "Mountain Time (America/Denver, GMT-6/7)" },
  { value: "America/Los_Angeles", label: "Pacific Time (America/Los_Angeles, GMT-7/8)" },
  { value: "Europe/London", label: "Greenwich / BST (Europe/London, GMT+0/1)" },
  { value: "Europe/Paris", label: "Central European (Europe/Paris, GMT+1/2)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Asia/Dubai, GMT+4)" },
  { value: "Asia/Singapore", label: "Singapore / HK (Asia/Singapore, GMT+8)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Asia/Tokyo, GMT+9)" },
  { value: "Australia/Sydney", label: "Australian Eastern (Australia/Sydney, GMT+10/11)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

export function ProfileSettingsSection() {
  const [email, setEmail] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [initialTimezone, setInitialTimezone] = useState<string>("UTC");
  const [mycStartedAt, setMycStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      // Detect browser timezone if needed
      let detectedTimezone = "UTC";
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz && isValidTimezone(browserTz)) {
          detectedTimezone = browserTz;
        }
      } catch {
        // Fallback to UTC
      }

      // Ensure profile exists idempotently
      const { data: profile } = await supabase.rpc("ensure_profile", {
        detected_timezone: detectedTimezone,
      });

      if (profile) {
        setTimezone(profile.timezone || detectedTimezone);
        setInitialTimezone(profile.timezone || detectedTimezone);
        setMycStartedAt(profile.myc_started_at);
      } else {
        setTimezone(detectedTimezone);
        setInitialTimezone(detectedTimezone);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!isValidTimezone(timezone)) {
      setError("Please select a valid IANA timezone identifier");
      return;
    }

    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to update your profile");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ timezone, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      toast({
        title: "Could not update timezone",
        description: updateError.message,
        tone: "error",
      });
      return;
    }

    setInitialTimezone(timezone);
    toast({
      title: "Timezone updated",
      description: `Your MYC day boundary is now set to ${timezone}.`,
      tone: "success",
    });
  };

  const handleCancel = () => {
    setTimezone(initialTimezone);
    setError(null);
  };

  const isDirty = timezone !== initialTimezone;

  // Ensure current timezone is present in selection options
  const timezoneOptions = COMMON_TIMEZONES.some((tz) => tz.value === timezone)
    ? COMMON_TIMEZONES
    : [{ value: timezone, label: `${timezone} (Detected)` }, ...COMMON_TIMEZONES];

  return (
    <Card className="gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="type-h3">Profile</h2>
        <p className="type-small text-muted-foreground">
          Your account identity and the day boundary MYC uses.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" value={email} disabled />
            <FieldHint>Managed in Account & Security below.</FieldHint>
          </Field>

          <Field>
            <Label htmlFor="myc-journey-status">MYC Journey</Label>
            <Input
              id="myc-journey-status"
              value={mycStartedAt ? `Started on ${mycStartedAt}` : "Not started yet"}
              disabled
            />
            <FieldHint>
              {mycStartedAt
                ? "Your consistency journey is active."
                : 'Starts officially upon confirming "I COMMIT".'}
            </FieldHint>
          </Field>
        </div>

        <Field>
          <Label id="profile-timezone-label">Timezone</Label>
          <Select
            items={timezoneOptions}
            value={timezone}
            onValueChange={(val) => {
              if (val) setTimezone(val);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger aria-labelledby="profile-timezone-label" className="sm:max-w-md">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((zone) => (
                <SelectItem key={zone.value} value={zone.value}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>
            Your day starts and ends at midnight in this timezone. Used for all daily completion and
            streak calculations.
          </FieldHint>
          {error && <FieldError>{error}</FieldError>}
        </Field>

        {isDirty && (
          <div className="flex justify-end gap-2.5 pt-2 max-sm:flex-col-reverse">
            <Button variant="ghost" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save timezone"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
