import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { fetchOnboardingStatus, requestManagerOnboarding } from "@/lib/property-managers";

/** Controlled Property Manager onboarding — admin approval grants the capability. */
export function ManagerOnboardingCard() {
  const { user, roles } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void fetchOnboardingStatus(user.id).then(setStatus).catch(() => {});
  }, [user?.id]);

  if (!user || roles.includes("property_manager" as never)) return null;
  const pending = status === "pending" || status === "under_review" || status === "more_info";

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      await requestManagerOnboarding(user.id, notes.trim());
      setStatus("pending");
      toast.success(t("pm.onboardSent"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{t("pm.onboardTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("pm.onboardBody")}</p>
          {pending ? (
            <p className="mt-3 text-sm font-medium text-primary">{t("pm.onboardPending")}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {status === "rejected" && <p className="text-sm font-medium text-destructive">{t("pm.onboardRejected")}</p>}
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2}
                placeholder={t("modeUi.onboardPlaceholder")} />
              <Button onClick={submit} disabled={busy} className="rounded-full">{t("pm.onboardCta")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
