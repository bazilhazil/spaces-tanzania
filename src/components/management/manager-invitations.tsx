import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { fetchMyAssignments, respondInvite, type ManagementAssignment } from "@/lib/property-managers";

/** Pending invitations addressed to the signed-in user (Accept / Decline). */
export function ManagerInvitations({ onChange }: { onChange?: () => void }) {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [invites, setInvites] = useState<ManagementAssignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    try {
      setInvites((await fetchMyAssignments()).filter((r) => r.status === "invited" && r.manager_id === user.id));
    } catch { /* ignore */ }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  if (!invites.length) return null;

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    try {
      await respondInvite(id, accept);
      toast.success(accept ? t("pm.accepted") : t("pm.declined"));
      await load();
      await refresh();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {invites.map((i) => (
        <div key={i.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("pm.inviteTitle")}</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">{i.property_title || "—"}</p>
          <p className="text-sm text-muted-foreground">{t("pm.owner")}: {i.owner_name || "—"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pm.permissions")}: {i.permission === "view" ? t("pm.permView") : t("pm.permManage")} ·{" "}
            {(i.scopes ?? []).map((s) => t(`pm.scope_${s}`)).join(", ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" disabled={busy === i.id} onClick={() => void respond(i.id, true)}>
              {t("pm.accept")}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" disabled={busy === i.id} onClick={() => void respond(i.id, false)}>
              {t("pm.decline")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
