import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, CalendarCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Simple owner conversion block: "Have a Space to Rent or Sell?".
 * Reuses the existing upload flow — no duplicate listing system.
 */
export function OwnerCta({ className, source }: { className?: string; source: string }) {
  const { t } = useI18n();
  const trust = [
    { icon: ShieldCheck, label: t("convert.trust.verifiedSpaces") },
    { icon: BadgeCheck, label: t("convert.trust.verifiedPeople") },
    { icon: CalendarCheck, label: t("convert.trust.viewings") },
    { icon: Building2, label: t("convert.trust.secure") },
  ];
  return (
    <section className={cn("container-page py-12", className)}>
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-secondary/40 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">
            {t("convert.owner.title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("convert.owner.body")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {trust.map((it) => (
              <li key={it.label} className="inline-flex items-center gap-1.5">
                <it.icon className="h-3.5 w-3.5 text-primary" /> {it.label}
              </li>
            ))}
          </ul>
        </div>
        <Link to="/upload" onClick={() => track("list_space_clicked", { source })} className="shrink-0">
          <Button size="lg" className="h-12 w-full md:w-auto">{t("convert.listSpace")}</Button>
        </Link>
      </div>
    </section>
  );
}
