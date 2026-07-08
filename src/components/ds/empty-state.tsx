import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
};

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: Props) {
  return (
    <div className={cn(
      "ds-card flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
      className,
    )}>
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
        <Icon className="h-7 w-7" />
      </div>
      <div className="max-w-sm">
        <div className="ds-h-sm">{title}</div>
        {description && <p className="ds-body mt-1.5 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <Button asChild size="lg" className="rounded-full"><a href={action.href}>{action.label}</a></Button>
        ) : (
          <Button size="lg" onClick={action.onClick} className="rounded-full">{action.label}</Button>
        )
      )}
    </div>
  );
}
