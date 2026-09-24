import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import {
  endManager, fetchMyAssignments, inviteManager, searchManagers,
  type ManagementAssignment, type ManagerCandidate, type ManagerPermission,
} from "@/lib/property-managers";

/** Owner-side "Management" card: assign, change or remove a Property Manager. */
export function ManagerAssignmentCard({ propertyId }: { propertyId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ManagementAssignment[]>([]);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ManagerCandidate[]>([]);
  const [permission, setPermission] = useState<ManagerPermission>("manage");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows((await fetchMyAssignments()).filter((r) => r.property_id === propertyId));
    } catch { /* ignore */ }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [propertyId]);

  useEffect(() => {
    const h = setTimeout(() => { void searchManagers(q).then(setResults).catch(() => setResults([])); }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const current = rows.find((r) => r.status === "active" || r.status === "invited");
  const past = rows.filter((r) => r.status === "ended").slice(0, 3);

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await load(); setPicking(false); setQ(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("pm.section")}</h2>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {current ? (
            <>
              <p className="text-xs text-muted-foreground">{t("pm.current")}</p>
              <p className="truncate font-medium text-foreground">{current.manager_name || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {current.status === "invited" ? t("pm.invited") : current.permission === "view" ? t("pm.permView") : t("pm.permManage")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("pm.none")}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPicking((v) => !v)}>
            {current ? t("pm.change") : t("pm.assign")}
          </Button>
          {current && (
            <Button size="sm" variant="ghost" className="rounded-xl text-destructive" disabled={busy}
              onClick={() => { if (window.confirm(t("pm.removeConfirm"))) void run(() => endManager(current.id)); }}>
              {t("pm.remove")}
            </Button>
          )}
        </div>
      </div>

      {picking && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pm.search")} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("pm.permission")}:</span>
            {(["manage", "view"] as ManagerPermission[]).map((p) => (
              <button key={p} type="button" onClick={() => setPermission(p)}
                className={"rounded-full border px-3 py-1 " + (permission === p ? "border-primary bg-primary/10 text-primary" : "border-border/60")}>
                {p === "manage" ? t("pm.permManage") : t("pm.permView")}
              </button>
            ))}
          </div>
          {q.trim().length >= 3 && results.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("pm.noResults")}</p>
          )}
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.full_name || "—"}</p>
                  {r.agency_name && <p className="truncate text-xs text-muted-foreground">{r.agency_name}</p>}
                </div>
                <Button size="sm" disabled={busy} className="rounded-xl"
                  onClick={() => void run(() => inviteManager(propertyId, r.id, permission), t("pm.invited"))}>
                  {t("pm.sendInvite")}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("pm.ownerNote")}</p>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <p className="font-medium">{t("pm.history")}</p>
          {past.map((p) => (
            <p key={p.id}>{p.manager_name || "—"} · {p.ended_at ? new Date(p.ended_at).toLocaleDateString() : ""}</p>
          ))}
        </div>
      )}
    </section>
  );
}
