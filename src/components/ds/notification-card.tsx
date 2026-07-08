import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Bell } from "lucide-react";

type Props = {
  title: string;
  body?: string;
  time?: string;
  icon?: LucideIcon;
  unread?: boolean;
  tone?: "brand" | "success" | "warning" | "danger";
  onClick?: () => void;
  className?: string;
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  brand:   "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  success: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  warning: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]",
  danger:  "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
};

export function NotificationCard({
  title, body, time, icon: Icon = Bell, unread, tone = "brand", onClick, className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", TONE[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-semibold text-foreground">{title}</div>
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        {body && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{body}</p>}
        {time && <div className="mt-1 text-xs text-muted-foreground/80">{time}</div>}
      </div>
    </button>
  );
}
