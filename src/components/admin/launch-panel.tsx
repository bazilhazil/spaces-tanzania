import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Home, MessageSquare, Calendar, Briefcase, ShieldCheck, Star, Bell,
  CreditCard, BarChart3, Settings, RefreshCw, ArrowRight, CheckCircle2,
  AlertTriangle, Clock, Activity, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/admin/panels";
import { cn } from "@/lib/utils";
import { sendAdminTestEmail } from "@/lib/emails.functions";
import { fetchLaunchReport, type LaunchReport, type ReadyState, type HealthState } from "@/lib/launch-db";
import {
  fetchLaunchReadiness,
  LAUNCH_STATUS_LABEL,
  type LaunchReadiness,
  type LaunchStatus,
} from "@/lib/launch-readiness";


const STATE_LABEL: Record<ReadyState, string> = {
  ready: "READY",
  pending: "PENDING",
  action: "ACTION REQUIRED",
};

const STATE_TONE: Record<ReadyState, string> = {
  ready: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  pending: "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]",
  action: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
};

const STATE_ICON: Record<ReadyState, React.ComponentType<{ className?: string }>> = {
  ready: CheckCircle2,
  pending: Clock,
  action: AlertTriangle,
};

const DOT: Record<HealthState, string> = {
  green: "bg-[color:var(--color-success-500)]",
  yellow: "bg-[color:var(--color-gold-500)]",
  red: "bg-[color:var(--color-danger-500)]",
};

const QUICK: { label: string; icon: React.ComponentType<{ className?: string }>; section?: string; to?: string }[] = [
  { label: "Manage Users", icon: Users, section: "users" },
  { label: "Manage Properties", icon: Home, section: "properties" },
  { label: "Manage Leads", icon: MessageSquare, section: "leads" },
  { label: "Viewing Requests", icon: Calendar, section: "viewings" },
  { label: "Manage Deals", icon: Briefcase, section: "deals" },
  { label: "Manage Payments", icon: CreditCard, section: "payments" },
  { label: "Manage Reviews", icon: Star, section: "reviews" },
  { label: "Verification", icon: ShieldCheck, section: "verification" },
  { label: "Notifications", icon: Bell, section: "notifications" },
  { label: "Business Intelligence", icon: BarChart3, to: "/business-intelligence" },
  { label: "Platform Settings", icon: Settings, section: "settings" },
];

function relative(iso: string) {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ds-card mb-6 p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function LaunchPanel() {
  const [report, setReport] = useState<LaunchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLaunchReport()
      .then((r) => { if (alive) setReport(r); })
      .catch(() => { if (alive) setReport(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const [testing, setTesting] = useState(false);
  const sendTest = useCallback(async () => {
    setTesting(true);
    try {
      const result = await sendAdminTestEmail();
      if (result?.ok) {
        toast.success(`Test email sent to ${result.to}. Check your inbox.`);
        setNonce((n) => n + 1);
      } else if (result?.reason === "not_allowed") {
        toast.error("You don't have permission to do this.");
      } else if (result?.reason === "no_recipient") {
        toast.error("Add an email address to your admin profile first.");
      } else {
        toast.error("The test email could not be sent. Please try again.");
      }
    } catch {
      toast.error("The test email could not be sent. Please try again.");
    } finally {
      setTesting(false);
    }
  }, []);

  const ready = report?.checklist.filter((c) => c.state === "ready").length ?? 0;
  const total = report?.checklist.length ?? 0;

  return (
    <>
      <PageHeader
        kicker="Operations"
        title="Launch & Operations Center"
        subtitle="Live readiness, platform health and the work waiting for your attention."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={sendTest} disabled={testing}>
              <Mail className="h-4 w-4" /> {testing ? "Sending…" : "Send test email"}
            </Button>
            <Button size="sm" className="gap-2" onClick={reload}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />


      {loading && !report ? (
        <p className="text-sm text-muted-foreground">Loading live status…</p>
      ) : !report ? (
        <EmptyState
          icon={AlertTriangle}
          title="Status unavailable"
          description="We couldn't read the platform status just now. Please try again."
        />
      ) : (
        <>
          <Section
            title="Launch checklist"
            subtitle="Only verified checks are marked ready."
            right={<Badge variant="muted" className="shrink-0">{ready}/{total} ready</Badge>}
          >
            <ul className="grid gap-2 sm:grid-cols-2">
              {report.checklist.map((item) => {
                const Icon = STATE_ICON[item.state];
                const body = (
                  <div className="flex w-full items-start gap-3 rounded-xl border border-border/50 p-3">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", STATE_TONE[item.state])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="break-words text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide", STATE_TONE[item.state])}>
                      {STATE_LABEL[item.state]}
                    </span>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.section ? (
                      <Link to="/admin/$section" params={{ section: item.section }} className="block transition-opacity hover:opacity-80">
                        {body}
                      </Link>
                    ) : body}
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Platform health" subtitle="Green means verified, yellow needs configuration, red means unavailable.">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {report.health.map((h) => (
                <li key={h.id} className="flex items-start gap-2.5 rounded-xl border border-border/50 p-3">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT[h.state])} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.label}</p>
                    <p className="break-words text-xs text-muted-foreground">{h.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Needs your attention">
            {report.pending.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All clear" description="Nothing is waiting for an administrator right now." />
            ) : (
              <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
                {report.pending.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <Badge variant="warning" className="shrink-0">{p.count}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{p.label}</span>
                    <Button size="sm" variant="outline" className="shrink-0 gap-1" asChild>
                      <Link to="/admin/$section" params={{ section: p.section }}>
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Quick actions">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {QUICK.map((q) => {
                const Icon = q.icon;
                const inner = (
                  <span className="flex items-center gap-2 rounded-xl border border-border/50 p-3 text-sm font-medium transition-colors hover:bg-accent">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{q.label}</span>
                  </span>
                );
                return q.section ? (
                  <Link key={q.label} to="/admin/$section" params={{ section: q.section }}>{inner}</Link>
                ) : (
                  <Link key={q.label} to={q.to as "/business-intelligence"}>{inner}</Link>
                );
              })}
            </div>
          </Section>

          <Section title="Recent platform activity">
            {report.activity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" description="Sign-ups, listings, leads and payments will appear here." />
            ) : (
              <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
                {report.activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 p-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{a.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relative(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </>
  );
}
