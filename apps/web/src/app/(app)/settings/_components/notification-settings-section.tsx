"use client";

import { useEffect, useState } from "react";

import type { NotificationPreferences } from "@myc/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@myc/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const reminderTimes = [
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:30", label: "9:30 PM" },
  { value: "22:00", label: "10:00 PM" },
];

export function NotificationSettingsSection() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    const loadData = async () => {
      if (typeof window !== "undefined") {
        setPermissionStatus("Notification" in window ? Notification.permission : "unsupported");
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else if (!error) {
        // Create initial default row
        const { data: inserted } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...DEFAULT_NOTIFICATION_PREFERENCES,
          })
          .select()
          .single();

        if (inserted) {
          setPreferences(inserted as NotificationPreferences);
        }
      }
      setLoading(false);
    };

    void loadData();
  }, []);

  const handleUpdate = async (patch: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    const previous = preferences;
    const next = { ...preferences, ...patch };
    setPreferences(next);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }

      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated.",
        tone: "success",
      });
    } catch (err: unknown) {
      setPreferences(previous);
      toast({
        title: "Could not save preferences",
        description: err instanceof Error ? err.message : "An error occurred",
        tone: "error",
      });
    }
  };

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
      if (res === "granted") {
        toast({
          title: "Browser alerts allowed",
          description: "You will receive reminders when this app is open in your browser.",
          tone: "success",
        });
      } else if (res === "denied") {
        toast({
          title: "Alerts blocked",
          description: "Notifications are blocked in your browser settings for this site.",
          tone: "info",
        });
      }
    } catch (e) {
      console.warn("Could not request notification permission:", e);
    }
  };

  const isMasterEnabled = Boolean(preferences?.enabled);
  const dailyEnabled = Boolean(preferences?.daily_reminder_enabled);
  const dailyTime = preferences?.daily_reminder_time || "09:00";
  const incompleteEnabled = Boolean(preferences?.incomplete_reminder_enabled);
  const incompleteTime = preferences?.incomplete_reminder_time || "20:00";
  const streakEnabled = Boolean(preferences?.streak_reminder_enabled);

  return (
    <Card className="gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="type-h3">Reminders</h2>
        <p className="type-small text-muted-foreground">
          Gentle nudges, never spam. Turn off anything you don&apos;t need.
        </p>
      </div>

      <div className="grid gap-5">
        {/* Master Toggle */}
        <div className="flex items-start justify-between gap-6">
          <div className="grid gap-0.5">
            <p id="master-reminder-label" className="type-label font-medium">
              Allow reminders
            </p>
            <p className="type-small text-muted-foreground">
              Consistency check-ins across your web and mobile devices.
            </p>
          </div>
          <Switch
            id="master-reminder"
            aria-labelledby="master-reminder-label"
            checked={isMasterEnabled}
            onCheckedChange={(val) => void handleUpdate({ enabled: val })}
            disabled={loading}
            className="mt-0.5"
          />
        </div>

        {/* Browser notification permission row */}
        {permissionStatus !== "unsupported" && isMasterEnabled && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2.5">
              {permissionStatus === "granted" ? (
                <Badge tone="success">Browser alerts allowed</Badge>
              ) : permissionStatus === "denied" ? (
                <Badge tone="outline">Browser alerts blocked</Badge>
              ) : (
                <span className="type-small text-muted-foreground">
                  Allow browser notifications for this device
                </span>
              )}
            </div>
            {permissionStatus === "default" && (
              <Button size="sm" variant="secondary" onClick={handleRequestPermission}>
                Enable in browser
              </Button>
            )}
          </div>
        )}

        {isMasterEnabled && (
          <>
            <Separator />

            {/* Daily check-in */}
            <div className="flex items-start justify-between gap-6">
              <div className="grid gap-0.5">
                <p id="daily-reminder-label" className="type-label">
                  Daily reminder
                </p>
                <p className="type-small text-muted-foreground">
                  A short note at the time you choose.
                </p>
              </div>
              <Switch
                id="daily-reminder"
                aria-labelledby="daily-reminder-label"
                checked={dailyEnabled}
                onCheckedChange={(val) => void handleUpdate({ daily_reminder_enabled: val })}
                className="mt-0.5"
              />
            </div>

            {dailyEnabled && (
              <Field>
                <Label id="daily-time-label">Check-in time</Label>
                <Select
                  items={reminderTimes}
                  value={dailyTime}
                  onValueChange={(val) => {
                    if (val) void handleUpdate({ daily_reminder_time: val });
                  }}
                >
                  <SelectTrigger aria-labelledby="daily-time-label" className="sm:max-w-xs">
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
            )}

            <Separator />

            {/* Incomplete commitments */}
            <div className="flex items-start justify-between gap-6">
              <div className="grid gap-0.5">
                <p id="unfinished-reminder-label" className="type-label">
                  Unfinished commitments
                </p>
                <p className="type-small text-muted-foreground">
                  Only if something is still open late in the day.
                </p>
              </div>
              <Switch
                id="unfinished-reminder"
                aria-labelledby="unfinished-reminder-label"
                checked={incompleteEnabled}
                onCheckedChange={(val) => void handleUpdate({ incomplete_reminder_enabled: val })}
                className="mt-0.5"
              />
            </div>

            {incompleteEnabled && (
              <Field>
                <Label id="incomplete-time-label">Evening reminder time</Label>
                <Select
                  items={reminderTimes}
                  value={incompleteTime}
                  onValueChange={(val) => {
                    if (val) void handleUpdate({ incomplete_reminder_time: val });
                  }}
                >
                  <SelectTrigger aria-labelledby="incomplete-time-label" className="sm:max-w-xs">
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
            )}

            <Separator />

            {/* Streak encouragement */}
            <div className="flex items-start justify-between gap-6">
              <div className="grid gap-0.5">
                <p id="streak-reminder-label" className="type-label">
                  Streak encouragement
                </p>
                <p className="type-small text-muted-foreground">
                  Supportive momentum reminders when you have open commitments.
                </p>
              </div>
              <Switch
                id="streak-reminder"
                aria-labelledby="streak-reminder-label"
                checked={streakEnabled}
                onCheckedChange={(val) => void handleUpdate({ streak_reminder_enabled: val })}
                className="mt-0.5"
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
