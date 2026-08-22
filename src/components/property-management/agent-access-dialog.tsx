import { useEffect, useState } from "react";
import { Search, Trash2, UserPlus, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import {
  AGENT_PERMISSIONS, assignAgent, fetchPropertyAgents, removeAgent, searchAgents,
  updateAgentPermission, type AgentDirectoryEntry, type AgentPermission, type PropertyAgent,
} from "@/lib/property-agents";

export function AgentAccessDialog({
  open, onOpenChange, propertyId, propertyTitle, ownerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<PropertyAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgentDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [permission, setPermission] = useState<AgentPermission>("view_only");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetchPropertyAgents(propertyId).then((r) => {
      if (alive) { setRows(r); setLoading(false); }
    });
    return () => { alive = false; };
  }, [open, propertyId]);

  async function runSearch() {
    setSearching(true);
    setResults(await searchAgents(query));
    setSearching(false);
  }

  async function add(agent: AgentDirectoryEntry) {
    try {
      await assignAgent(propertyId, ownerId, agent.id, permission);
      setRows(await fetchPropertyAgents(propertyId));
      setQuery("");
      setResults([]);
      toast.success(t("spaces.agents.assigned"));
    } catch (e: any) {
      toast.error(e?.message ?? t("spaces.agents.assignFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t("spaces.agents.title")}
          </DialogTitle>
          <DialogDescription>{t("spaces.agents.subtitle", { title: propertyTitle })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search + add */}
          <div className="space-y-2 rounded-xl border border-border/60 p-3">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("spaces.agents.addAgent")}
            </label>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder={t("spaces.agents.searchPlaceholder")}
                className="h-10 rounded-lg"
              />
              <Button variant="outline" className="h-10 rounded-lg" onClick={runSearch} disabled={query.trim().length < 3}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <Select value={permission} onValueChange={(v) => setPermission(v as AgentPermission)}>
              <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGENT_PERMISSIONS.map((p) => (
                  <SelectItem key={p} value={p}>{t(`spaces.agents.permission.${p}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => add(r)}
                className="flex w-full items-center gap-2 rounded-lg border border-border/60 p-2 text-left text-sm hover:bg-secondary"
              >
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  {r.full_name ?? t("spaces.agents.unnamed")}
                  {r.agency_name && <span className="text-muted-foreground"> · {r.agency_name}</span>}
                </span>
              </button>
            ))}
            {!searching && query.trim().length >= 3 && results.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("spaces.agents.noResults")}</p>
            )}
          </div>

          {/* Current assignments */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("spaces.agents.none")}</p>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {r.agent_name ?? r.agent_id.slice(0, 8)}
                  </span>
                  <Select
                    value={r.permission}
                    onValueChange={async (v) => {
                      await updateAgentPermission(r.id, v as AgentPermission);
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, permission: v as AgentPermission } : x)));
                      toast.success(t("spaces.agents.updated"));
                    }}
                  >
                    <SelectTrigger className="h-9 w-44 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGENT_PERMISSIONS.map((p) => (
                        <SelectItem key={p} value={p}>{t(`spaces.agents.permission.${p}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive"
                    onClick={async () => {
                      await removeAgent(r.id);
                      setRows((prev) => prev.filter((x) => x.id !== r.id));
                      toast.success(t("spaces.agents.removed"));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
