import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Flag, Loader2, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ds";
import { useI18n } from "@/hooks/use-i18n";
import {
  listBlockedUsers, listMyReports, unblockUser,
  type BlockedUser, type SafetyReport,
} from "@/lib/safety-db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/safety")({
  component: SafetyPage,
  head: () => ({
    meta: [
      { title: "Safety Center · SPACES" },
      { name: "description", content: "Track the reports you submitted and manage blocked users on SPACES." },
      { property: "og:title", content: "Safety Center · SPACES" },
      { property: "og:description", content: "Track your reports and manage blocked users on SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SafetyPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"reports" | "blocked">("reports");
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, b] = await Promise.all([listMyReports(), listBlockedUsers()]);
    setReports(r); setBlocked(b); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleUnblock(userId: string) {
    const res = await unblockUser(userId);
    if (!res.ok) { toast.error(t("safety.block.failed")); return; }
    toast.success(t("safety.block.unblockedShort"));
    void load();
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
        <header className="px-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t("safety.center.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("safety.center.subtitle")}</p>
        </header>

        <div className="flex gap-2">
          {(["reports", "blocked"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                tab === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "reports" ? t("safety.center.myReports") : t("safety.center.blockedUsers")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : tab === "reports" ? (
          reports.length === 0 ? (
            <EmptyState icon={ShieldCheck} title={t("safety.center.noReports")} description={t("safety.center.noReportsBody")} />
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Flag className="h-4 w-4 text-destructive" />
                    <span className="font-semibold">
                      {r.propertyTitle ?? r.reportedUserName ?? t("safety.report.titleMessage")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{r.reference}</span>
                    <Badge variant={r.status === "resolved" ? "success" : r.status === "dismissed" ? "muted" : "warning"}>
                      {t(`safety.status.${r.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`safety.reasons.${r.reason}`)}</p>
                  {r.resolution && <p className="mt-1 text-sm">{r.resolution}</p>}
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : blocked.length === 0 ? (
          <EmptyState icon={Ban} title={t("safety.center.noBlocked")} description={t("safety.center.noBlockedBody")} />
        ) : (
          <ul className="space-y-3">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-4">
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => void handleUnblock(b.blockedId)}>
                  {t("safety.block.unblockAction")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
