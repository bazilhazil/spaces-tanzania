import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LocationMapPicker } from "@/components/upload-wizard/location-map-picker";
import {
  COUNTRIES, TZ_REGION_NAMES, getDistricts, getWards,
  searchLocations, type LocationHit,
} from "@/lib/tz-locations";
import { cn } from "@/lib/utils";

export type TzLocationValue = {
  country?: string;      // "TZ"
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  landmark?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  value: TzLocationValue;
  onChange: (patch: Partial<TzLocationValue>) => void;
  showMap?: boolean;
  className?: string;
};

export function TzLocationPicker({ value, onChange, showMap = true, className }: Props) {
  const country = value.country ?? "TZ";
  const districts = useMemo(() => getDistricts(value.region), [value.region]);
  const wards = useMemo(() => getWards(value.region, value.district), [value.region, value.district]);

  const [q, setQ] = useState("");
  const hits = useMemo(() => searchLocations(q, 8), [q]);
  const [showResults, setShowResults] = useState(false);

  function applyHit(h: LocationHit) {
    onChange({
      country: "TZ",
      region: h.region,
      district: h.district ?? undefined,
      ward: h.ward ?? undefined,
    });
    setQ("");
    setShowResults(false);
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Smart search */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 h-12 ds-focus-ring focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onFocus={() => setShowResults(true)}
            onChange={(e) => { setQ(e.target.value); setShowResults(true); }}
            placeholder="Search region, district, ward or street…"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showResults && q && hits.length > 0 && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-lg)]">
            {hits.map((h, i) => (
              <button
                key={`${h.label}-${i}`}
                type="button"
                onClick={() => applyHit(h)}
                className="flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left last:border-0 hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{h.label}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{h.kind}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {showResults && q && hits.length === 0 && (
          <div className="absolute z-30 mt-2 w-full rounded-2xl border border-border bg-popover p-4 text-sm text-muted-foreground shadow-[var(--shadow-lg)]">
            No matches. Pick from the drop-downs below.
          </div>
        )}
      </div>

      {/* Cascading selects */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Country">
          <Select value={country} onValueChange={(v) => onChange({ country: v })}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Region *">
          <Select
            value={value.region ?? ""}
            onValueChange={(v) => onChange({ region: v, district: undefined, ward: undefined })}
          >
            <SelectTrigger className="h-12"><SelectValue placeholder="Choose a region" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {TZ_REGION_NAMES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="District *">
          <Select
            value={value.district ?? ""}
            onValueChange={(v) => onChange({ district: v, ward: undefined })}
            disabled={!value.region}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={value.region ? "Choose a district" : "Select a region first"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {districts.map((d) => (
                <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Ward">
          <Select
            value={value.ward ?? ""}
            onValueChange={(v) => onChange({ ward: v })}
            disabled={!value.district}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={value.district ? "Choose a ward" : "Select a district first"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {wards.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Street">
          <Input
            value={value.street ?? ""}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="e.g. Chole Road"
            className="h-12"
          />
        </Field>

        <Field label="Nearby landmark">
          <Input
            value={value.landmark ?? ""}
            onChange={(e) => onChange({ landmark: e.target.value })}
            placeholder="e.g. Opposite Mlimani City"
            className="h-12"
          />
        </Field>
      </div>

      {/* Map */}
      {showMap && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Drop a pin on the map
          </Label>
          <LocationMapPicker
            latitude={value.latitude}
            longitude={value.longitude}
            onChange={(v) => onChange({ latitude: v.latitude, longitude: v.longitude, address: v.address })}
          />
          {value.address && (
            <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground/80">{value.address}</span>
            </div>
          )}
          {value.latitude && value.longitude && (
            <p className="text-xs text-muted-foreground">
              GPS: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
