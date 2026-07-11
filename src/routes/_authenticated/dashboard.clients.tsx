import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, Phone, Mail, Plus, Search, Home as HomeIcon, MessageCircle,
  Pencil, Trash2, CalendarPlus, Briefcase, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/ds/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/clients")({
  head: () => ({
    meta: [
      { title: "Clients — SPACES" },
      { name: "description", content: "Manage your buyers, owners and CRM leads in one place." },
    ],
  }),
  component: ClientsPage,
});

type AgentClient = {
  id: string;
  agent_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  client_type: "buyer" | "owner";
  budget: number | null;
  currency: string | null;
  preferred_area: string | null;
  interested_property_id: string | null;
  status: "active" | "inactive" | "archived";
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
};

type Prop = { id: string; title: string; region: string | null; district: string | null; owner_id: string };
type Deal = {
  id: string; property_id: string | null;
  buyer_id: string | null; buyer_name: string | null; buyer_phone: string | null; buyer_email: string | null;
  owner_id: string | null; agent_id: string | null;
  stage: string; value: number | null; currency: string | null;
  last_activity_at: string | null; created_at: string;
};
type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null; avatar_url: string | null };

const STAGE_LABEL: Record<string, string> = {
  new_inquiry: "New Lead", contacted: "Contacted", viewing_scheduled: "Viewing Scheduled",
  viewing_completed: "Viewing Completed", negotiation: "Negotiating", offer_made: "Offer Made",
  offer_accepted: "Offer Accepted", agreement_signed: "Agreement Signed",
  completed: "Won", cancelled: "Lost",
};

type UnifiedRow = {
  key: string;
  source: "manual" | "crm";
  id: string; // agent_clients.id or deal.id
  kind: "buyer" | "owner" | "lead";
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  interestedProperty: string | null;
  budget: number | null;
  currency: string | null;
  status: string;
  lastActivity: string | null;
};

type FormState = {
  id?: string;
  full_name: string;
  phone: string;
  email: string;
  client_type: "buyer" | "owner";
  budget: string;
  preferred_area: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  full_name: "", phone: "", email: "", client_type: "buyer",
  budget: "", preferred_area: "", notes: "",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function money(v: number | null, ccy: string | null) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy ?? "TZS", maximumFractionDigits: 0 }).format(v);
  } catch { return `${ccy ?? "TZS"} ${v.toLocaleString()}`; }
}

function ClientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "buyer" | "owner" | "lead">("all");

  // Add / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const [clientRes, dealRes, propRes] = await Promise.all([
      supabase.from("agent_clients").select("*").eq("agent_id", user.id).order("created_at", { ascending: false }),
      supabase.from("deals")
        .select("id,property_id,buyer_id,buyer_name,buyer_phone,buyer_email,owner_id,agent_id,stage,value,currency,last_activity_at,created_at")
        .or(`agent_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("last_activity_at", { ascending: false, nullsFirst: false }),
      supabase.from("properties").select("id,title,region,district,owner_id"),
    ]);
    const cList = (clientRes.data ?? []) as AgentClient[];
    const dList = (dealRes.data ?? []) as Deal[];
    const pList = (propRes.data ?? []) as Prop[];
    const ids = Array.from(new Set([
      ...dList.map((d) => d.buyer_id),
      ...dList.map((d) => d.owner_id),
    ].filter(Boolean))) as string[];
    const profRes = ids.length
      ? await supabase.from("profiles").select("id,full_name,phone,email,avatar_url").in("id", ids)
      : { data: [] as Profile[] };
    const map: Record<string, Profile> = {};
    for (const p of (profRes.data ?? []) as Profile[]) map[p.id] = p;
    setClients(cList);
    setDeals(dList);
    setProps(pList);
    setProfiles(map);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await refresh(); })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const propsById = useMemo(() => Object.fromEntries(props.map((p) => [p.id, p])), [props]);

  const rows = useMemo<UnifiedRow[]>(() => {
    const out: UnifiedRow[] = [];
    const seen = new Set<string>();

    // 1) Manually added clients (agent_clients)
    for (const c of clients) {
      const key = `ac:${c.id}`;
      seen.add(key);
      const p = c.interested_property_id ? propsById[c.interested_property_id] : null;
      out.push({
        key, source: "manual", id: c.id,
        kind: c.client_type,
        name: c.full_name,
        phone: c.phone,
        email: c.email,
        avatar: c.avatar_url,
        interestedProperty: p?.title ?? c.preferred_area ?? null,
        budget: c.budget,
        currency: c.currency,
        status: c.status,
        lastActivity: c.last_activity_at ?? c.created_at,
      });
    }

    // 2) CRM-derived clients (from deals) — de-dup by buyer/owner id
    for (const d of deals) {
      const bKey = d.buyer_id ? `crm:buyer:${d.buyer_id}` : `crm:lead:${d.id}`;
      if (!seen.has(bKey)) {
        seen.add(bKey);
        const p = d.buyer_id ? profiles[d.buyer_id] : undefined;
        const isLead = !d.buyer_id || d.stage === "new_inquiry" || d.stage === "contacted";
        out.push({
          key: bKey, source: "crm", id: d.id,
          kind: isLead ? "lead" : "buyer",
          name: d.buyer_name ?? p?.full_name ?? "Unnamed",
          phone: d.buyer_phone ?? p?.phone ?? null,
          email: d.buyer_email ?? p?.email ?? null,
          avatar: p?.avatar_url ?? null,
          interestedProperty: d.property_id ? propsById[d.property_id]?.title ?? null : null,
          budget: d.value,
          currency: d.currency,
          status: STAGE_LABEL[d.stage] ?? d.stage,
          lastActivity: d.last_activity_at ?? d.created_at,
        });
      }
      if (d.owner_id && d.owner_id !== user?.id) {
        const oKey = `crm:owner:${d.owner_id}`;
        if (!seen.has(oKey)) {
          seen.add(oKey);
          const p = profiles[d.owner_id];
          out.push({
            key: oKey, source: "crm", id: d.id,
            kind: "owner",
            name: p?.full_name ?? "Property owner",
            phone: p?.phone ?? null,
            email: p?.email ?? null,
            avatar: p?.avatar_url ?? null,
            interestedProperty: d.property_id ? propsById[d.property_id]?.title ?? null : null,
            budget: null,
            currency: null,
            status: STAGE_LABEL[d.stage] ?? d.stage,
            lastActivity: d.last_activity_at ?? d.created_at,
          });
        }
      }
    }
    return out;
  }, [clients, deals, profiles, propsById, user?.id]);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.kind !== filter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.interestedProperty ?? "").toLowerCase().includes(s)
    );
  });

  const counts = {
    all: rows.length,
    buyer: rows.filter((r) => r.kind === "buyer").length,
    owner: rows.filter((r) => r.kind === "owner").length,
    lead: rows.filter((r) => r.kind === "lead").length,
    active: clients.filter((c) => c.status === "active").length + rows.filter((r) => r.source === "crm").length,
    recent: rows.filter((r) => {
      if (!r.lastActivity) return false;
      return Date.now() - new Date(r.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setForm({
      id: c.id,
      full_name: c.full_name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      client_type: c.client_type,
      budget: c.budget != null ? String(c.budget) : "",
      preferred_area: c.preferred_area ?? "",
      notes: c.notes ?? "",
    });
    setFormOpen(true);
  }

  async function saveClient() {
    if (!user) return;
    if (!form.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      agent_id: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      client_type: form.client_type,
      budget: form.budget ? Number(form.budget) : null,
      preferred_area: form.preferred_area.trim() || null,
      notes: form.notes.trim() || null,
      last_activity_at: new Date().toISOString(),
    };
    const res = form.id
      ? await supabase.from("agent_clients").update(payload).eq("id", form.id)
      : await supabase.from("agent_clients").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(form.id ? "Client updated" : "Client added");
    setFormOpen(false);
    setForm(EMPTY_FORM);
    await refresh();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("agent_clients").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Client removed");
      await refresh();
    }
    setDeleteId(null);
  }

  function waLink(phone: string) {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">CRM</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Clients</h1>
            <p className="mt-1 text-muted-foreground">Buyers, owners and leads — manually added or synced from your CRM.</p>
          </div>
          <Button onClick={openAdd} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" />Add Client
          </Button>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Total Clients" value={counts.all} icon={Users} />
          <StatCard label="Active" value={counts.active} icon={Briefcase} />
          <StatCard label="Buyers" value={counts.buyer} icon={Users} />
          <StatCard label="Owners" value={counts.owner} icon={HomeIcon} />
          <StatCard label="Recent (7d)" value={counts.recent} icon={CalendarPlus} />
        </section>

        {/* Filters */}
        <section className="ds-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex flex-wrap gap-1 rounded-full border border-border/60 bg-secondary/40 p-1">
              {([
                { key: "all", label: `All (${counts.all})` },
                { key: "buyer", label: `Buyers (${counts.buyer})` },
                { key: "owner", label: `Owners (${counts.owner})` },
                { key: "lead", label: `Leads (${counts.lead})` },
              ] as const).map((t) => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold transition",
                    filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="ds-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Users className="h-6 w-6" /></div>
              <p className="text-sm font-medium text-foreground">No clients yet.</p>
              <p className="max-w-sm text-xs text-muted-foreground">Add buyers and owners you are working with, or wait for CRM leads from your listings to appear here.</p>
              <Button onClick={openAdd} size="sm" className="mt-2 rounded-full"><Plus className="mr-1 h-4 w-4" />Add Client</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Interested / Area</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last activity</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.key} className="border-t border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {r.avatar && <AvatarImage src={r.avatar} alt={r.name} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(r.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{r.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                              {r.source === "manual" ? "Manual" : "CRM"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-foreground hover:text-primary"><Phone className="h-3 w-3" />{r.phone}</a>}
                          {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Mail className="h-3 w-3" />{r.email}</a>}
                          {!r.phone && !r.email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.kind === "buyer" ? "bg-blue-50 text-blue-700"
                          : r.kind === "owner" ? "bg-amber-50 text-amber-700"
                          : "bg-violet-50 text-violet-700")}>
                          {r.kind === "buyer" ? "Buyer" : r.kind === "owner" ? "Owner" : "Lead"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">
                        {r.interestedProperty ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{money(r.budget, r.currency)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {r.phone && (
                            <>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Call">
                                <a href={`tel:${r.phone}`}><Phone className="h-3.5 w-3.5" /></a>
                              </Button>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="WhatsApp">
                                <a href={waLink(r.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" /></a>
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {r.source === "manual" && (
                                <>
                                  <DropdownMenuItem onClick={() => openEdit(r.id)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteId(r.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem asChild>
                                <Link to="/deals"><Briefcase className="mr-2 h-3.5 w-3.5" />View Deals</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/viewings"><CalendarPlus className="mr-2 h-3.5 w-3.5" />Schedule Viewing</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update this client's details." : "Add a buyer or owner to your personal client roster."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="c-name">Full name</Label>
              <Input id="c-name" value={form.full_name} maxLength={120}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" value={form.phone} maxLength={32}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={form.email} maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Client type</Label>
                <Select value={form.client_type}
                  onValueChange={(v) => setForm({ ...form, client_type: v as "buyer" | "owner" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-budget">Budget (TZS)</Label>
                <Input id="c-budget" type="number" inputMode="numeric" value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 250000000" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-area">Preferred area</Label>
              <Input id="c-area" value={form.preferred_area} maxLength={120}
                onChange={(e) => setForm({ ...form, preferred_area: e.target.value })} placeholder="Masaki, Oyster Bay…" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea id="c-notes" value={form.notes} maxLength={1000} rows={3}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything worth remembering about this client…" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveClient} disabled={saving} className="rounded-full">
              {saving ? "Saving…" : "Save Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the client from your personal roster. Deals and viewings linked to them are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
