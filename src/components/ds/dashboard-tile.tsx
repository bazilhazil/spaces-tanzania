import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  accent?: "brand" | "gold";
  className?: string;
};

export function DashboardTile({ title, description, icon: Icon, onClick, href, accent = "brand", className }: Props) {
  const cls = cn(
    "ds-card ds-card-hover ds-press group flex flex-col justify-between gap-6 p-5 text-left",
    className,
  );
  const inner = (
    <>
      <div className={cn(
        "grid h-12 w-12 place-items-center rounded-2xl",
        accent === "gold"
          ? "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]"
          : "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="ds-h-sm">{title}</div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        {description && <p className="ds-body mt-1 text-muted-foreground">{description}</p>}
      </div>
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}
