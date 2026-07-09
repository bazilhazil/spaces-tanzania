import { Link } from "@tanstack/react-router";
import { GitCompare, X } from "lucide-react";
import { properties } from "@/lib/mock-data";
import { useFavorites, MAX_COMPARE_ITEMS } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const { compare, removeFromCompare, clearCompare } = useFavorites();
  if (compare.length === 0) return null;

  const items = compare
    .map((id) => properties.find((p) => p.id === id))
    .filter((p): p is typeof properties[number] => Boolean(p));

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-border/70 bg-background/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GitCompare className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {items.map((p) => (
            <div key={p.id} className="relative shrink-0">
              <img src={p.images[0]} alt={p.title} className="h-11 w-14 rounded-lg object-cover" />
              <button
                onClick={() => removeFromCompare(p.id)}
                className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-foreground shadow ring-1 ring-border hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <span className="ml-1 shrink-0 text-xs text-muted-foreground">
            {items.length} / {MAX_COMPARE_ITEMS}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearCompare}>Clear</Button>
          <Button size="sm" asChild>
            <Link to="/compare">Compare</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
