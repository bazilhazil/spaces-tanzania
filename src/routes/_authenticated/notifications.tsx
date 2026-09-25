import { useI18n } from "@/hooks/use-i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ds/empty-state";
import {
  Bell, Check, Trash2, Search, Settings2, MailCheck, Smartphone, MessageCircle, BellRing,
  Users, Handshake, Calendar, CreditCard, ShieldCheck, Home, Megaphone, AlertTriangle, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { KIND_META, type NotificationKind } from "@/lib/notifications-store";
import { useNotifications, notificationLink } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotificationsDb, deleteNotification, isPropertyAlert, type DbNotification,
} from "@/lib/notifications-db";
import { useAuth } from "@/hooks/use-auth";
import { localizeNotifText } from "@/lib/notification-i18n";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SPACES" },
      { name: "description", content: "SPACES notification & communication center. Manage in-app, SMS, email, WhatsApp and push notifications." },
    ],
  }),
  component: NotificationsPage,
});

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  new_lead: Users, new_message: MessageCircle, new_inquiry: Users,
  viewing_request: Calendar, viewing_approved: Calendar, viewing_rejected: Calendar,
  deal_updated: Handshake, deal_completed: Handshake,
  subscription_purchased: CreditCard, subscription_expiring: CreditCard,
  payment_successful: CreditCard, payment_failed: AlertTriangle,
  verification_approved: ShieldCheck, verification_rejected: ShieldCheck,
  property_approved: Home, property_rejected: Home,
  announcement: Megaphone,
};

/** Kinds emitted by database triggers that the legacy meta map doesn't cover. */
const EXTRA_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  price_change: { label: "Price Change", icon: Megaphone },
  property_verified: { label: "Property Verified", icon: ShieldCheck },
  property_available: { label: "Space Available", icon: Home },
  saved_search_match: { label: "New Match", icon: Search },
  listing_queue: { label: "Space Awaiting Approval", icon: Home },
  listing_moderation: { label: "Listing Update", icon: Home },
  user_queue: { label: "New User", icon: Users },
  payment_queue: { label: "Payment Issue", icon: AlertTriangle },
};

/** Category buckets used by the notification filters. */
type NotifCategory = "properties" | "users" | "leads" | "viewings" | "verification" | "payments" | "reports" | "other";

const KIND_CATEGORY: Record<string, NotifCategory> = {
  listing_queue: "properties", listing_moderation: "properties",
  property_approved: "properties", property_rejected: "properties",
  property_verified: "properties", property_available: "properties",
  price_change: "properties", saved_search_match: "properties",
  user_queue: "users",
  new_lead: "leads", new_inquiry: "leads", new_message: "leads",
  viewing_request: "viewings", viewing_approved: "viewings", viewing_rejected: "viewings",
  verification_approved: "verification", verification_rejected: "verification",
  verification_submitted: "verification",
  payment_queue: "payments", payment_failed: "payments", payment_successful: "payments",
  subscription_purchased: "payments", subscription_expiring: "payments",
  report_new: "reports", report_update: "reports", report_resolved: "reports",
};

const URGENT_KINDS = new Set([
  "payment_queue", "payment_failed", "report_new", "report_update",
  "listing_queue", "viewing_request", "verification_rejected", "property_rejected",
]);

function categoryOf(kind: string): NotifCategory {
  return KIND_CATEGORY[kind] ?? "other";
}

function kindLabel(kind: string) {
  return EXTRA_META[kind]?.label ?? KIND_META[kind as NotificationKind]?.label ?? "Update";
}

const KIND_KEY: Record<string, string> = {
  new_message: "notifText.newMessage", viewing_requested: "notifText.newViewing", viewing_request: "notifText.newViewing",
  viewing_status: "notifText.kind_viewing", lead_created: "notifText.newInquiry", new_lead: "notifText.newInquiry", new_inquiry: "notifText.newInquiry",
  deal_created: "notifText.dealCreated", deal_stage: "notifText.kind_deal", verification: "notifUi.cat_verification",
  verification_status: "notifUi.cat_verification", verification_submitted: "notifUi.cat_verification", verification_queue: "notifUi.cat_verification",
  user_queue: "notifText.newUser", report_received: "notifUi.cat_reports", report_queue: "notifUi.cat_reports", report_status: "notifUi.cat_reports",
  review_invite: "notifText.kind_review", review_status: "notifText.kind_review", listing_moderation: "notifUi.cat_properties", listing_queue: "notifText.spaceAwaiting",
};
function kindText(t: T, kind: string) { return KIND_KEY[kind] ? t(KIND_KEY[kind]) : t("notifUi.update"); }

function kindIcon(kind: string) {
  return EXTRA_META[kind]?.icon ?? KIND_ICON[kind as NotificationKind] ?? Bell;
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (!value) return "—";
  return `${currency || "TZS"} ${Number(value).toLocaleString()}`;
}


type T = (k: string, v?: Record<string, string | number>) => string;
/** Known system notification texts (stored in English) shown in the reader's language. */
function localText(t: T, s: string) { return localizeNotifText(t, s); }

function timeAgo(iso: string, t: T) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t("notifUi.justNow");
  if (m < 60) return t("notifUi.mAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("notifUi.hAgo", { n: h });
  const d = Math.floor(h / 24);
  return t("notifUi.dAgo", { n: d });
}

function bucket(iso: string): "today" | "week" | "earlier" {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 24 * 3600_000) return "today";
  if (diff < 7 * 24 * 3600_000) return "week";
  return "earlier";
}

function useLive<T>(read: () => T, event: string): T {
  const [v, setV] = useState<T>(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener(event, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(event, on); window.removeEventListener("storage", on); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

/** Categories the user chose to hide from the main list (Settings → Notifications, this device). */
function mutedCategories(): string[] {
  try { return JSON.parse(localStorage.getItem("spaces.notifMuted") ?? "[]"); } catch { return []; }
}

const CATEGORY_TABS = ["properties", "users", "leads", "viewings", "verification", "payments", "reports"] as const;

function NotificationsPage() {
  const { t } = useI18n();
  const live = useNotifications();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<DbNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("all");

  // Reuse the one shared realtime feed; reload whenever it changes.
  useEffect(() => {
    void listNotificationsDb(60).then((rows) => { setNotifs(rows); setLoaded(true); });
  }, [live.version]);

  const filtered = useMemo(
    () => {
      const muted = mutedCategories();
      return notifs.filter((n) => (tab === "unread" ? !n.read : true) && !muted.includes(categoryOf(n.kind)));
    },
    [notifs, tab],
  );
  const unread = notifs.filter((n) => !n.read).length;

  const onRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await live.markRead(id);
  };
  const onOpen = async (n: DbNotification) => {
    if (!n.read) await onRead(n.id);
    const href = notificationLink(n);
    if (href.startsWith("/")) navigate({ href });
    else window.location.assign(href);
  };
  const onDelete = async (id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
    void live.refresh();
    toast.success(t("notifUi.delete"));
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {t("notifUi.title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("notifUi.sub")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">{t("notifUi.unread", { n: unread })}</Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={unread === 0}
              onClick={async () => {
                setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
                await live.markAllRead();
                toast.success(t("notifUi.allMarked"));
              }}
            >
              <Check className="mr-1.5 h-4 w-4" /> {t("notifUi.markAll")}
            </Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">{t("notifUi.all")}</TabsTrigger>
            <TabsTrigger value="unread">{t("notifUi.unreadTab")}{unread > 0 ? ` (${unread})` : ""}</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-1.5 h-3.5 w-3.5" />{t("notifUi.settings")}</TabsTrigger>
          </TabsList>

          {(["all", "unread"] as const).map((tb) => (
            <TabsContent key={tb} value={tb} className="mt-0">
              {!loaded ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
              ) : (
                <NotifList items={filtered} onRead={onRead} onOpen={onOpen} onDelete={onDelete} />
              )}
            </TabsContent>
          ))}

          <TabsContent value="settings" className="mt-0">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

function NotifList({ items, onRead, onOpen, onDelete }: {
  items: DbNotification[];
  onRead: (id: string) => void | Promise<void>;
  onOpen: (n: DbNotification) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={t("notifUi.emptyTitle")}
        description={t("notifUi.emptyBody")}
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((n) => {
        const Icon = kindIcon(n.kind);
        const alert = isPropertyAlert(n.kind) ? n.property : null;
        return (
          <li
            key={n.id}
            className={cn(
              "group flex gap-3 rounded-2xl border bg-background p-3 md:p-4 transition-shadow",
              n.read ? "border-border/60" : "border-primary/30 shadow-[var(--shadow-soft)]",
            )}
          >
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              n.read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary")}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => void onOpen(n)} className="flex w-full items-start justify-between gap-2 text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{localText(t, n.title)}</span>
                    {!n.read && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{localText(t, n.body)}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{timeAgo(n.createdAt, t)}</span>
              </button>

              {alert && (
                <div className="mt-2 flex gap-3 rounded-xl border border-border/60 bg-secondary/30 p-2">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {alert.image ? (
                      <img src={alert.image} alt={alert.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground"><Home className="h-4 w-4" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{alert.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{alert.location || "—"}</p>
                    {n.kind === "price_change" && n.data.previous_price ? (
                      <p className="mt-0.5 text-xs">
                        <span className="text-muted-foreground line-through">{money(n.data.previous_price, alert.currency)}</span>{" "}
                        <span className="font-semibold text-primary">{money(n.data.new_price ?? alert.price, alert.currency)}</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-primary">{money(alert.price, alert.currency)}</p>
                    )}
                  </div>
                  <Button asChild size="sm" className="h-8 shrink-0 self-center rounded-xl text-xs">
                    <Link to="/properties/$slug" params={{ slug: alert.id }}>{t("notifText.viewSpace")}</Link>
                  </Button>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-full text-[10px]">{kindText(t, n.kind)}</Badge>

                {/* Desktop: inline action buttons */}
                <div className="hidden flex-wrap items-center gap-1 md:flex">
                  {!alert && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      <button type="button" onClick={() => void onOpen(n)}>{t("notifUi.open")}</button>
                    </Button>
                  )}
                  {!n.read && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void onRead(n.id)}>
                      <Check className="mr-1 h-3.5 w-3.5" />{t("notifUi.markRead")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => void onDelete(n.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />{t("notifUi.delete")}
                  </Button>
                </div>

                {/* Mobile: dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 md:hidden" aria-label={t("notifText.actions")}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => void onOpen(n)}>{t("notifUi.open")}</DropdownMenuItem>
                    {!n.read && (
                      <DropdownMenuItem onClick={() => void onRead(n.id)}>
                        <Check className="mr-2 h-4 w-4" />{t("notifUi.markAsRead")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => void onDelete(n.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />{t("notifUi.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

}

function SettingsPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [prefs, setPrefsState] = useState<{ in_app: boolean; email: boolean }>({ in_app: true, email: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase.from("notification_preferences").select("in_app,email").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setPrefsState(data as { in_app: boolean; email: boolean }); });
  }, [user?.id]);

  async function toggle(key: "in_app" | "email", v: boolean) {
    if (!user) return;
    const prev = prefs;
    const next = { ...prefs, [key]: v };
    setPrefsState(next);
    setSaving(true);
    const { error } = await supabase.from("notification_preferences")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { setPrefsState(prev); toast.error(t("notifLive.saveFailed")); }
    else toast.success(t("notifLive.saved"));
  }

  const rows = [
    { id: "in_app" as const, label: t("notifLive.inApp"), desc: t("notifLive.inAppDesc") },
    { id: "email" as const, label: t("notifLive.email"), desc: t("notifLive.emailDesc") },
  ];
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
      <div className="divide-y divide-border/60">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="font-medium">{r.label}</div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
            <Switch checked={prefs[r.id]} disabled={saving} onCheckedChange={(v) => void toggle(r.id, v)} aria-label={r.label} />
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("notifLive.critical")} {t("notifLive.emailProvider")}
      </p>
    </section>
  );
}
