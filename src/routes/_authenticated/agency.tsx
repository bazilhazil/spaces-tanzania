import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { fmtTZS } from "@/lib/offers-db";

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({
    meta: [
      { title: "Agency — SPACES" },
      { name: "description", content: "Manage your SPACES agency team, deals and Dalali commissions." },
      { property: "og:title", content: "Agency — SPACES" },
      { property: "og:description", content: "Manage your SPACES agency team, deals and Dalali commissions." },
    ],
  }),
  component: AgencyPage,
});

type Agency = { id: string; name: string; admin_id: string; phone: string | null; email: string | null; region: string | null };
type Member = { id: string; agency_id: string; user_id: string | null; invited_email: string | null; role: string; status: string };

function AgencyPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [invites, setInvites] = useState<(Member & { agency_name?: string })[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", region: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: mine } = await supabase.from("agency_members" as any).select("*").eq("user_id", user.id);
    const myRows = (mine ?? []) as unknown as Member[];
    const { data: own } = await supabase.from("agencies" as any).select("*").eq("admin_id", user.id).maybeSingle();
    let a = own as unknown as Agency | null;
    if (!a) {
      const active = myRows.find((m) => m.status === "active");
      if (active) { const { data } = await supabase.from("agencies" as any).select("*").eq("id", active.agency_id).maybeSingle(); a = data as unknown as Agency | null; }
    }
    const pend = myRows.filter((m) => m.status === "invited");
    if (pend.length) {
      const { data: ag } = await supabase.from("agencies" as any).select("id,name").in("id", pend.map((p) => p.agency_id));
      const nm = Object.fromEntries(((ag ?? []) as any[]).map((x) => [x.id, x.name]));
      setInvites(pend.map((p) => ({ ...p, agency_name: nm[p.agency_id] })));
    } else setInvites([]);
    setAgency(a);
    if (a) {
      setForm({ name: a.name, phone: a.phone ?? "", email: a.email ?? "", region: a.region ?? "" });
      const { data: ms } = await supabase.from("agency_members" as any).select("*").eq("agency_id", a.id).neq("status", "removed");
      const list = (ms ?? []) as unknown as Member[];
      setMembers(list);
      const ids = [a.admin_id, ...list.map((m) => m.user_id).filter(Boolean)] as string[];
      const { data: p } = await supabase.from("public_profiles").select("id,full_name").in("id", ids);
      setNames(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name ?? ""])));
      const isAdmin = a.admin_id === user.id || list.some((m) => m.user_id === user.id && m.role === "admin" && m.status === "active");
      if (isAdmin) { const { data: ov } = await (supabase.rpc as any)("agency_overview", { _agency: a.id }); setOverview(ov); } else setOverview(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<{ error: any } | any>, ok: string) {
    setBusy(true);
    try { const r = await fn(); if (r?.error) throw r.error; toast.success(ok); await load(); }
    catch (e: any) { toast.error(e?.message || t("offer.failed")); }
    finally { setBusy(false); }
  }

  const isAdmin = !!agency && agency.admin_id === user?.id;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{t("agency.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("agency.subtitle")}</p>
        </header>

        {invites.length > 0 && (
          <section className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <h2 className="font-semibold text-foreground">{t("agency.invitations")}</h2>
            {invites.map((i) => (
              <div key={i.id} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{i.agency_name}</span>
                <div className="flex gap-2">
                  <Button disabled={busy} onClick={() => run(() => (supabase.rpc as any)("respond_agency_invite", { _member_id: i.id, _accept: true }), t("agency.active"))}>{t("agency.accept")}</Button>
                  <Button variant="outline" disabled={busy} onClick={() => run(() => (supabase.rpc as any)("respond_agency_invite", { _member_id: i.id, _accept: false }), t("agency.declined"))}>{t("agency.decline")}</Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {loading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : !agency ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-muted-foreground">{t("agency.none")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><Label>{t("agency.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t("agency.region")}</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            </div>
            <Button className="mt-4 h-11" disabled={busy || form.name.trim().length < 2}
              onClick={() => run(() => supabase.from("agencies" as any).insert({ name: form.name.trim(), region: form.region || null, admin_id: user!.id } as never), t("agency.saved"))}>{t("agency.create")}</Button>
          </section>
        ) : (
          <>
            {!isAdmin && <p className="rounded-xl bg-muted p-3 text-sm text-foreground">{t("agency.memberOf", { name: agency.name })}</p>}
            {overview && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold text-foreground">{t("agency.overview")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                  {[["properties", overview.properties], ["leads", overview.leads], ["deals", overview.deals],
                    ["cProtected", fmtTZS(overview.commission_protected)], ["cPayable", fmtTZS(overview.commission_payable)], ["cPaid", fmtTZS(overview.commission_paid)]].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{t(`agency.${k}`)}</p><p className="font-display text-lg font-semibold text-foreground">{v as any}</p></div>
                  ))}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-muted-foreground">{t("agency.agents")}</h3>
                <ul className="mt-2 divide-y divide-border">
                  {(overview.agents ?? []).map((a: any) => (
                    <li key={a.id} className="flex justify-between py-2 text-sm text-foreground"><span>{a.name ?? "—"}</span><span className="text-muted-foreground">{a.deals} · {fmtTZS(a.protected)}</span></li>
                  ))}
                </ul>
              </section>
            )}
            {isAdmin && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold text-foreground">{t("agency.settings")}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><Label>{t("agency.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>{t("agency.region")}</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
                  <div><Label>{t("agency.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>{t("agency.email")}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <Button className="mt-4 h-11" disabled={busy} onClick={() => run(() => supabase.from("agencies" as any).update({ name: form.name, region: form.region || null, phone: form.phone || null, email: form.email || null } as never).eq("id", agency.id), t("agency.saved"))}>{t("agency.save")}</Button>
              </section>
            )}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold text-foreground">{t("agency.team")}</h2>
              <ul className="mt-2 divide-y divide-border">
                <li className="flex justify-between py-2 text-sm text-foreground"><span>{names[agency.admin_id] || "—"}</span><span className="text-muted-foreground">{t("agency.admin")}</span></li>
                {members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-foreground">
                    <span>{(m.user_id && names[m.user_id]) || m.invited_email}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {t(`agency.${m.role}`)} · {t(`agency.${m.status === "invited" ? "pending" : m.status}`)}
                      {(isAdmin || m.user_id === user?.id) && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => (supabase.rpc as any)("remove_agency_member", { _member_id: m.id }), t("agency.removed"))}>{m.user_id === user?.id ? t("agency.leave") : t("agency.remove")}</Button>}
                    </span>
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <div className="mt-4">
                  <Label>{t("agency.invite")}</Label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <Input type="email" placeholder={t("agency.inviteEmail")} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                    <Button className="h-10" disabled={busy || !inviteEmail.includes("@")} onClick={() => run(() => (supabase.rpc as any)("invite_agency_member", { _agency: agency.id, _email: inviteEmail }), t("agency.invited")).then(() => setInviteEmail(""))}>{t("agency.inviteSend")}</Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("agency.inviteNote")}</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
