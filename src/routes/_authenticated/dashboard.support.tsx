import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, LifeBuoy, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import { useI18n } from "@/hooks/use-i18n";
import { NewTicketDialog } from "@/components/support/new-ticket-dialog";
import { TicketThread, TicketStatusBadge, TicketPriorityBadge } from "@/components/support/ticket-thread";
import { closeMyTicket, listMyTickets, type SupportTicket } from "@/lib/support-db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "My Support Requests · SPACES" },
      { name: "description", content: "Track your SPACES support requests, reply to the support team and close resolved tickets." },
      { property: "og:title", content: "My Support Requests · SPACES" },
      { property: "og:description", content: "Track and reply to your SPACES support requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SupportPage() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SupportTicket | null>(null);

  const load = useCallback(async () => {
    const rows = await listMyTickets();
    setTickets(rows);
    setActive((cur) => (cur ? rows.find((r) => r.id === cur.id) ?? null : null));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function close(id: string) {
    const res = await closeMyTicket(id);
    if (!res.ok) { toast.error(t("support.form.failed")); return; }
    toast.success(t("support.action.closed"));
    void load();
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t("support.my.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("support.my.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/help">
              <Button variant="outline" className="h-11 gap-2 rounded-full">
                <LifeBuoy className="h-4 w-4" /> {t("support.my.helpCenter")}
              </Button>
            </Link>
            <NewTicketDialog
              onCreated={load}
              trigger={
                <Button className="h-11 gap-2 rounded-full">
                  <Plus className="h-4 w-4" /> {t("support.my.new")}
                </Button>
              }
            />
          </div>
        </header>

        {active ? (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <button
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setActive(null)}
            >
              <ChevronLeft className="h-4 w-4" /> {t("support.action.back")}
            </button>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{active.reference}</span>
              <TicketStatusBadge status={active.status} />
              <TicketPriorityBadge priority={active.priority} />
            </div>
            <h2 className="font-display text-lg font-semibold">{active.subject}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t(`support.cat.${active.category}`)} · {new Date(active.createdAt).toLocaleDateString()}
            </p>
            <TicketThread ticket={active} onChanged={load} />
            {active.status !== "closed" && (
              <div className="mt-4 border-t border-border pt-3">
                <Button variant="outline" className="h-11 w-full rounded-full sm:w-auto" onClick={() => void close(active.id)}>
                  {t("support.action.close")}
                </Button>
              </div>
            )}
          </section>
        ) : loading ? (
          <p className="px-1 text-sm text-muted-foreground">{t("support.loading")}</p>
        ) : tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title={t("support.my.emptyTitle")} description={t("support.my.emptyBody")} />
        ) : (
          <div className="space-y-3">
            {tickets.map((tk) => (
              <button
                key={tk.id}
                onClick={() => setActive(tk)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{tk.reference}</span>
                  <TicketStatusBadge status={tk.status} />
                  <TicketPriorityBadge priority={tk.priority} />
                </div>
                <p className="mt-1.5 font-medium text-foreground">{tk.subject}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`support.cat.${tk.category}`)} · {t("support.my.lastUpdate")}: {new Date(tk.lastMessageAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
