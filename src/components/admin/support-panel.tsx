import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, LifeBuoy, Plus, RefreshCw, Search, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/ds/stat-card";
import { EmptyState } from "@/components/ds/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/hooks/use-i18n";
import { TicketThread, TicketStatusBadge, TicketPriorityBadge } from "@/components/support/ticket-thread";
import {
  assignToMe, deleteFaq, fetchSupportStats, listAllFaqs, listAllTickets, saveFaq, setFaqPublished,
  updateTicket, SUPPORT_CATEGORIES,
  type SupportFaq, type SupportPriority, type SupportStats, type SupportStatus, type SupportTicket,
} from "@/lib/support-db";
import { logAdminAction } from "@/lib/admin-ops";
import { toast } from "sonner";

const STATUSES: SupportStatus[] = ["open", "in_progress", "waiting_user", "resolved", "closed"];
const PRIORITIES: SupportPriority[] = ["normal", "high", "urgent"];

export function SupportPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"tickets" | "faq">("tickets");
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SupportStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<SupportTicket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, rows] = await Promise.all([
      fetchSupportStats(),
      listAllTickets({ status, category, search }),
    ]);
    setStats(s);
    setTickets(rows);
    setActive((cur) => (cur ? rows.find((r) => r.id === cur.id) ?? cur : null));
    setLoading(false);
  }, [status, category, search]);

  useEffect(() => { void load(); }, [load]);

  async function patch(ticket: SupportTicket, p: Parameters<typeof updateTicket>[1], action: string) {
    const res = await updateTicket(ticket.id, p);
    if (!res.ok) { toast.error(t("support.form.failed")); return; }
    await logAdminAction({
      action,
      targetType: "support_ticket",
      targetId: ticket.id,
      targetLabel: ticket.reference,
      meta: p as Record<string, unknown>,
    });
    toast.success(t("support.admin.updated"));
    void load();
  }

  return (
    <>
      <PageHeader
        kicker={t("admin.kicker.operations")}
        title={t("admin.support.title")}
        subtitle={t("admin.support.sub")}
        actions={
          <Button size="sm" className="gap-2" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> {t("admin.action.refresh")}
          </Button>
        }
      />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label={t("support.stats.open")} value={String(stats.open)} tone="brand" icon={LifeBuoy} />
          <StatCard label={t("support.stats.high")} value={String(stats.highPriority)} tone="danger" icon={LifeBuoy} />
          <StatCard label={t("support.stats.waiting")} value={String(stats.waitingUser)} tone="gold" icon={LifeBuoy} />
          <StatCard label={t("support.stats.resolvedToday")} value={String(stats.resolvedToday)} tone="success" icon={LifeBuoy} />
        </div>
      )}

      <div className="mb-5 flex gap-2">
        {(["tickets", "faq"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t(`support.admin.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "faq" ? (
        <FaqManager />
      ) : active ? (
        <section className="ds-card space-y-4 p-4 sm:p-5">
          <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => setActive(null)}>
            <ChevronLeft className="h-4 w-4" /> {t("support.action.back")}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{active.reference}</span>
            <TicketStatusBadge status={active.status} />
            <TicketPriorityBadge priority={active.priority} />
            <Badge variant="outline">{t(`support.cat.${active.category}`)}</Badge>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{active.subject}</h2>
            <p className="text-xs text-muted-foreground">
              {active.userName ?? t("support.admin.user")} · {new Date(active.createdAt).toLocaleString()}
              {active.propertyTitle ? ` · ${active.propertyTitle}` : ""}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={active.status} onValueChange={(v) => void patch(active, { status: v as SupportStatus }, "support_status")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`support.status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={active.priority} onValueChange={(v) => void patch(active, { priority: v as SupportPriority }, "support_priority")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`support.priority.${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={async () => {
                const res = await assignToMe(active.id);
                if (!res.ok) { toast.error(t("support.form.failed")); return; }
                toast.success(t("support.admin.assigned"));
                void load();
              }}
            >
              {t("support.admin.assignMe")}
            </Button>
          </div>

          <TicketThread ticket={active} staff onChanged={load} />
        </section>
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("support.admin.searchPlaceholder")}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as SupportStatus | "all")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("support.admin.allStatuses")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`support.status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("support.admin.allCategories")}</SelectItem>
                {SUPPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`support.cat.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("support.loading")}</p>
          ) : tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title={t("support.admin.emptyTitle")} description={t("support.admin.emptyBody")} />
          ) : (
            <div className="space-y-3">
              {tickets.map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => setActive(tk)}
                  className="ds-card w-full p-4 text-left transition hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{tk.reference}</span>
                    <TicketStatusBadge status={tk.status} />
                    <TicketPriorityBadge priority={tk.priority} />
                    <Badge variant="outline">{t(`support.cat.${tk.category}`)}</Badge>
                  </div>
                  <p className="mt-1.5 font-medium">{tk.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tk.userName ?? t("support.admin.user")} · {new Date(tk.lastMessageAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- FAQ

function FaqManager() {
  const { t } = useI18n();
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SupportFaq> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFaqs(await listAllFaqs());
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!editing?.question?.trim() || !editing?.answer?.trim()) {
      toast.error(t("support.form.invalid"));
      return;
    }
    const res = await saveFaq({
      id: editing.id,
      category: editing.category ?? "account",
      question: editing.question,
      answer: editing.answer,
      questionSw: editing.questionSw ?? null,
      answerSw: editing.answerSw ?? null,
      published: editing.published ?? false,
      sortOrder: editing.sortOrder ?? 0,
    });
    if (!res.ok) { toast.error(t("support.form.failed")); return; }
    toast.success(t("support.admin.updated"));
    setEditing(null);
    void load();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="h-11 gap-2 rounded-full" onClick={() => setEditing({ category: "account", published: false })}>
          <Plus className="h-4 w-4" /> {t("support.faq.add")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("support.loading")}</p>
      ) : faqs.length === 0 ? (
        <EmptyState icon={LifeBuoy} title={t("support.faq.emptyTitle")} description={t("support.faq.emptyBody")} />
      ) : (
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="ds-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{t(`support.cat.${f.category}`)}</Badge>
                <Badge variant={f.published ? "success" : "muted"}>
                  {f.published ? t("support.faq.published") : t("support.faq.draft")}
                </Badge>
              </div>
              <p className="mt-2 font-medium">{f.question}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setEditing(f)}>
                  <Pencil className="h-3.5 w-3.5" /> {t("support.faq.edit")}
                </Button>
                <Button
                  size="sm" variant="outline" className="rounded-full"
                  onClick={async () => { await setFaqPublished(f.id, !f.published); void load(); }}
                >
                  {f.published ? t("support.faq.unpublish") : t("support.faq.publish")}
                </Button>
                <Button
                  size="sm" variant="ghost" className="gap-1.5 rounded-full text-destructive"
                  onClick={async () => { await deleteFaq(f.id); void load(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("support.faq.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("support.faq.formTitle")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("support.field.category")}</Label>
                <Select value={editing.category ?? "account"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`support.cat.${c}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("support.faq.question")}</Label>
                <Input className="h-11" value={editing.question ?? ""} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("support.faq.answer")}</Label>
                <Textarea rows={4} value={editing.answer ?? ""} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("support.faq.questionSw")}</Label>
                <Input className="h-11" value={editing.questionSw ?? ""} onChange={(e) => setEditing({ ...editing, questionSw: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("support.faq.answerSw")}</Label>
                <Textarea rows={4} value={editing.answerSw ?? ""} onChange={(e) => setEditing({ ...editing, answerSw: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2">
                <span className="text-sm">{t("support.faq.published")}</span>
                <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="h-11 rounded-full" onClick={() => setEditing(null)}>{t("support.action.cancel")}</Button>
            <Button className="h-11 rounded-full" onClick={() => void submit()}>{t("support.faq.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
