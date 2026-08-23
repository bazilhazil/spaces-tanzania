import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/hooks/use-i18n";
import {
  createSavedSearch,
  describeFilters,
  updateSavedSearch,
  type AlertFrequency,
  type SavedSearchFilters,
  type SavedSearchRecord,
} from "@/lib/saved-searches-db";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: SavedSearchFilters;
  /** When provided the dialog edits that saved search instead of creating one. */
  existing?: SavedSearchRecord | null;
  onSaved?: () => void;
};

export function SaveSearchDialog({ open, onOpenChange, filters, existing, onSaved }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [frequency, setFrequency] = useState<AlertFrequency>("instant");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? suggestName(filters));
    setAlerts(existing?.alertsEnabled ?? true);
    setFrequency(existing?.frequency ?? "instant");
  }, [open, existing, JSON.stringify(filters)]);

  async function submit() {
    if (!name.trim()) { toast.error(t("saved.nameRequired")); return; }
    setBusy(true);
    if (existing) {
      const ok = await updateSavedSearch(existing.id, { name, alertsEnabled: alerts, frequency });
      setBusy(false);
      if (!ok) { toast.error(t("saved.saveFailed")); return; }
      toast.success(t("saved.updated"));
    } else {
      const res = await createSavedSearch({ name, filters, alertsEnabled: alerts, frequency });
      setBusy(false);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(t("saved.created"));
    }
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{existing ? t("saved.editSearch") : t("saved.saveSearch")}</DialogTitle>
          <DialogDescription className="line-clamp-2">{describeFilters(existing?.filters ?? filters)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ss-name">{t("saved.searchName")}</Label>
            <Input
              id="ss-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("saved.namePlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">{t("saved.alerts")}</p>
              <p className="text-xs text-muted-foreground">{t("saved.alertsHint")}</p>
            </div>
            <Switch checked={alerts} onCheckedChange={setAlerts} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("saved.frequency")}</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as AlertFrequency)} disabled={!alerts}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">{t("saved.freq.instant")}</SelectItem>
                <SelectItem value="daily">{t("saved.freq.daily")}</SelectItem>
                <SelectItem value="weekly">{t("saved.freq.weekly")}</SelectItem>
                <SelectItem value="off">{t("saved.freq.off")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button className="rounded-xl" disabled={busy} onClick={() => void submit()}>
            {busy ? t("saved.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function suggestName(f: SavedSearchFilters): string {
  const bits: string[] = [];
  if (f.beds) bits.push(`${f.beds} bedroom`);
  if (f.category) bits.push(f.category.toLowerCase());
  const place = f.area || f.district || f.city;
  if (place) bits.push(`in ${place}`);
  if (f.maxPrice) bits.push(`under TZS ${f.maxPrice.toLocaleString()}`);
  const s = bits.join(" ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "My search";
}
