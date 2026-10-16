import { cn } from "cn";
import { CircleCheckIcon, CloudOffIcon, SproutIcon, type LucideIcon } from "lucide-react";

type StateMessageProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Recovery or next-step action, usually a Button. */
  action?: React.ReactNode;
  role?: "status" | "alert";
  className?: string;
};

/** Centred icon, message and action. The base for the empty, error and success states. */
function StateMessage({
  title,
  description,
  icon: Icon = SproutIcon,
  iconClassName,
  action,
  role,
  className,
}: StateMessageProps) {
  return (
    <div
      role={role}
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-14 place-content-center rounded-2xl bg-primary-soft text-primary-soft-foreground",
          iconClassName,
        )}
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </span>
      <div className="grid gap-1.5">
        <h2 className="type-h2">{title}</h2>
        {description && <p className="type-body text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

type PresetProps = Omit<StateMessageProps, "role" | "iconClassName">;

/** Nothing here yet. Encouraging, never guilt-based. */
function EmptyState(props: PresetProps) {
  return <StateMessage icon={SproutIcon} {...props} />;
}

/** Something failed. Always pass an `action` so the user can recover. */
function ErrorState(props: PresetProps) {
  return (
    <StateMessage
      icon={CloudOffIcon}
      iconClassName="bg-destructive-soft text-destructive"
      role="alert"
      {...props}
    />
  );
}

function SuccessState(props: PresetProps) {
  return (
    <StateMessage
      icon={CircleCheckIcon}
      iconClassName="bg-success-soft text-success"
      role="status"
      {...props}
    />
  );
}

export { EmptyState, ErrorState, StateMessage, SuccessState };
