import { MapPin, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { searchFacets, type LocationHitFacet, type RegionFacet } from "@/lib/location-facets";

export type SelectedLocation = {
  region?: string;
  district?: string;
  ward?: string;
};

/** "Sinza, Dar es Salaam" — place names are never translated. */
export function formatLocation(loc: SelectedLocation | null | undefined): string {
  if (!loc) return "";
  const { region, district, ward } = loc;
  if (!region && !district && !ward) return "";
  const leaf = ward ?? district ?? region;
  if (!leaf) return "";
  return leaf === region ? region : `${leaf}, ${region ?? ""}`.replace(/, $/, "");
}

export function hasLocation(loc: SelectedLocation | null | undefined): boolean {
  return Boolean(loc && (loc.region || loc.district || loc.ward));
}

type Props = {
  /** Location currently applied to the search (from URL state, not local state). */
  selected: SelectedLocation | null;
  /** Free text the user is typing (used for keyword search). */
  text: string;
  onTextChange: (v: string) => void;
  onSelect: (hit: LocationHitFacet) => void;
  onClear: () => void;
  facets: RegionFacet[];
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
};

export function LocationSearchInput({
  selected,
  text,
  onTextChange,
  onSelect,
  onClear,
  facets,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const picked = hasLocation(selected);
  const label = picked ? formatLocation(selected) : "";

  // Suggestions are driven purely by what the user typed — never on bare focus.
  // Deferred so fast typing never blocks the input while matches are computed.
  const query = useDeferredValue(text);
  const hits = useMemo(
    () => (picked || query.trim().length < 1 ? [] : searchFacets(facets, query, 6)),
    [facets, query, picked],
  );

  return (
    <div className={cn("relative", className)}>
      {picked ? (
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      ) : (
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        value={picked ? label : text}
        readOnly={picked}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(text.trim().length > 0)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
          if (picked && (e.key === "Backspace" || e.key === "Delete")) {
            e.preventDefault();
            onClear();
          }
        }}
        onClick={() => {
          if (picked) inputRef.current?.blur();
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring",
          picked && "font-medium",
          inputClassName,
        )}
      />
      {picked && (
        <button
          type="button"
          aria-label="Clear location"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClear();
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && !picked && hits.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-elevated)]">
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onSelect(h);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{h.label}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{h.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
