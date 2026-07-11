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
  KIND_META, listNotifications, markAllRead, markRead, removeNotification,
  getPrefs, setPrefs, getProviders, setProviders, anyProviderConfigured,
  type SpacesNotification, type NotificationKind, type ChannelPrefs, type ProviderStatus,
} from "@/lib/notifications-store";
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
  const notifs = useLive<SpacesNotification[]>(listNotifications, "spaces:notifications-changed");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notifs.filter((n) => {
      if (tab === "unread" && n.read) return false;
      if (tab === "read" && !n.read) return false;
      if (tab === "today" && bucket(n.createdAt) !== "today") return false;
      if (tab === "week" && bucket(n.createdAt) === "earlier") return false;
      if (tab === "earlier" && bucket(n.createdAt) !== "earlier") return false;
      if (!needle) return true;
      return (n.title + " " + n.body + " " + KIND_META[n.kind].label).toLowerCase().includes(needle);
    });
  }, [notifs, q, tab]);

  const unread = notifs.filter((n) => !n.read).length;

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
            <Button variant="outline" size="sm" onClick={() => { markAllRead(); toast.success("All notifications marked as read"); }}>
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
              <NotifList items={filtered} />
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

function NotifList({ items }: { items: SpacesNotification[] }) {
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
        const Icon = KIND_ICON[n.kind];
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px]">{KIND_META[n.kind].label}</Badge>
                {n.href && (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <Link to={n.href}>Open</Link>
                  </Button>
                )}
                {!n.read && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markRead(n.id)}>
                    <Check className="mr-1 h-3.5 w-3.5" />Mark read
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => { removeNotification(n.id); toast.success("Notification deleted"); }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                </Button>
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
  const providers = useLive<ProviderStatus>(getProviders, "spaces:notif-providers-changed");
  const prefs = useLive<ChannelPrefs>(getPrefs, "spaces:notif-prefs-changed");
  const configured = anyProviderConfigured();

  function toggleProvider(id: keyof ProviderStatus, v: boolean) {
    setProviders({ ...providers, [id]: v });
    toast.success(`${id.toUpperCase()} provider ${v ? "enabled" : "disabled"}`);
  }
  function togglePref(id: keyof ChannelPrefs, v: boolean) {
    setPrefs({ ...prefs, [id]: v });
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="font-semibold">Notification provider setup required</div>
              <p className="text-sm text-foreground/75">Connect at least one provider to deliver SMS, email, WhatsApp or push notifications.</p>
            </div>
          </div>
          <Button onClick={() => { setProviders({ sms: true, email: true, whatsapp: false, push: true }); toast.success("Preview providers configured"); }}>
            <Settings2 className="mr-2 h-4 w-4" /> Configure providers
          </Button>
        </div>
      )}

      <section className="rounded-2xl border border-border/60 bg-background p-4 md:p-6">
        <h2 className="font-display text-lg font-semibold">Delivery providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enable the channels you want SPACES to send through.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {PROVIDER_META.map(({ id, name, icon: Icon, description }) => (
            <div key={id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{name}</div>
                  <Switch checked={providers[id]} onCheckedChange={(v) => toggleProvider(id, v)} />
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
