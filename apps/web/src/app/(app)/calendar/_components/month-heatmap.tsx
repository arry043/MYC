import { cn } from "cn";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Sequential scale: one hue, light → dark. Index = intensity level. */
const levelClass = ["bg-track", "bg-sky-1", "bg-sky-2", "bg-sky-3", "bg-sky-4"];
const levelText = [
  "no commitments done",
  "a few commitments done",
  "about half done",
  "most commitments done",
  "every commitment done",
];

type MonthHeatmapProps = {
  title: string;
  leadingBlanks: number;
  today: number;
  /** One entry per day of the month; null for days not reached yet. */
  levels: readonly (number | null)[];
};

/** Month of days shaded by how much was completed. Static in task 03. */
function MonthHeatmap({ title, leadingBlanks, today, levels }: MonthHeatmapProps) {
  return (
    <figure className="grid gap-4">
      <figcaption className="sr-only">{title} consistency</figcaption>
      <div aria-hidden className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {weekdays.map((day) => (
          <span key={day} className="text-center type-caption font-semibold text-muted-foreground">
            <span className="sm:hidden">{day[0]}</span>
            <span className="max-sm:hidden">{day}</span>
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <li key={`blank-${index}`} aria-hidden />
        ))}
        {levels.map((level, index) => {
          const day = index + 1;
          const isToday = day === today;
          const future = level === null;
          return (
            <li
              key={day}
              className={cn(
                "group/day relative flex aspect-square items-start justify-start rounded-lg p-1.5 type-caption font-semibold tabular-nums sm:rounded-xl sm:p-2",
                future
                  ? "border border-dashed border-border text-muted-foreground/60"
                  : levelClass[level],
                !future && (level === 4 ? "text-white" : "text-foreground/75"),
                isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
            >
              <span aria-hidden>{day}</span>
              <span className="sr-only">
                {day} {title.split(" ")[0]}
                {isToday && ", today"}: {future ? "upcoming" : levelText[level]}
              </span>
              {!future && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 type-caption whitespace-nowrap text-background opacity-0 transition-opacity duration-150 group-hover/day:opacity-100 max-sm:hidden"
                >
                  {levelText[level]}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-end gap-2 type-caption text-muted-foreground">
        <span>Less</span>
        <span aria-hidden className="flex gap-1">
          {levelClass.map((className) => (
            <span key={className} className={cn("size-3.5 rounded-[4px]", className)} />
          ))}
        </span>
        <span>More</span>
      </div>
    </figure>
  );
}

export { MonthHeatmap };
