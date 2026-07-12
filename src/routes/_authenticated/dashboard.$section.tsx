import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type Lang, AVAILABLE_LANGS } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell, Globe, Inbox, Info, LifeBuoy, Lock, Palette, ChevronRight, Check,
  Eye, Edit3, Copy, Pause, Trash2, BarChart3, MoreHorizontal, Home, Upload,
  Calendar as CalendarIcon, MessageSquare, Search, Archive, Heart, Phone,
  MessageCircle, Clock, Crown, ShieldCheck, Mail, MapPin, FileEdit,
  ChevronLeft, Plus, CheckCircle2, XCircle, Sparkles, HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  component: SectionPage,
});

const META: Record<string, { title: string; desc: string }> = {
  viewings:     { title: "Viewings",        desc: "Approve, reschedule and organise property tours." },
  messages:     { title: "Messages",        desc: "Chat with interested buyers and renters." },
  drafts:       { title: "Saved Drafts",    desc: "Pick up where you left off." },
  analytics:    { title: "Analytics",       desc: "Weekly performance for all your listings." },
  subscription: { title: "Subscription",    desc: "Upgrade to unlock premium visibility." },
  profile:      { title: "Profile",         desc: "Your public identity on SPACES." },
  support:      { title: "Support",         desc: "We're here to help, 24/7." },
  settings:     { title: "Settings",        desc: "Preferences, language and privacy." },
  mode:         { title: "My Mode",          desc: "Switch between Buyer, Owner and Agent anytime." },
  language:     { title: "Language",        desc: "Choose your preferred language." },
  favorites:    { title: "Favorites",       desc: "Homes you loved, organised in folders." },
  searches:     { title: "Saved Searches",  desc: "Get alerts when matching homes appear." },
  recent:       { title: "Recently Viewed",  desc: "Pick up browsing where you left off." },
  clients:      { title: "Active Leads",    desc: "Your active leads." },
  users:        { title: "Users",           desc: "Manage all users." },
  verification: { title: "Verification",    desc: "Pending property verifications." },
  reports:      { title: "Reports",         desc: "Reported listings." },
  payments:     { title: "Payments",        desc: "Payments overview." },
};

function SectionPage() {
  const { section } = Route.useParams();
  const meta = META[section] ?? { title: section, desc: "" };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header>
          <Link to="/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{meta.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta.desc}</p>
        </header>

        {section === "properties"   ? <PropertiesPanel /> :
         section === "viewings"     ? <ViewingsPanel /> :
         section === "messages"     ? <MessagesPanel /> :
         section === "drafts"       ? <DraftsPanel /> :
         section === "analytics"    ? <AnalyticsPanel /> :
         section === "subscription" ? <SubscriptionPanel /> :
         section === "profile"      ? <ProfilePanel /> :
         section === "support"      ? <SupportPanel /> :
         section === "settings"     ? <SettingsIndex /> :
         section === "language"     ? <LanguagePanel /> :
         section === "mode"         ? <ModePanel /> :
         section === "favorites"    ? <FavoritesPanel /> :
         section === "searches"     ? <SavedSearchesPanel /> :
         section === "recent"       ? <RecentlyViewedPanel /> :
         <EmptyPanel />}
      </div>
    </DashboardShell>
  );
}

/* ============================ MY PROPERTIES ============================ */

import { PropertiesManager } from "@/components/property-management/manager";
import { FavoritesPanel } from "@/components/favorites/favorites-panel";
import { SavedSearchesPanel } from "@/components/favorites/saved-searches-panel";
import { RecentlyViewedPanel } from "@/components/favorites/recently-viewed-panel";

function PropertiesPanel() {
  return <PropertiesManager />;
}


/* ============================ VIEWINGS ============================ */

type Viewing = { id: string; property: string; buyer: string; date: string; time: string; status: "pending" | "approved" | "rejected" };
const SAMPLE_VIEWINGS: Viewing[] = [
  { id: "1", property: "Modern 3BR Villa • Masaki", buyer: "Amina Hassan", date: "2026-07-10", time: "10:00", status: "pending" },
  { id: "2", property: "Ocean-view Apartment • Oyster Bay", buyer: "James Mwakalinga", date: "2026-07-11", time: "14:30", status: "approved" },
  { id: "3", property: "Family Home • Mikocheni", buyer: "Grace Kimario", date: "2026-07-12", time: "09:00", status: "pending" },
];

function ViewingsPanel() {
  const [view, setView] = useState<"list" | "calendar">("list");
  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl border border-border bg-background p-1">
        {(["list", "calendar"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground")}>
            {v === "list" ? "List View" : "Calendar View"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
          {SAMPLE_VIEWINGS.map((v, i) => (
            <div key={v.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between", i > 0 && "border-t border-border/50")}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p className="text-[10px] font-medium uppercase">{new Date(v.date).toLocaleString("en", { month: "short" })}</p>
                  <p className="font-display text-sm font-bold leading-none">{new Date(v.date).getDate()}</p>
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{v.property}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />{v.time} · with {v.buyer}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {v.status === "approved" && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-500/20">Approved</span>}
                {v.status === "pending" && <>
                  <Button size="sm" className="h-8 gap-1 rounded-lg" onClick={() => toast.success("Approved")}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 rounded-lg" onClick={() => toast.info("Rescheduling…")}><CalendarIcon className="h-3.5 w-3.5" /> Reschedule</Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => toast.info("Rejected")}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                </>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CalendarGrid viewings={SAMPLE_VIEWINGS} />
      )}
    </div>
  );
}

function CalendarGrid({ viewings }: { viewings: Viewing[] }) {
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const byDay: Record<number, number> = {};
  for (const v of viewings) {
    const d = new Date(v.date);
    if (d.getMonth() === month && d.getFullYear() === year) byDay[d.getDate()] = (byDay[d.getDate()] ?? 0) + 1;
  }
  const cells = Array.from({ length: first + days }, (_, i) => i < first ? null : i - first + 1);
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
      <p className="mb-4 font-display text-lg font-semibold text-foreground">
        {today.toLocaleString("en", { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={cn(
            "relative aspect-square rounded-lg p-1.5 text-sm",
            c === null ? "" : c === today.getDate() ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
          )}>
            {c}
            {c !== null && byDay[c] && (
              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">{byDay[c]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ MESSAGES ============================ */

type Msg = { id: string; name: string; property: string; preview: string; time: string; unread: boolean; avatar?: string };
const SAMPLE_MSGS: Msg[] = [
  { id: "1", name: "Amina Hassan", property: "Modern 3BR Villa • Masaki", preview: "Hi! Is this still available for viewing this weekend?", time: "2m", unread: true },
  { id: "2", name: "James Mwakalinga", property: "Ocean-view Apartment", preview: "Thank you, I'll transfer the deposit today.", time: "1h", unread: true },
  { id: "3", name: "Grace Kimario", property: "Family Home • Mikocheni", preview: "Can you share more photos of the kitchen?", time: "Yesterday", unread: false },
  { id: "4", name: "Peter Ndosi", property: "Studio • Kariakoo", preview: "Great, see you Saturday.", time: "2d", unread: false },
];

function MessagesPanel() {
  const [tab, setTab] = useState<"inbox" | "unread" | "archive">("inbox");
  const [q, setQ] = useState("");
  const list = SAMPLE_MSGS.filter((m) => {
    if (tab === "unread" && !m.unread) return false;
    if (tab === "archive") return false;
    if (q && !`${m.name} ${m.property} ${m.preview}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-background p-1">
          {(["inbox","unread","archive"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("rounded-lg px-4 py-1.5 text-sm font-medium capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search messages" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 rounded-xl" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No messages here.</div>
        ) : list.map((m, i) => (
          <button key={m.id} onClick={() => toast.info("Opening chat…")}
            className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50", i > 0 && "border-t border-border/50")}>
            <Avatar className="h-11 w-11 ring-2 ring-primary/10">
              <AvatarImage src={m.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{m.name.split(" ").map((s) => s[0]).slice(0,2).join("")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate font-display text-sm", m.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{m.name}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{m.time}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-primary">{m.property}</p>
              <p className={cn("mt-1 line-clamp-1 text-sm", m.unread ? "text-foreground" : "text-muted-foreground")}>{m.preview}</p>
            </div>
            {m.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            <button onClick={(e) => { e.stopPropagation(); toast.success("Archived"); }} className="ml-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
              <Archive className="h-4 w-4" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================ DRAFTS ============================ */

function DraftsPanel() {
  return <EmptyState icon={FileEdit} title="No drafts saved" body="Draft properties you're still working on will appear here." cta={{ label: "Start a Property", to: "/upload" }} />;
}

/* ============================ ANALYTICS ============================ */

const WEEK = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const VIEWS_DATA = [42, 68, 54, 82, 95, 120, 88];

function AnalyticsPanel() {
  const total = VIEWS_DATA.reduce((a, b) => a + b, 0);
  const stats = [
    { label: "Views",            value: total,   icon: Eye,          tone: "text-primary bg-primary/10" },
    { label: "Favorites",        value: 24,      icon: Heart,        tone: "text-rose-500 bg-rose-500/10" },
    { label: "Calls",            value: 12,      icon: Phone,        tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "WhatsApp Clicks",  value: 31,      icon: MessageCircle,tone: "text-green-600 bg-green-500/10" },
    { label: "Bookings",         value: 7,       icon: CalendarIcon, tone: "text-violet-600 bg-violet-500/10" },
    { label: "Avg. Time Viewed", value: "1m 42s",icon: Clock,        tone: "text-amber-600 bg-amber-500/10" },
  ];
  const max = Math.max(...VIEWS_DATA);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", s.tone)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-xl font-semibold text-foreground">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Weekly Performance</p>
            <p className="text-xs text-muted-foreground">Views across all your listings</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">↑ 24%</span>
        </div>
        <div className="flex h-56 items-end justify-between gap-2">
          {VIEWS_DATA.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/70 transition-all hover:from-primary hover:to-primary"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`${v} views`}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{WEEK[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ SUBSCRIPTION ============================ */

function SubscriptionPanel() {
  const plans = [
    { name: "Free",    price: "TZS 0",         features: ["Up to 3 listings", "Standard visibility", "Basic analytics"], cta: "Current Plan", disabled: true },
    { name: "Premium", price: "TZS 49,000/mo", features: ["Unlimited listings", "5× more visibility", "Featured placements", "Advanced analytics", "WhatsApp lead alerts"], cta: "Upgrade", primary: true },
    { name: "Agency",  price: "TZS 149,000/mo",features: ["Everything in Premium", "Multi-user teams", "Priority support", "Verified agency badge"], cta: "Contact Sales" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.name} className={cn(
          "relative flex flex-col rounded-2xl border p-6 shadow-[var(--shadow-soft)]",
          p.primary ? "border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background ring-1 ring-primary/20" : "border-border/60 bg-background"
        )}>
          {p.primary && (
            <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-soft)]">
              <Crown className="h-3 w-3" /> Most Popular
            </span>
          )}
          <p className="font-display text-lg font-semibold text-foreground">{p.name}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{p.price}</p>
          <ul className="mt-4 flex-1 space-y-2">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
          <Button className={cn("mt-6 rounded-xl", !p.primary && "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
            disabled={p.disabled} onClick={() => toast.info(`${p.cta} — coming soon`)}>
            {p.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ============================ PROFILE ============================ */

function ProfilePanel() {
  const { profile, user } = useAuth();
  const initials = (profile?.full_name || user?.email || "S").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase();
  const items = [
    { icon: Mail,     label: "Email (Optional)", value: profile?.email || user?.email || "Add email address" },
    { icon: Phone,    label: "Phone Number",     value: profile?.phone || "—" },
    { icon: MapPin,   label: "Location",         value: profile?.location || "—" },
  ];
  const verified = false;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <button onClick={() => toast.info("Photo upload coming soon")}
              className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {profile?.full_name || "Add your name"}
              </h2>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Unverified
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Property Owner on SPACES</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="rounded-xl gap-2" onClick={() => toast.info("Edit form coming soon")}>
                <Edit3 className="h-4 w-4" /> Edit Profile
              </Button>
              {!verified && (
                <Button variant="outline" className="rounded-xl gap-2" onClick={() => toast.info("Verification flow coming soon")}>
                  <ShieldCheck className="h-4 w-4" /> Verify Identity
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className={cn("flex items-center gap-4 p-4", i > 0 && "border-t border-border/50")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <p className="font-medium text-foreground">{it.value}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ SUPPORT ============================ */

function SupportPanel() {
  const faqs = [
    { q: "How do I publish a property?", a: "Tap Upload Property from the sidebar and follow the 7 quick steps." },
    { q: "How long does verification take?", a: "Most identities are verified in under 24 hours." },
    { q: "Can I change my phone number?", a: "Yes, go to Profile → Edit Profile to update your phone." },
    { q: "How do payments work?", a: "Buyers pay you directly — SPACES only charges for premium listings." },
  ];
  const channels = [
    { icon: MessageCircle, label: "WhatsApp Support", value: "+255 700 000 000", accent: "text-green-600 bg-green-500/10" },
    { icon: Phone,         label: "Call us",          value: "0800 123 456",     accent: "text-primary bg-primary/10" },
    { icon: Mail,          label: "Email",            value: "help@spaces.co.tz",accent: "text-amber-600 bg-amber-500/10" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => toast.info(`Opening ${c.label}…`)}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/40">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", c.accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="font-semibold text-foreground">{c.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <p className="font-display text-lg font-semibold text-foreground">Frequently Asked</p>
        </div>
        <div className="divide-y divide-border/50">
          {faqs.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground">
                {f.q}
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ GENERIC ============================ */

function EmptyState({ icon: Icon, title, body, cta }: {
  icon: React.ComponentType<{ className?: string }>; title: string; body: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link to={cta.to}>
          <Button className="mt-5 rounded-xl gap-2"><Plus className="h-4 w-4" /> {cta.label}</Button>
        </Link>
      )}
    </div>
  );
}

function EmptyPanel() {
  return <EmptyState icon={Inbox} title="Nothing here yet" body="This section is on the way. Check back soon." />;
}

function SettingsIndex() {
  const { t, lang } = useI18n();
  const current = AVAILABLE_LANGS.find((l) => l.code === lang) ?? AVAILABLE_LANGS[0];
  const items: { icon: typeof Globe; label: string; section: string; value: string }[] = [
    { icon: Sparkles, label: "My Mode", section: "mode", value: "Switch role" },
    { icon: Globe, label: t("settings.language"), section: "language", value: `${current.flag} ${current.label}` },
    { icon: Palette, label: t("settings.theme"), section: "settings", value: t("settings.themeDefault") },
    { icon: Bell, label: t("settings.notifications"), section: "settings", value: t("settings.notificationsOn") },
    { icon: Lock, label: t("settings.privacy"), section: "settings", value: "" },
    { icon: LifeBuoy, label: t("settings.support"), section: "support", value: "" },
    { icon: Info, label: t("settings.about"), section: "settings", value: t("settings.aboutVersion") },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            to="/dashboard/$section"
            params={{ section: it.section }}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{it.label}</p>
                {it.value && <p className="text-xs text-muted-foreground">{it.value}</p>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}

function LanguagePanel() {
  const { t, lang, setLang } = useI18n();
  const current = AVAILABLE_LANGS.find((l) => l.code === lang) ?? AVAILABLE_LANGS[0];

  function choose(l: Lang) {
    setLang(l);
    toast.success(t("lang.saved"));
  }

  const options = AVAILABLE_LANGS.map((l) => ({
    ...l,
    sub: l.code === "en" ? t("lang.defaultLabel") : t("lang.swSub"),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("lang.title")}</p>
            <p className="font-display text-base font-semibold text-foreground">
              {current.flag} {current.label}
            </p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = lang === o.code;
          return (
            <button
              key={o.code}
              onClick={() => choose(o.code)}
              className={
                "group flex items-center justify-between rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 " +
                (active
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                  : "border-border/60 bg-background hover:border-primary/40")
              }
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl leading-none">{o.flag}</span>
                <div>
                  <p className="font-display text-base font-semibold text-foreground">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.sub}</p>
                </div>
              </div>
              {active && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ MY MODE ============================ */

function ModePanel() {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const options: { key: SpacesMode; emoji: string; title: string; desc: string; unlocks: string[] }[] = [
    { key: "buyer", emoji: "🏠", title: "Buyer", desc: "Find your next home.", unlocks: ["Favorites", "Viewing Requests", "Saved Searches"] },
    { key: "owner", emoji: "🏡", title: "Owner", desc: "List and manage your properties.", unlocks: ["Upload Property", "My Properties", "Analytics", "Bookings"] },
    { key: "agent", emoji: "🤝", title: "Agent", desc: "Manage leads and listings.", unlocks: ["Active Leads", "Listings", "Commission", "Performance"] },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map((o) => {
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            onClick={() => {
              setMode(o.key);
              toast.success(`Switched to ${o.title} mode`);
              navigate({ to: "/dashboard" });
            }}
            className={cn(
              "group relative overflow-hidden rounded-3xl border bg-background p-6 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1",
              active ? "border-primary shadow-[0_0_0_2px_var(--color-primary),var(--shadow-elevated)]" : "border-border/60 hover:border-primary/30",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">{o.emoji}</div>
              {active && (
                <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Current
                </span>
              )}
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{o.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            <ul className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
              {o.unlocks.map((u) => (
                <li key={u} className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {u}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
