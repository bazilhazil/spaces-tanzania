import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ManagerOnboardingCard } from "@/components/management/manager-onboarding-card";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type Lang, AVAILABLE_LANGS } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { uploadAvatar, validateAvatarFile, AVATAR_TYPES } from "@/lib/avatar-upload";
import { friendlyError } from "@/lib/errors";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COMPANY } from "@/lib/company";
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
  theme:        { title: "Theme",           desc: "Choose how SPACES looks on this device." },
  notifications:{ title: "Notification preferences", desc: "Choose what appears in your notification list." },
  privacy:      { title: "Privacy",         desc: "What others can see about you on SPACES." },
  about:        { title: "About SPACES",    desc: "Version, company and legal information." },
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

// These sections have full, live pages of their own — send people there
// instead of showing a second, weaker copy.
const REDIRECTS: Record<string, string> = {
  properties: "/dashboard/properties",
  viewings: "/viewings",
  messages: "/messages",
  analytics: "/dashboard/performance",
  subscription: "/billing",
};

function SectionPage() {
  const { section } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const meta = section === "mode" ? { title: t("modeUi.modeTitle"), desc: t("modeUi.modeDesc") } : META[section] ?? { title: section, desc: "" };


  useEffect(() => {
    const to = REDIRECTS[section];
    if (to) navigate({ to, replace: true });
  }, [section, navigate]);

  if (REDIRECTS[section]) return null;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header>
          <Link to="/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-3.5 w-3.5" /> {t("modeUi.dashboard")}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{meta.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta.desc}</p>
        </header>

        {
         section === "drafts"       ? <DraftsPanel /> :
         section === "analytics"    ? <AnalyticsPanel /> :
         section === "subscription" ? <SubscriptionPanel /> :
         section === "profile"      ? <ProfilePanel /> :
         section === "support"      ? <SupportPanel /> :
         section === "settings"     ? <SettingsIndex /> :
         section === "language"     ? <LanguagePanel /> :
         section === "theme"        ? <ThemePanel /> :
         section === "notifications"? <NotifPrefsPanel /> :
         section === "privacy"      ? <PrivacyPanel /> :
         section === "about"        ? <AboutPanel /> :
         section === "mode"         ? <ModePanel /> :
         section === "favorites"    ? <FavoritesPanel /> :
         section === "searches"     ? <SavedSearchesPanel /> :
         section === "recent"       ? <RecentlyViewedPanel /> :
         <EmptyPanel />}
      </div>
    </DashboardShell>
  );
}

/* ============================ FAVORITES / SEARCHES / RECENT ============================ */

import { FavoritesPanel } from "@/components/favorites/favorites-panel";
import { SavedSearchesPanel } from "@/components/favorites/saved-searches-panel";
import { RecentlyViewedPanel } from "@/components/favorites/recently-viewed-panel";
import { avatarInitials, publicEmail } from "@/lib/display-name";


/* Viewings and Messages are handled by the real /viewings and /messages pages. */


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
  const { profile, user, refresh } = useAuth();
  const initials = avatarInitials(profile);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const items = [
    { icon: Mail,     label: "Email (Optional)", value: publicEmail(profile?.email) || publicEmail(user?.email) || "Add email address" },
    { icon: Phone,    label: "Phone Number",     value: profile?.phone || "—" },
    { icon: MapPin,   label: "Location",         value: profile?.location || "—" },
  ];
  const { roles } = useAuth();
  const verified = !!(profile as { verified_identity?: boolean } | null)?.verified_identity;
  const [editing, setEditing] = useState(false);
  const roleLabel = roles.includes("agent") ? "Agent / Dalali" : roles.includes("owner") ? "Property Owner" : "Member";

  async function changePhoto(file: File) {
    if (!user) return;
    const problem = validateAvatarFile(file);
    if (problem) return toast.error(problem === "tooLarge" ? "Photo must be smaller than 5 MB." : "Please choose a JPG, PNG or WEBP image.");
    setPhotoBusy(true);
    try {
      const url = await uploadAvatar(user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success("Photo updated");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <input
              ref={photoRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void changePhoto(file);
              }}
            />
            <button
              onClick={() => photoRef.current?.click()}
              disabled={photoBusy}
              aria-label={profile?.avatar_url ? "Change photo" : "Upload photo"}
              className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90 disabled:opacity-60">
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
            <p className="mt-1 text-sm text-muted-foreground">{roleLabel} on SPACES</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="rounded-xl gap-2" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4" /> Edit Profile
              </Button>
              {!verified && (
                <Link to="/verification">
                  <Button variant="outline" className="rounded-xl gap-2">
                    <ShieldCheck className="h-4 w-4" /> Verify Identity
                  </Button>
                </Link>
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
            </div>
          );
        })}
      </div>
      {profile?.bio && (
        <div className="rounded-2xl border border-border/60 bg-background p-5 text-sm text-foreground/80">{profile.bio}</div>
      )}
      <EditProfileDialog open={editing} onOpenChange={setEditing} />
    </div>
  );
}

function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile, user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(profile?.full_name ?? ""); setLocation(profile?.location ?? ""); setBio(profile?.bio ?? "");
    setEmail(publicEmail(profile?.email) || "");
  }, [open, profile]);
  async function save() {
    if (!user) return;
    if (!name.trim()) return toast.error("Please enter your name.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name.trim(), location: location.trim() || null, bio: bio.trim() || null,
      email: email.trim() || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    await refresh(); toast.success("Profile updated"); onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">Full name<Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm">Email (optional)<Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm">Location<Input className="mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dar es Salaam" /></label>
          <label className="block text-sm">About you<Textarea className="mt-1" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></label>
          <p className="text-xs text-muted-foreground">Your phone number is your sign-in and can't be changed here — contact Support to change it.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="rounded-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ THEME / NOTIFICATIONS / PRIVACY / ABOUT ============================ */

function ThemePanel() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { setTheme(localStorage.getItem("spaces.theme") === "dark" ? "dark" : "light"); }, []);
  function choose(v: "light" | "dark") {
    setTheme(v);
    localStorage.setItem("spaces.theme", v);
    document.documentElement.classList.toggle("dark", v === "dark");
    toast.success(v === "dark" ? "Dark theme on" : "Light theme on");
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {([["light", "Light (default)"], ["dark", "Dark"]] as const).map(([v, label]) => (
        <button key={v} onClick={() => choose(v)}
          className={cn("flex items-center justify-between rounded-2xl border bg-background p-5 text-left shadow-[var(--shadow-soft)]",
            theme === v ? "border-primary ring-1 ring-primary/30" : "border-border/60")}>
          <span className="font-display font-semibold text-foreground">{label}</span>
          {theme === v && <Check className="h-4 w-4 text-primary" />}
        </button>
      ))}
    </div>
  );
}

const NOTIF_CATS: [string, string][] = [
  ["properties", "Property activity (approvals, price changes, saved-search matches)"],
  ["leads", "Inquiries and messages"],
  ["viewings", "Viewing requests"],
  ["verification", "Verification and management access"],
  ["payments", "Payments and subscriptions"],
  ["reports", "Safety reports"],
];

function NotifPrefsPanel() {
  const [muted, setMuted] = useState<string[]>([]);
  useEffect(() => { try { setMuted(JSON.parse(localStorage.getItem("spaces.notifMuted") ?? "[]")); } catch { /* ignore */ } }, []);
  function toggle(c: string) {
    const next = muted.includes(c) ? muted.filter((x) => x !== c) : [...muted, c];
    setMuted(next); localStorage.setItem("spaces.notifMuted", JSON.stringify(next)); toast.success("Preference saved");
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which notifications show in your main list on this device. Hidden types are still kept and still count on the bell. Important account and security messages are always delivered.
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        {NOTIF_CATS.map(([c, label], i) => (
          <label key={c} className={cn("flex cursor-pointer items-center justify-between gap-4 p-4", i > 0 && "border-t border-border/50")}>
            <span className="text-sm font-medium text-foreground">{label}</span>
            <Switch checked={!muted.includes(c)} onCheckedChange={() => toggle(c)} />
          </label>
        ))}
      </div>
      <Link to="/notifications"><Button variant="outline" className="rounded-xl">Open notifications</Button></Link>
    </div>
  );
}

function PrivacyPanel() {
  const rows = [
    ["Public profile", "Your name, photo, bio and verification badges can be seen by other SPACES users."],
    ["Phone number", "Never shown on your profile. On a listing, only the contact number you entered for that listing is shown to signed-in visitors."],
    ["Email", "Never shown publicly."],
    ["Messages", "Only you and the person you are chatting with can read your conversations."],
    ["Tenancy and rent records", "Only you, the property owner and their approved Property Manager can see them."],
  ];
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        {rows.map(([k, v], i) => (
          <div key={k} className={cn("p-4", i > 0 && "border-t border-border/50")}>
            <p className="font-medium text-foreground">{k}</p>
            <p className="text-sm text-muted-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard/safety"><Button variant="outline" className="rounded-xl">Blocked users & safety</Button></Link>
        <Link to="/privacy"><Button variant="outline" className="rounded-xl">Privacy policy</Button></Link>
        <Link to="/dashboard/support"><Button variant="outline" className="rounded-xl">Request my data / delete account</Button></Link>
      </div>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <p className="font-display text-2xl font-semibold text-foreground">SPACES</p>
        <p className="text-sm text-muted-foreground">Version 1.0</p>
        <p className="mt-3 text-sm text-foreground/80">
          Tanzania's property marketplace — find, list, rent and manage homes, land and commercial spaces with verified owners and agents.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{COMPANY.legalName} · {COMPANY.address} · {COMPANY.email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/about"><Button variant="outline" className="rounded-xl">About us</Button></Link>
        <Link to="/terms"><Button variant="outline" className="rounded-xl">Terms</Button></Link>
        <Link to="/privacy"><Button variant="outline" className="rounded-xl">Privacy</Button></Link>
        <Link to="/contact"><Button variant="outline" className="rounded-xl">Contact</Button></Link>
        <Link to="/help"><Button variant="outline" className="rounded-xl">Help Center</Button></Link>
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
    { icon: Sparkles, label: t("modeUi.modeTitle"), section: "mode", value: t("modeUi.modeSwitchRole") },
    { icon: Globe, label: t("settings.language"), section: "language", value: `${current.flag} ${current.label}` },
    { icon: Palette, label: t("settings.theme"), section: "theme", value: t("settings.themeDefault") },
    { icon: Bell, label: t("settings.notifications"), section: "notifications", value: t("settings.notificationsOn") },
    { icon: Lock, label: t("settings.privacy"), section: "privacy", value: "" },
    { icon: LifeBuoy, label: t("settings.support"), section: "support", value: "" },
    { icon: Info, label: t("settings.about"), section: "about", value: t("settings.aboutVersion") },
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
  const { t } = useI18n();
  const mk = (key: SpacesMode, emoji: string, n: string) => ({ key, emoji, title: t(`modeUi.m${n}`), desc: t(`modeUi.m${n}Desc`), unlocks: t(`modeUi.m${n}U`).split("|") });
  const options = [mk("buyer", "🏠", "Buyer"), mk("owner", "🏡", "Owner"), mk("agent", "🤝", "Agent")];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map((o) => {
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            onClick={() => {
              if (!setMode(o.key)) {
                toast.info(t("modeUi.agentNeedsApproval"));
                navigate({ to: "/verification" });
                return;
              }
              toast.success(t("modeUi.modeSwitched", { mode: o.title }));
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
                  {t("modeUi.current")}
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
      <div className="md:col-span-3"><ManagerOnboardingCard /></div>
    </div>
  );
}
