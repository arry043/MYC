import { cn } from "cn";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  /** Primary page actions, aligned right on wider screens. */
  actions?: React.ReactNode;
  className?: string;
};

function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="grid gap-2">
        {eyebrow && <p className="type-eyebrow text-primary-soft-foreground">{eyebrow}</p>}
        <h1 className="type-h1 text-balance">{title}</h1>
        {description && (
          <p className="max-w-xl type-body text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}

/** Titled group of content within a page. */
function PageSection({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("grid gap-stack", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="type-h2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export { PageHeader, PageSection };
