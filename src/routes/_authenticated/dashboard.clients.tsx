import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Phone, Mail, Plus, Search, Home as HomeIcon, ChevronRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/clients")({
  head: () => ({
    meta: [
      { title: "Clients — SPACES" },
      { name: "description", content: "All buyers, owners and leads assigned to you — in one place." },
    ],
  }),
  component: ClientsPage,
});

type Deal = {
  id: string; property_id: string | null;
  buyer_id: string | null; buyer_name: string | null; buyer_phone: string | null; buyer_email: string | null;
  owner_id: string | null; agent_id: string | null;
  stage: string; value: number | null; currency: string | null;
  last_activity_at: string | null; created_at: string;
};
type Prop = { id: string; title: string; region: string | null; district: string | null; owner_id: string };
type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null };

const STAGE_LABEL: Record<string, string> = {
  new_inquiry: "New Lead", contacted: "Contacted", viewing_scheduled: "Viewing Scheduled",
  viewing_completed: "Viewing Completed", negotiation: "Negotiating", offer_made: "Offer Made",
  offer_accepted: "Offer Accepted", agreement_signed: "Agreement Signed",
  completed: "Won", cancelled: "Lost",
};

type ClientRow = {
  key: string;
  kind: "buyer" | "owner" | "lead";
  name: string;
  phone: string | null;
  email: string | null;
  property: Prop | null;
  stage: string;
  lastActivity: string | null;
  assignedListings: number;
};

function ClientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "buyer" | "owner" | "lead">("all");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [dealRes, propRes] = await Promise.all([
        supabase.from("deals")
          .select("id,property_id,buyer_id,buyer_name,buyer_phone,buyer_email,owner_id,agent_id,stage,value,currency,last_activity_at,created_at")
          .or(`agent_id.eq.${user.id},owner_id.eq.${user.id}`)
          .order("last_activity_at", { ascending: false, nullsFirst: false }),
        supabase.from("properties").select("id,title,region,district,owner_id").eq("owner_id", user.id),
      ]);
      const dList = (dealRes.data ?? []) as Deal[];
      const pList = (propRes.data ?? []) as Prop[];

      const ids = Array.from(new Set([
        ...dList.map((d) => d.buyer_id),
        ...dList.map((d) => d.owner_id),
      ].filter(Boolean))) as string[];
      const profRes = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone,email").in("id", ids)
        : { data: [] as Profile[] };
      if (!alive) return;
      const map: Record<string, Profile> = {};
      for (const p of (profRes.data ?? []) as Profile[]) map[p.id] = p;
      setDeals(dList);
      setProps(pList);
      setProfiles(map);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const propsById = useMemo(() => Object.fromEntries(props.map((p) => [p.id, p])), [props]);
  const listingsByOwner = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of props) m[p.owner_id] = (m[p.owner_id] ?? 0) + 1;
    return m;
  }, [props]);

  const rows = useMemo<ClientRow[]>(() => {
    const seen = new Set<string>();
    const out: ClientRow[] = [];
    for (const d of deals) {
      // Buyer/Lead entry
      const bKey = d.buyer_id ? `buyer:${d.buyer_id}` : `lead:${d.id}`;
      if (!seen.has(bKey)) {
        seen.add(bKey);
        const p = d.buyer_id ? profiles[d.buyer_id] : undefined;
        const isLead = !d.buyer_id || d.stage === "new_inquiry" || d.stage === "contacted";
        out.push({
          key: bKey,
          kind: isLead ? "lead" : "buyer",
          name: d.buyer_name ?? p?.full_name ?? "Unnamed",
          phone: d.buyer_phone ?? p?.phone ?? null,
          email: d.buyer_email ?? p?.email ?? null,
          property: d.property_id ? propsById[d.property_id] ?? null : null,
          stage: d.stage,
          lastActivity: d.last_activity_at ?? d.created_at,
          assignedListings: 0,
        });
      }
      // Owner (if I'm the agent and there is an owner)
      if (d.owner_id && d.owner_id !== user?.id) {
        const oKey = `owner:${d.owner_id}`;
        if (!seen.has(oKey)) {
          seen.add(oKey);
          const p = profiles[d.owner_id];
          out.push({
            key: oKey,
            kind: "owner",
            name: p?.full_name ?? "Property owner",
            phone: p?.phone ?? null,
            email: p?.email ?? null,
            property: d.property_id ? propsById[d.property_id] ?? null : null,
            stage: d.stage,
            lastActivity: d.last_activity_at ?? d.created_at,
            assignedListings: listingsByOwner[d.owner_id] ?? 0,
          });
        }
      }
    }
    return out;
  }, [deals, profiles, propsById, listingsByOwner, user?.id]);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.kind !== filter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.property?.title ?? "").toLowerCase().includes(s)
    );
  });

  const counts = {
    all: rows.length,
    buyer: rows.filter((r) => r.kind === "buyer").length,
    owner: rows.filter((r) => r.kind === "owner").length,
    lead: rows.filter((r) => r.kind === "lead").length,
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">CRM</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Clients</h1>
            <p className="mt-1 text-muted-foreground">Buyers, owners and leads assigned to you — with current deal stage and last activity.</p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/leads"><Plus className="mr-1 h-4 w-4" />Add Client</Link>
          </Button>
        </header>

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
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold", filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
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
              <p className="text-sm font-medium text-foreground">No clients assigned yet.</p>
              <p className="max-w-sm text-xs text-muted-foreground">When buyers inquire about your listings or leads are assigned to you, they appear here automatically.</p>
              <Button asChild size="sm" className="mt-2 rounded-full"><Link to="/leads"><Plus className="mr-1 h-4 w-4" />Add Client</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Interested property</th>
                    <th className="px-4 py-3">Deal stage</th>
                    <th className="px-4 py-3">Listings</th>
                    <th className="px-4 py-3">Last activity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.key} className="border-t border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className={cn("mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.kind === "buyer" ? "bg-blue-50 text-blue-700"
                          : r.kind === "owner" ? "bg-amber-50 text-amber-700"
                          : "bg-violet-50 text-violet-700")}>
                          {r.kind === "buyer" ? "Buyer" : r.kind === "owner" ? "Owner" : "Lead"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-foreground hover:text-primary"><Phone className="h-3 w-3" />{r.phone}</a>}
                          {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Mail className="h-3 w-3" />{r.email}</a>}
                          {!r.phone && !r.email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">
                        {r.property?.title ?? "—"}
                        {r.property?.region && <div className="text-[11px] text-muted-foreground/70">{r.property.district ?? r.property.region}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{STAGE_LABEL[r.stage] ?? r.stage}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><HomeIcon className="h-3 w-3" />{r.assignedListings}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8">
                          <Link to="/leads">Open <ChevronRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
