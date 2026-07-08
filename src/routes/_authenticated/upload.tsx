import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Building2, Home, Warehouse, Store, Briefcase, Trees, LandPlot,
  ArrowLeft, ArrowRight, Camera, Image as ImageIcon, X, Crop, Star,
  Loader2, Check, MapPin, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadDraft, saveDraft, clearDraft, type WizardDraft } from "@/lib/property-draft";
import { compressImageFile, uploadMediaFile } from "@/lib/property-media";
import { LocationMapPicker } from "@/components/upload-wizard/location-map-picker";
import { ImageEditorDialog } from "@/components/upload-wizard/image-editor-dialog";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadWizardPage,
  head: () => ({ meta: [{ title: "Publish your property — SPACES" }] }),
});

const PROPERTY_TYPES = [
  { value: "house", label: "House", icon: Home },
  { value: "apartment", label: "Apartment", icon: Building2 },
  { value: "office", label: "Office", icon: Briefcase },
  { value: "shop", label: "Shop", icon: Store },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "land", label: "Land", icon: LandPlot },
  { value: "commercial", label: "Commercial", icon: Trees },
] as const;

const STEP_LABELS = ["Photos", "Type", "Location", "Price", "Publish"];
const TOTAL = 5;

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
  isCover: boolean;
};

function UploadWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>({ step: 1, currency: "TZS", listing_type: "rent", amenities: [] });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ status: "live"; id: string } | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setDraft(d);
      setStep(Math.min(d.step || 1, TOTAL));
    }
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    saveDraft({ ...draft, step });
  }, [draft, step]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && !success) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [success]);

  const setField = <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => {
    dirtyRef.current = true;
    setDraft((p) => ({ ...p, [k]: v }));
  };

  function canProceed(): string | null {
    switch (step) {
      case 1: return media.length > 0 ? null : "Add at least one photo to continue";
      case 2: return draft.property_type ? null : "Pick a property type";
      case 3:
        if (!draft.region?.trim() || !draft.district?.trim()) return "Region and district are required";
        return null;
      case 4:
        if (!draft.price || draft.price <= 0) return "Enter a price";
        return null;
      default: return null;
    }
  }

  function next() {
    const err = canProceed();
    if (err) return toast.error(err);
    setStep((s) => Math.min(TOTAL, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function autoTitle(): string {
    const type = PROPERTY_TYPES.find((t) => t.value === draft.property_type)?.label ?? "Property";
    const place = draft.ward || draft.district || draft.region;
    const beds = draft.bedrooms ? `${draft.bedrooms}-bed ` : "";
    return place ? `${beds}${type} in ${place}` : `${beds}${type}`;
  }

  async function publish() {
    if (!user) return toast.error("Please sign in");
    if (media.length === 0) return toast.error("Add at least one photo");
    setSubmitting(true);
    try {
      const title = (draft.title?.trim() || autoTitle());
      const { data: prop, error: pErr } = await supabase
        .from("properties")
        .insert({
          owner_id: user.id,
          property_type: draft.property_type as any,
          listing_type: (draft.listing_type ?? "rent") as any,
          title,
          description: draft.description ?? null,
          price: draft.price ?? 0,
          currency: draft.currency ?? "TZS",
          negotiable: !!draft.negotiable,
          bedrooms: draft.bedrooms ?? null,
          bathrooms: draft.bathrooms ?? null,
          parking: draft.parking ?? null,
          area_sqm: draft.area_sqm ?? null,
          region: draft.region ?? null,
          district: draft.district ?? null,
          ward: draft.ward ?? null,
          street: draft.street ?? null,
          address: draft.address ?? null,
          latitude: draft.latitude ?? null,
          longitude: draft.longitude ?? null,
          amenities: draft.amenities ?? [],
          status: "live",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const propertyId = prop.id as string;

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const finalFile = m.kind === "image" ? await compressImageFile(m.file) : m.file;
        const { path } = await uploadMediaFile(user.id, propertyId, finalFile);
        await supabase.from("property_media").insert({
          property_id: propertyId,
          storage_path: path,
          media_type: m.kind,
          position: i,
          is_cover: m.isCover,
        });
      }

      clearDraft();
      dirtyRef.current = false;
      setSuccess({ status: "live", id: propertyId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <SuccessScreen propertyId={success.id} />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Exit</Link>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground truncate">
                Step {step} of {TOTAL} · {STEP_LABELS[step - 1]}
              </span>
              <span className="text-muted-foreground">{Math.round((step / TOTAL) * 100)}%</span>
            </div>
            <Progress value={(step / TOTAL) * 100} className="h-1.5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:pt-10">
        <div key={step} className="animate-fade-in">
          {step === 1 && <StepPhotos media={media} setMedia={setMedia} />}
          {step === 2 && <StepType value={draft.property_type} onChange={(v) => setField("property_type", v)} />}
          {step === 3 && <StepLocation draft={draft} setField={setField} />}
          {step === 4 && <StepPrice draft={draft} setField={setField} />}
          {step === 5 && <StepPublish draft={draft} media={media} autoTitle={autoTitle()} onPublish={publish} submitting={submitting} onEdit={setStep} />}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={prev} disabled={step === 1 || submitting} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < TOTAL ? (
            <Button onClick={next} size="lg" className="gap-2 rounded-full px-8">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={publish} disabled={submitting} size="lg" className="gap-2 rounded-full px-8">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="h-4 w-4" /> Publish now</>}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ---------- Step 1: Photos (camera-first) ----------
function StepPhotos({ media, setMedia }: { media: MediaItem[]; setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>> }) {
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const images = media.filter((m) => m.kind === "image");

  function addFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 30 - images.length;
    const arr = Array.from(files).slice(0, remaining);
    if (arr.length === 0) return;
    const items: MediaItem[] = arr.map((f, i) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      kind: "image",
      isCover: images.length === 0 && i === 0,
    }));
    setMedia((prev) => [...prev, ...items]);
  }

  function remove(id: string) {
    setMedia((prev) => {
      const removed = prev.find((m) => m.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const rest = prev.filter((m) => m.id !== id);
      if (removed?.isCover) {
        const firstImg = rest.find((m) => m.kind === "image");
        if (firstImg) firstImg.isCover = true;
      }
      return rest;
    });
  }
  function makeCover(id: string) {
    setMedia((prev) => prev.map((m) => ({ ...m, isCover: m.id === id && m.kind === "image" })));
  }

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Snap your space 📸</h1>
      <p className="mt-2 text-muted-foreground">Great photos sell faster. The first one becomes your cover.</p>

      {images.length === 0 ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-background to-primary/10 transition hover:border-primary hover:from-primary/10"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Camera className="h-9 w-9" />
            </div>
            <div className="text-center">
              <div className="font-display text-xl font-semibold">Open camera</div>
              <div className="mt-1 text-sm text-muted-foreground">Take photos of every room</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent"
          >
            <ImageIcon className="h-4 w-4" /> Choose from gallery
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((m) => (
              <div key={m.id} className="group relative overflow-hidden rounded-2xl border border-border bg-muted">
                <img src={m.previewUrl} alt="" className="aspect-square w-full object-cover" />
                {m.isCover && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                    COVER
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 sm:opacity-0 transition group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => makeCover(m.id)} className="rounded-full bg-white/95 p-1.5 text-primary hover:bg-white" aria-label="Set as cover">
                      <Star className={cn("h-3.5 w-3.5", m.isCover && "fill-current")} />
                    </button>
                    <button type="button" onClick={() => setEditing(m)} className="rounded-full bg-white/95 p-1.5 text-primary hover:bg-white" aria-label="Edit">
                      <Crop className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(m.id)} className="rounded-full bg-white/95 p-1.5 text-destructive hover:bg-white" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 text-primary transition hover:border-primary hover:bg-primary/5"
              aria-label="Add more photos"
            >
              <Camera className="h-8 w-8" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ImageIcon className="h-4 w-4" /> Add from gallery
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            {images.length} of 30 · tap ★ to change cover · auto-compressed
          </p>
        </>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      {editing && (
        <ImageEditorDialog
          src={editing.previewUrl}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onDone={(file) => {
            const url = URL.createObjectURL(file);
            setMedia((prev) => prev.map((m) => (m.id === editing.id ? { ...m, file, previewUrl: url } : m)));
          }}
        />
      )}
    </section>
  );
}

// ---------- Step 2: Type ----------
function StepType({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">What did you shoot?</h1>
      <p className="mt-2 text-muted-foreground">Pick the type that fits your property.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PROPERTY_TYPES.map((t) => {
          const Icon = t.icon;
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all active:scale-[0.98]",
                active
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border hover:border-primary/40 hover:bg-accent",
              )}
            >
              <div className={cn("grid h-12 w-12 place-items-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Step 3: Location ----------
function StepLocation({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Pin the location 📍</h1>
        <p className="mt-2 text-muted-foreground">Drop a pin or use your current location.</p>
      </div>

      <LocationMapPicker
        latitude={draft.latitude}
        longitude={draft.longitude}
        onChange={(v) => {
          setField("latitude", v.latitude);
          setField("longitude", v.longitude);
          if (v.address) setField("address", v.address);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Region *">
          <Input value={draft.region ?? ""} onChange={(e) => setField("region", e.target.value)} placeholder="Dar es Salaam" className="h-12" />
        </Field>
        <Field label="District *">
          <Input value={draft.district ?? ""} onChange={(e) => setField("district", e.target.value)} placeholder="Kinondoni" className="h-12" />
        </Field>
        <Field label="Ward (optional)">
          <Input value={draft.ward ?? ""} onChange={(e) => setField("ward", e.target.value)} placeholder="Mikocheni" className="h-12" />
        </Field>
        <Field label="Street (optional)">
          <Input value={draft.street ?? ""} onChange={(e) => setField("street", e.target.value)} placeholder="Chole Road" className="h-12" />
        </Field>
      </div>

      {draft.address && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="text-foreground/80">{draft.address}</span>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

// ---------- Step 4: Price ----------
function StepPrice({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  const listing = draft.listing_type ?? "rent";
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Set your price 💰</h1>
        <p className="mt-2 text-muted-foreground">You can adjust this anytime.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["rent", "sale"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setField("listing_type", v)}
            className={cn(
              "rounded-2xl border p-4 text-center font-semibold capitalize transition active:scale-[0.98]",
              listing === v ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/70 hover:bg-accent",
            )}
          >
            For {v}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {listing === "rent" ? "Monthly rent" : "Sale price"}
        </Label>
        <div className="mt-2 flex items-baseline gap-3">
          <select
            value={draft.currency ?? "TZS"}
            onChange={(e) => setField("currency", e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-sm font-semibold"
          >
            <option value="TZS">TZS</option>
            <option value="USD">USD</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={draft.price ?? ""}
            onChange={(e) => setField("price", Number(e.target.value))}
            placeholder="0"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-display text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
            autoFocus
          />
        </div>
        {(draft.price ?? 0) > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {(draft.currency ?? "TZS")} {(draft.price ?? 0).toLocaleString()}
            {listing === "rent" && " / month"}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4">
        <Checkbox checked={!!draft.negotiable} onCheckedChange={(v) => setField("negotiable", !!v)} />
        <div>
          <div className="text-sm font-semibold">Price is negotiable</div>
          <div className="text-xs text-muted-foreground">Buyers can send offers</div>
        </div>
      </label>

      <details className="rounded-2xl border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground/80 hover:text-foreground">
          + Add rooms, size & description (optional)
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid grid-cols-4 gap-2">
            {(["bedrooms", "bathrooms", "parking", "area_sqm"] as const).map((k) => (
              <Field key={k} label={k === "area_sqm" ? "sqm" : k[0].toUpperCase() + k.slice(1)}>
                <Input
                  type="number" min="0"
                  value={(draft[k] as number | undefined) ?? ""}
                  onChange={(e) => setField(k, Number(e.target.value) as any)}
                  className="h-11"
                />
              </Field>
            ))}
          </div>
          <Field label="Description">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              placeholder="What makes this place special?"
              className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>
      </details>
    </section>
  );
}

// ---------- Step 5: Publish ----------
function StepPublish({
  draft, media, autoTitle, onPublish, submitting, onEdit,
}: {
  draft: WizardDraft; media: MediaItem[]; autoTitle: string;
  onPublish: () => void; submitting: boolean; onEdit: (s: number) => void;
}) {
  const cover = media.find((m) => m.isCover && m.kind === "image") ?? media.find((m) => m.kind === "image");
  const price = (draft.price ?? 0).toLocaleString();
  const place = [draft.ward, draft.district, draft.region].filter(Boolean).join(", ");
  const typeLabel = PROPERTY_TYPES.find((t) => t.value === draft.property_type)?.label ?? "";

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your post is ready ✨</h1>
      <p className="mt-2 text-muted-foreground">Preview how it'll look to buyers.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {cover && <img src={cover.previewUrl} className="aspect-[4/5] w-full object-cover sm:aspect-[16/10]" alt="" />}
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{draft.title || autoTitle}</h2>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{draft.currency ?? "TZS"} {price}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {draft.listing_type === "sale" ? "For Sale" : "Per month"}{draft.negotiable && " · Negotiable"}
              </div>
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {place || "Location set"} · {typeLabel}
          </p>
          {draft.description && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{draft.description}</p>}
          {(draft.bedrooms || draft.bathrooms || draft.parking || draft.area_sqm) && (
            <div className="mt-4 grid grid-cols-4 gap-3 rounded-2xl bg-muted p-3 text-center text-sm">
              <div><div className="font-bold">{draft.bedrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Beds</div></div>
              <div><div className="font-bold">{draft.bathrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Baths</div></div>
              <div><div className="font-bold">{draft.parking ?? "—"}</div><div className="text-xs text-muted-foreground">Parking</div></div>
              <div><div className="font-bold">{draft.area_sqm ?? "—"}</div><div className="text-xs text-muted-foreground">sqm</div></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(1)} className="rounded-full">Photos</Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(2)} className="rounded-full">Type</Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(3)} className="rounded-full">Location</Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(4)} className="rounded-full">Price</Button>
      </div>

      <Button onClick={onPublish} disabled={submitting} size="lg" className="mt-6 hidden h-12 w-full rounded-full text-base sm:flex">
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="mr-2 h-4 w-4" /> Publish now</>}
      </Button>
    </section>
  );
}

// ---------- Success ----------
function SuccessScreen({ propertyId }: { propertyId: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard/$section", params: { section: "properties" } }), 3200);
    return () => clearTimeout(t);
  }, [navigate, propertyId]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="max-w-md animate-fade-in text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
        </div>
        <h1 className="mt-8 font-display text-3xl font-semibold">You're live! 🎉</h1>
        <p className="mt-3 text-muted-foreground">Your property is now visible to buyers on SPACES.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/$section" params={{ section: "properties" }}>My Properties</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/upload">Publish another</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
