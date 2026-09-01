import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Users, Home, MessageSquare, Calendar, Briefcase, Flag, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import { adminSearch, type AdminSearchResult } from "@/lib/admin-ops";

const ICONS = {
  user: Users, property: Home, lead: MessageSquare, viewing: Calendar, deal: Briefcase, report: Flag,
} as const;

export function AdminSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      adminSearch(q)
        .then((r) => { if (alive) setResults(r); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.ops.search")}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.ops.searchPlaceholder")} className="pl-9" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {q.trim().length < 2 ? t("admin.ops.searchHint") : t("admin.ops.searchEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {results.map((r) => {
                const Icon = ICONS[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => { onOpenChange(false); navigate({ to: "/admin/$section", params: { section: r.section } }); }}
                      className="flex w-full items-center gap-3 py-3 text-left hover:bg-secondary/50"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
