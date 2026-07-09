import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, DollarSign, ShieldCheck, Sparkles, Trash2, Pencil, Search as SearchIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFavorites, type SavedSearch, type SearchFilters } from "@/hooks/use-favorites";

const CITIES = ["Any", "Dar es Salaam", "Zanzibar", "Arusha", "Mwanza", "Dodoma"];
const CATEGORIES = ["Any", "House", "Apartment", "Office", "Shop", "Warehouse", "Land", "Commercial Building"];

export function SavedSearchesPanel() {
  const { savedSearches, saveSearch, updateSavedSearch, deleteSavedSearch } = useFavorites();
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Get instant alerts when the right home appears.</p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New saved search
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">No saved searches</p>
            <p className="mt-1 text-sm text-muted-foreground">Save your filters and we'll notify you on new matches.</p>
          </div>
          <Button onClick={() => setCreating(true)}>Create your first search</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {savedSearches.map((s) => (
            <SearchCard
              key={s.id}
              search={s}
              onToggle={(key, val) => updateSavedSearch(s.id, { [key]: val })}
              onEdit={() => setEditing(s)}
              onDelete={() => { deleteSavedSearch(s.id); toast.success("Saved search removed"); }}
            />
          ))}
        </div>
      )}

      <SavedSearchDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={(input) => { saveSearch(input); toast.success("Saved search created"); setCreating(false); }}
      />
      <SavedSearchDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={(input) => { if (editing) { updateSavedSearch(editing.id, input); toast.success("Saved search updated"); setEditing(null); } }}
      />
    </div>
  );
}

function SearchCard({ search, onToggle, onEdit, onDelete }: {
  search: SavedSearch;
  onToggle: (key: "notifyNewMatches" | "notifyPriceChanges" | "notifyVerified", val: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">{search.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{describeFilters(search.filters)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
        <NotifyRow
          icon={<BellRing className="h-4 w-4" />}
          label="New matching properties"
          checked={search.notifyNewMatches}
          onChange={(v) => onToggle("notifyNewMatches", v)}
        />
        <NotifyRow
          icon={<DollarSign className="h-4 w-4" />}
          label="Price changes"
          checked={search.notifyPriceChanges}
          onChange={(v) => onToggle("notifyPriceChanges", v)}
        />
        <NotifyRow
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Newly verified listings"
          checked={search.notifyVerified}
          onChange={(v) => onToggle("notifyVerified", v)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {search.newMatchCount ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> {search.newMatchCount} new match{search.newMatchCount === 1 ? "" : "es"}
          </span>
        ) : <span />}
        <Link
          to="/properties"
          search={{ q: search.filters.query, city: search.filters.city, type: search.filters.listingType } as never}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Run search →
        </Link>
      </div>
    </div>
  );
}

function NotifyRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-foreground/85">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function describeFilters(f: SearchFilters) {
  const parts: string[] = [];
  if (f.listingType && f.listingType !== "any") parts.push(f.listingType === "sale" ? "For sale" : f.listingType === "rent" ? "For rent" : "Commercial");
  if (f.category && f.category !== "Any") parts.push(f.category);
  if (f.city && f.city !== "Any") parts.push(f.city);
  if (f.bedrooms) parts.push(`${f.bedrooms}+ beds`);
  if (f.minPrice || f.maxPrice) parts.push(`${f.minPrice ? f.minPrice.toLocaleString() : "0"} – ${f.maxPrice ? f.maxPrice.toLocaleString() : "∞"}`);
  if (f.verifiedOnly) parts.push("Verified only");
  if (f.query) parts.push(`"${f.query}"`);
  return parts.length ? parts.join(" · ") : "All properties";
}

function SavedSearchDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: SavedSearch | null;
  onSubmit: (input: Omit<SavedSearch, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [filters, setFilters] = useState<SearchFilters>(initial?.filters ?? { listingType: "any", city: "Any", category: "Any" });
  const [notifyNewMatches, setNM] = useState(initial?.notifyNewMatches ?? true);
  const [notifyPriceChanges, setNP] = useState(initial?.notifyPriceChanges ?? true);
  const [notifyVerified, setNV] = useState(initial?.notifyVerified ?? false);

  // Reset on open
  useState(() => undefined);
  if (!open && (name !== (initial?.name ?? "") || filters !== (initial?.filters ?? filters))) {
    // no-op; keep transient state so we don't clobber
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (o) {
        setName(initial?.name ?? "");
        setFilters(initial?.filters ?? { listingType: "any", city: "Any", category: "Any" });
        setNM(initial?.notifyNewMatches ?? true);
        setNP(initial?.notifyPriceChanges ?? true);
        setNV(initial?.notifyVerified ?? false);
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit saved search" : "New saved search"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 3BR in Masaki under $2k" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Listing type</Label>
              <Select value={filters.listingType ?? "any"} onValueChange={(v) => setFilters((f) => ({ ...f, listingType: v as SearchFilters["listingType"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="rent">For rent</SelectItem>
                  <SelectItem value="sale">For sale</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={filters.category ?? "Any"} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Select value={filters.city ?? "Any"} onValueChange={(v) => setFilters((f) => ({ ...f, city: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Min bedrooms</Label>
              <Input type="number" min={0} value={filters.bedrooms ?? ""} onChange={(e) => setFilters((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Min price</Label>
              <Input type="number" value={filters.minPrice ?? ""} onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max price</Label>
              <Input type="number" value={filters.maxPrice ?? ""} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Keyword</Label>
            <Input value={filters.query ?? ""} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} placeholder="Ocean view, garden, penthouse…" />
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Bell className="h-3 w-3" /> Notifications</p>
            <NotifyRow icon={<BellRing className="h-4 w-4" />} label="New matching properties" checked={notifyNewMatches} onChange={setNM} />
            <NotifyRow icon={<DollarSign className="h-4 w-4" />} label="Price changes" checked={notifyPriceChanges} onChange={setNP} />
            <NotifyRow icon={<ShieldCheck className="h-4 w-4" />} label="Newly verified listings" checked={notifyVerified} onChange={setNV} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) { toast.error("Please give your search a name"); return; }
              onSubmit({ name: name.trim(), filters, notifyNewMatches, notifyPriceChanges, notifyVerified });
            }}
          >
            {initial ? "Save changes" : "Save search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
