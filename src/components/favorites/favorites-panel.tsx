import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderPlus, Heart, Trash2, StickyNote, GitCompare, MoreHorizontal, FolderOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { usePropertiesByIds } from "@/hooks/use-properties-by-ids";
import type { Property } from "@/lib/mock-data";
import { PropertyCard } from "@/components/property-card";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export function FavoritesPanel() {
  const { favorites, folders, createFolder, renameFolder, deleteFolder, removeFavorite, moveFavorite, setNote, toggleCompare, isComparing } = useFavorites();
  const [active, setActive] = useState<string>("all");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);

  const { map: propertyMap } = usePropertiesByIds(favorites.map((f) => f.propertyId));

  const items = useMemo(() => {
    return favorites
      .filter((f) => active === "all" || f.folderId === active)
      .map((f) => ({ fav: f, property: propertyMap.get(f.propertyId) }))
      .filter((x): x is { fav: typeof favorites[number]; property: Property } => Boolean(x.property));
  }, [favorites, active, propertyMap]);

  const noteFav = noteFor ? favorites.find((f) => f.propertyId === noteFor) : null;
  const [noteDraft, setNoteDraft] = useState("");

  return (
    <div className="space-y-6">
      {/* Folder rail */}
      <div className="flex flex-wrap items-center gap-2">
        {folders.map((f) => {
          const count = f.id === "all" ? favorites.length : favorites.filter((x) => x.folderId === f.id).length;
          const isActive = active === f.id;
          return (
            <div key={f.id} className={cn("group flex items-center rounded-full border px-1", isActive ? "border-primary bg-primary/5" : "border-border/60 bg-background hover:border-primary/40")}>
              <button
                onClick={() => setActive(f.id)}
                className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", isActive ? "text-primary" : "text-foreground/70")}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {f.name}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{count}</span>
              </button>
              {f.id !== "all" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="mr-1 grid h-6 w-6 place-items-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRenaming({ id: f.id, name: f.name })}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { deleteFolder(f.id); if (active === f.id) setActive("all"); toast.success("Folder deleted"); }}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setNewFolderOpen(true)}>
          <FolderPlus className="mr-1.5 h-3.5 w-3.5" /> New folder
        </Button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <EmptyFavorites />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ fav, property }) => (
            <div key={fav.propertyId} className="group relative">
              <PropertyCard property={property} />
              {/* Overlay actions */}
              <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="grid h-9 w-9 place-items-center rounded-full bg-background/95 text-foreground/80 shadow-[var(--shadow-soft)] backdrop-blur hover:text-primary">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() => {
                        const r = toggleCompare(fav.propertyId);
                        if (!r.ok) toast.error(r.reason);
                        else toast.success(isComparing(fav.propertyId) ? "Removed from compare" : "Added to compare");
                      }}
                    >
                      <GitCompare className="mr-2 h-3.5 w-3.5" /> {isComparing(fav.propertyId) ? "Remove from compare" : "Add to compare"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setNoteFor(fav.propertyId); setNoteDraft(fav.note ?? ""); }}>
                      <StickyNote className="mr-2 h-3.5 w-3.5" /> {fav.note ? "Edit note" : "Add note"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to folder</div>
                    {folders.map((f) => (
                      <DropdownMenuItem key={f.id} onClick={() => { moveFavorite(fav.propertyId, f.id); toast.success(`Moved to ${f.name}`); }}>
                        <FolderOpen className="mr-2 h-3.5 w-3.5" /> {f.name}
                        {fav.folderId === f.id && <span className="ml-auto text-[10px] text-primary">Current</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { removeFavorite(fav.propertyId); toast.success("Removed from favorites"); }}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove favorite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {fav.note && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-xs text-foreground/80">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p className="line-clamp-2">{fav.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create folder</DialogTitle></DialogHeader>
          <Input placeholder="e.g. Zanzibar getaways" value={folderName} onChange={(e) => setFolderName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!folderName.trim()) return; const f = createFolder(folderName); setActive(f.id); setFolderName(""); setNewFolderOpen(false); toast.success("Folder created"); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename folder</DialogTitle></DialogHeader>
          <Input value={renaming?.name ?? ""} onChange={(e) => setRenaming((r) => r ? { ...r, name: e.target.value } : r)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button onClick={() => { if (renaming) { renameFolder(renaming.id, renaming.name.trim() || "Untitled"); toast.success("Renamed"); setRenaming(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Personal note</DialogTitle></DialogHeader>
          <Textarea rows={5} placeholder="Private notes for your reference…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button onClick={() => { if (noteFor) { setNote(noteFor, noteDraft.trim()); toast.success("Note saved"); setNoteFor(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyFavorites() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Heart className="h-6 w-6" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">No favorites yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any listing to save it here.</p>
      </div>
      <Link to="/properties" className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90">
        Browse properties
      </Link>
    </div>
  );
}
