import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, Pencil, Plus, Search as SearchIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaveSearchDialog } from "@/components/favorites/save-search-dialog";
import { useI18n } from "@/hooks/use-i18n";
import {
  countMatches, deleteSavedSearch, describeFilters, listSavedSearches, updateSavedSearch,
  type SavedSearchRecord,
} from "@/lib/saved-searches-db";

export function SavedSearchesPanel() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedSearchRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SavedSearchRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SavedSearchRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listSavedSearches();
    setItems(rows);
    setLoading(false);
    const entries = await Promise.all(rows.map(async (r) => [r.id, await countMatches(r.filters)] as const));
    setCounts(Object.fromEntries(entries));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dateFmt = new Intl.DateTimeFormat(lang === "sw" ? "sw-TZ" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  async function toggleAlerts(s: SavedSearchRecord, on: boolean) {
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, alertsEnabled: on } : x)));
    const ok = await updateSavedSearch(s.id, { alertsEnabled: on, frequency: on && s.frequency === "off" ? "instant" : s.frequency });
    if (!ok) { toast.error(t("saved.saveFailed")); void load(); return; }
    toast.success(on ? t("saved.alertsOn") : t("saved.alertsOff"));
  }

  async function remove(s: SavedSearchRecord) {
    setConfirmDelete(null);
    const ok = await deleteSavedSearch(s.id);
    if (!ok) { toast.error(t("saved.saveFailed")); return; }
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    toast.success(t("saved.deleted"));
  }

  function runSearch(s: SavedSearchRecord) {
    void navigate({ to: "/properties", search: { ...s.filters } as never });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("saved.searchesSubtitle")}</p>
        <Button className="rounded-xl" onClick={() => navigate({ to: "/properties", search: {} as never })}>
          <Plus className="mr-1.5 h-4 w-4" /> {t("saved.newSearch")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">{t("saved.noSearchesTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("saved.noSearchesBody")}</p>
          </div>
          <Button className="rounded-xl" onClick={() => navigate({ to: "/properties", search: {} as never })}>
            {t("saved.findSpace")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-foreground">{s.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{describeFilters(s.filters)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setConfirmDelete(s)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {t("saved.matches", { count: String(counts[s.id] ?? 0) })}
                </span>
                <span>{t("saved.created", { date: dateFmt.format(new Date(s.createdAt)) })}</span>
                <span>
                  {s.lastAlertAt
                    ? t("saved.lastAlert", { date: dateFmt.format(new Date(s.lastAlertAt)) })
                    : t("saved.noAlertYet")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="flex items-center gap-2 text-sm">
                  {s.alertsEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-foreground/85">{t(`saved.freq.${s.alertsEnabled ? s.frequency : "off"}`)}</span>
                  <Switch checked={s.alertsEnabled} onCheckedChange={(v) => void toggleAlerts(s, v)} />
                </div>
                <Button size="sm" className="rounded-xl" onClick={() => runSearch(s)}>
                  {t("saved.searchNow")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SaveSearchDialog
        open={creating}
        onOpenChange={setCreating}
        filters={{}}
        onSaved={() => void load()}
      />
      <SaveSearchDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        filters={editing?.filters ?? {}}
        existing={editing}
        onSaved={() => void load()}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("saved.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("saved.deleteBody", { name: confirmDelete?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => confirmDelete && void remove(confirmDelete)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
