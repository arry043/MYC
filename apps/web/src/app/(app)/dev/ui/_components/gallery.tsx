"use client";

import { InfoIcon, PlusIcon, RotateCwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { PageLoading, SkeletonCard, SkeletonList } from "@/components/feedback/loading";
import { EmptyState, ErrorState, SuccessState } from "@/components/feedback/state-message";
import { PageSection } from "@/components/layout/page-header";
import { LinearProgress } from "@/components/progress/linear-progress";
import { MetricIndicator } from "@/components/progress/metric-indicator";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldHint, Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

const swatches = [
  ["Primary", "bg-primary"],
  ["Primary soft", "bg-primary-soft"],
  ["Background", "bg-background border"],
  ["Card", "bg-card border"],
  ["Lavender", "bg-lavender"],
  ["Peach", "bg-peach"],
  ["Mint", "bg-mint"],
  ["Sun", "bg-sun"],
  ["Sky 1–4", "bg-linear-to-r from-sky-1 via-sky-3 to-sky-4"],
] as const;

const typeScale = [
  ["type-display", "Display"],
  ["type-h1", "Heading 1"],
  ["type-h2", "Heading 2"],
  ["type-h3", "Heading 3"],
  ["type-body", "Body: comfortable reading text for descriptions."],
  ["type-small", "Small: secondary information."],
  ["type-caption", "Caption: metadata and chart labels."],
  ["type-label", "Label: form and control labels"],
  ["type-eyebrow", "Eyebrow"],
] as const;

const views = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
] as const;

const frequencies = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
];

export function Gallery() {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<(typeof views)[number]["value"]>("month");

  return (
    <div className="grid gap-section">
      <PageSection title="Colour">
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map(([name, className]) => (
            <div key={name} className="grid gap-2">
              <span className={`h-14 rounded-xl ${className}`} />
              <span className="type-caption font-semibold text-muted-foreground">{name}</span>
            </div>
          ))}
        </Card>
      </PageSection>

      <PageSection title="Typography">
        <Card className="gap-4">
          {typeScale.map(([className, sample]) => (
            <div key={className} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-baseline">
              <code className="type-caption text-muted-foreground">{className}</code>
              <p className={className}>{sample}</p>
            </div>
          ))}
        </Card>
      </PageSection>

      <PageSection title="Buttons">
        <Card className="gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2Icon />
              Destructive
            </Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <PlusIcon />
            </Button>
            <Button size="icon" variant="secondary" aria-label="Retry">
              <RotateCwIcon />
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
            >
              {loading ? "Saving…" : "Click to load"}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
      </PageSection>

      <PageSection title="Inputs">
        <Card className="grid gap-5 md:grid-cols-2">
          <Field>
            <Label htmlFor="g-title">Commitment title</Label>
            <Input id="g-title" placeholder="e.g. DSA practice" />
            <FieldHint>Keep it short and specific.</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="g-search">Search</Label>
            <SearchInput id="g-search" placeholder="Search commitments" />
          </Field>
          <Field>
            <Label htmlFor="g-invalid">Invalid field</Label>
            <Input id="g-invalid" aria-invalid defaultValue="Too long a title for a commitment" />
            <FieldHint className="text-destructive">Use 40 characters or fewer.</FieldHint>
          </Field>
          <Field>
            <Label id="g-frequency">Frequency</Label>
            <Select items={frequencies} defaultValue="daily">
              <SelectTrigger aria-labelledby="g-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="md:col-span-2">
            <Label htmlFor="g-notes">Why it matters</Label>
            <Textarea id="g-notes" placeholder="A sentence to remind future you." />
          </Field>
          <div className="flex flex-wrap items-center gap-6 md:col-span-2">
            <Label>
              <Checkbox defaultChecked />
              Checked
            </Label>
            <Label>
              <Checkbox />
              Unchecked
            </Label>
            <Label>
              <Switch defaultChecked />
              Toggle
            </Label>
            <SegmentedControl
              options={views}
              value={view}
              onValueChange={setView}
              aria-label="Calendar view"
            />
          </div>
        </Card>
      </PageSection>

      <PageSection title="Cards and badges">
        <div className="grid gap-stack sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardTitle>Base card</CardTitle>
            <CardDescription>White surface, hairline border, raised shadow.</CardDescription>
          </Card>
          <Card interactive tabIndex={0}>
            <CardTitle>Interactive card</CardTitle>
            <CardDescription>Lifts on hover, focusable.</CardDescription>
          </Card>
          <Card tone="mint">
            <CardTitle>Tinted card</CardTitle>
            <CardDescription className="text-foreground/70">
              For secondary emphasis.
            </CardDescription>
          </Card>
          <Card tone="dashed" className="items-center justify-center text-center">
            <CardDescription>Empty card</CardDescription>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">
            <StatusDot />
            Active
          </Badge>
          <Badge>
            <StatusDot />
            Paused
          </Badge>
          <Badge tone="sky">Every day</Badge>
          <Badge tone="lavender">Weekdays</Badge>
          <Badge tone="warning">Due soon</Badge>
          <Badge tone="outline">Archived</Badge>
        </div>
      </PageSection>

      <PageSection title="Progress">
        <Card className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <ProgressRing value={80} label="Sample progress" />
          <div className="grid gap-5">
            <LinearProgress value={80} label="Linear progress" showLabel />
            <LinearProgress value={45} label="Small" showLabel size="sm" />
            <div className="flex gap-4">
              <MetricIndicator trend="up">+6% this week</MetricIndicator>
              <MetricIndicator trend="down">−3% this week</MetricIndicator>
              <MetricIndicator trend="flat">No change</MetricIndicator>
            </div>
          </div>
        </Card>
      </PageSection>

      <PageSection title="Feedback">
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info">
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>Reminders use your local timezone.</AlertDescription>
          </Alert>
          <Alert tone="success">
            <AlertTitle>All done for today</AlertTitle>
            <AlertDescription>Every commitment is complete.</AlertDescription>
          </Alert>
          <Alert tone="warning">
            <AlertTitle>You&apos;re offline</AlertTitle>
            <AlertDescription>Changes will sync when you reconnect.</AlertDescription>
          </Alert>
          <Alert tone="destructive">
            <AlertTitle>Couldn&apos;t save</AlertTitle>
            <AlertDescription>Check your connection and try again.</AlertDescription>
          </Alert>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Commitment saved", tone: "success" })}
          >
            Success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: "Reminder set", description: "We'll nudge you at 8:00 PM." })
            }
          >
            Info toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Couldn't connect",
                description: "Check your connection and try again.",
                tone: "error",
              })
            }
          >
            Error toast
          </Button>
        </div>
        <div className="grid gap-stack lg:grid-cols-3">
          <Card>
            <EmptyState
              title="No commitments yet"
              description="Your consistency journey starts when you create your first commitment."
              action={
                <Button>
                  <PlusIcon />
                  Create commitment
                </Button>
              }
            />
          </Card>
          <Card>
            <ErrorState
              title="Something went wrong"
              description="We couldn't load this section."
              action={
                <Button variant="secondary">
                  <RotateCwIcon />
                  Try again
                </Button>
              }
            />
          </Card>
          <Card>
            <SuccessState
              title="You showed up today"
              description="Every commitment is done. See you tomorrow."
            />
          </Card>
        </div>
      </PageSection>

      <PageSection title="Overlays">
        <Card className="flex-row flex-wrap gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="secondary" />}>Open dialog</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pause this commitment?</DialogTitle>
                <DialogDescription>
                  Your history stays. You can resume whenever you&apos;re ready.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                <DialogClose render={<Button />}>Pause</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="secondary" />}>
              Open dropdown
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Pause</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2Icon />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger render={<Button variant="secondary" />}>
              <InfoIcon />
              Open popover
            </PopoverTrigger>
            <PopoverContent>
              <PopoverTitle>What is a consistent day?</PopoverTitle>
              <PopoverDescription>
                A day where you completed what you committed to.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </Card>
      </PageSection>

      <PageSection title="Loading">
        <div className="grid gap-stack md:grid-cols-2">
          <SkeletonCard />
          <SkeletonList rows={3} />
        </div>
        <Card>
          <PageLoading />
        </Card>
      </PageSection>
    </div>
  );
}
