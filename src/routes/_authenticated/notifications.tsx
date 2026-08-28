import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  KIND_META,
  getPrefs, setPrefs,
  type NotificationKind, type ChannelPrefs,
} from "@/lib/notifications-store";
import {
  listNotificationsDb, markNotificationRead, markAllNotificationsRead,
  deleteNotification, subscribeNotifications, isPropertyAlert, type DbNotification,
} from "@/lib/notifications-db";
import { useAuth } from "@/hooks/use-auth";

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
};

function kindLabel(kind: string) {
  return EXTRA_META[kind]?.label ?? KIND_META[kind as NotificationKind]?.label ?? "Update";
}

function kindIcon(kind: string) {
  return EXTRA_META[kind]?.icon ?? KIND_ICON[kind as NotificationKind] ?? Bell;
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (!value) return "—";
  return `${currency || "TZS"} ${Number(value).toLocaleString()}`;
}


function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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

function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<DbNotification[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const reload = () => { void listNotificationsDb().then(setNotifs); };

  useEffect(() => {
    reload();
    if (!user) return;
    return subscribeNotifications(user.id, reload);
  }, [user?.id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notifs.filter((n) => {
      if (tab === "unread" && n.read) return false;
      if (tab === "read" && !n.read) return false;
      if (tab === "today" && bucket(n.createdAt) !== "today") return false;
      if (tab === "week" && bucket(n.createdAt) === "earlier") return false;
      if (tab === "earlier" && bucket(n.createdAt) !== "earlier") return false;
      if (!needle) return true;
      return (n.title + " " + n.body + " " + kindLabel(n.kind)).toLowerCase().includes(needle);
    });
  }, [notifs, q, tab]);

  const unread = notifs.filter((n) => !n.read).length;

  const onRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  };
  const onDelete = async (id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
    toast.success("Notification deleted");
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Notifications
            </h1>
            <p className="mt-1 text-muted-foreground">
              Stay on top of leads, deals, viewings, billing and verification updates — in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">{unread} unread</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
                await markAllNotificationsRead();
                toast.success("All notifications marked as read");
              }}
            >
              <Check className="mr-1.5 h-4 w-4" /> Mark all as read
            </Button>
          </div>
        </header>



        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max flex-nowrap justify-start gap-1 whitespace-nowrap">
                <TabsTrigger value="all" className="shrink-0">All</TabsTrigger>
                <TabsTrigger value="unread" className="shrink-0">Unread</TabsTrigger>
                <TabsTrigger value="read" className="shrink-0">Read</TabsTrigger>
                <TabsTrigger value="today" className="shrink-0">Today</TabsTrigger>
                <TabsTrigger value="week" className="shrink-0">This week</TabsTrigger>
                <TabsTrigger value="earlier" className="shrink-0">Earlier</TabsTrigger>
                <TabsTrigger value="settings" className="hidden shrink-0 md:inline-flex">
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />Settings
                </TabsTrigger>
              </TabsList>
            </div>
            <Button
              variant={tab === "settings" ? "default" : "outline"}
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Settings"
              aria-pressed={tab === "settings"}
              onClick={() => setTab(tab === "settings" ? "all" : "settings")}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {tab !== "settings" && (
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications" className="pl-9" />
            </div>
          )}

          {(["all", "unread", "read", "today", "week", "earlier"] as const).map((t) => (
            <TabsContent key={t} value={t} className="mt-0">
              <NotifList items={filtered} onRead={onRead} onDelete={onDelete} />
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

function NotifList({ items, onRead, onDelete }: {
  items: DbNotification[];
  onRead: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up. New activity will appear here."
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
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{n.title}</span>
                    {!n.read && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </div>

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
                    <Link to="/properties/$slug" params={{ slug: alert.id }}>View Space</Link>
                  </Button>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-full text-[10px]">{kindLabel(n.kind)}</Badge>

                {/* Desktop: inline action buttons */}
                <div className="hidden flex-wrap items-center gap-1 md:flex">
                  {n.link && !alert && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      <a href={n.link}>Open</a>
                    </Button>
                  )}
                  {!n.read && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void onRead(n.id)}>
                      <Check className="mr-1 h-3.5 w-3.5" />Mark read
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => void onDelete(n.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                  </Button>
                </div>

                {/* Mobile: dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 md:hidden" aria-label="Notification actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {n.link && (
                      <DropdownMenuItem asChild>
                        <a href={n.link}>Open</a>
                      </DropdownMenuItem>
                    )}
                    {!n.read && (
                      <DropdownMenuItem onClick={() => void onRead(n.id)}>
                        <Check className="mr-2 h-4 w-4" />Mark as read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => void onDelete(n.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />Delete
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

const PROVIDER_META: { id: keyof ProviderStatus; name: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "sms", name: "SMS", icon: Smartphone, description: "OTP, viewing reminders, payment & deal alerts." },
  { id: "email", name: "Email", icon: MailCheck, description: "Welcome, invoices, verification status, weekly reports." },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, description: "Viewing confirmations, deal updates, messages, alerts." },
  { id: "push", name: "Push", icon: BellRing, description: "Messages, leads, property updates, deal activity." },
];

const CHANNEL_TOGGLES: { id: keyof ChannelPrefs; label: string; description: string }[] = [
  { id: "sms", label: "SMS", description: "Text alerts to your phone." },
  { id: "email", label: "Email", description: "Rich email summaries and receipts." },
  { id: "whatsapp", label: "WhatsApp", description: "Instant WhatsApp notifications." },
  { id: "push", label: "Push notifications", description: "Real-time app & browser pushes." },
  { id: "marketing", label: "Marketing messages", description: "Promotions, new features and offers." },
  { id: "weeklyReports", label: "Weekly reports", description: "Digest of leads, deals and performance." },
];

function SettingsPanel() {
  const prefs = useLive<ChannelPrefs>(getPrefs, "spaces:notif-prefs-changed");

  function togglePref(id: keyof ChannelPrefs, v: boolean) {
    setPrefs({ ...prefs, [id]: v });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <div className="font-semibold">In-app notifications only</div>
          <p className="text-sm text-foreground/75">
            SMS, email, WhatsApp and push delivery are not connected yet. Those channels need an external
            provider and credentials before SPACES can send anything outside the app.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-background p-4 md:p-6">
        <h2 className="font-display text-lg font-semibold">Delivery channels</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current delivery status for this account.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {PROVIDER_META.map(({ id, name, icon: Icon, description }) => (
            <div key={id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{name}</div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Not connected
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-background p-4 md:p-6">
        <h2 className="font-display text-lg font-semibold">Your preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how you want to be notified. In-app notifications are always on.</p>
        <div className="mt-4 divide-y divide-border/60">
          {CHANNEL_TOGGLES.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-medium">{c.label}</div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Switch checked={Boolean(prefs[c.id])} onCheckedChange={(v) => togglePref(c.id, v)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
