import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Home, Warehouse, Store, Briefcase, Trees, LandPlot,
  ArrowLeft, ArrowRight, Camera, Image as ImageIcon, X, Crop, Star,
  Video, Loader2, Check, Wifi, Zap, Droplets, Shield, Sun, Fan,
  Car, Fence, Trees as GardenIcon, Waves, Cctv, Cog, Dog, Accessibility,
  MapPin, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// ---------- Config ----------
const PROPERTY_TYPES = [
  { value: "house", label: "House", icon: Home },
  { value: "apartment", label: "Apartment", icon: Building2 },
  { value: "office", label: "Office", icon: Briefcase },
  { value: "shop", label: "Shop", icon: Store },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "land", label: "Land", icon: LandPlot },
  { value: "commercial", label: "Commercial Building", icon: Trees },
] as const;

const AMENITIES = [
  { value: "electricity", label: "Electricity", icon: Zap },
  { value: "water", label: "Water", icon: Droplets },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "parking", label: "Parking", icon: Car },
  { value: "security", label: "Security", icon: Shield },
  { value: "fence", label: "Fence", icon: Fence },
  { value: "garden", label: "Garden", icon: GardenIcon },
  { value: "pool", label: "Swimming Pool", icon: Waves },
  { value: "cctv", label: "CCTV", icon: Cctv },
  { value: "solar", label: "Solar", icon: Sun },
  { value: "generator", label: "Generator", icon: Cog },
  { value: "ac", label: "Air Conditioning", icon: Fan },
  { value: "pets", label: "Pet Friendly", icon: Dog },
  { value: "wheelchair", label: "Wheelchair Access", icon: Accessibility },
] as const;

const STEP_LABELS = [
  "Property Type", "Photos", "Location", "Details", "Amenities", "Review", "Publish",
];

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
  isCover: boolean;
  uploading?: boolean;
  progress?: number;
  path?: string;
};

// ---------- Root ----------
function UploadWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>({ step: 1, currency: "TZS", listing_type: "rent", amenities: [] });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ status: "live" | "draft"; id: string } | null>(null);
  const dirtyRef = useRef(false);

  // Load draft once
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setDraft(d);
      setStep(d.step || 1);
    }
  }, []);

  // Auto-save
  useEffect(() => {
    if (!dirtyRef.current) return;
    saveDraft({ ...draft, step });
  }, [draft, step]);

  // Warn on leave
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
      case 1: return draft.property_type ? null : "Please choose a property type";
      case 2: return media.length > 0 ? null : "Upload at least one photo";
      case 3:
        if (!draft.region || !draft.district) return "Region and District are required";
        return null;
      case 4:
        if (!draft.title?.trim()) return "Add a title";
        if (!draft.price || draft.price <= 0) return "Enter a valid price";
        return null;
      default: return null;
    }
  }

  function next() {
    const err = canProceed();
    if (err) return toast.error(err);
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(publish: boolean) {
    if (!user) return toast.error("Please sign in");
    if (media.length === 0) return toast.error("Add at least one photo");
    setSubmitting(true);
    try {
      // 1. Create property row
      const { data: prop, error: pErr } = await supabase
        .from("properties")
        .insert({
          owner_id: user.id,
          property_type: draft.property_type as any,
          listing_type: (draft.listing_type ?? "rent") as any,
          title: draft.title!,
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
          status: publish ? "live" : "draft",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const propertyId = prop.id as string;

      // 2. Upload media sequentially with progress
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, uploading: true, progress: 0 } : x)));
        const finalFile = m.kind === "image" ? await compressImageFile(m.file) : m.file;
        const { path } = await uploadMediaFile(user.id, propertyId, finalFile, (pct) =>
          setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, progress: pct } : x))),
        );
        await supabase.from("property_media").insert({
          property_id: propertyId,
          storage_path: path,
          media_type: m.kind,
          position: i,
          is_cover: m.isCover,
        });
        setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, uploading: false, progress: 100, path } : x)));
      }

      clearDraft();
      dirtyRef.current = false;
      setSuccess({ status: publish ? "live" : "draft", id: propertyId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <SuccessScreen status={success.status} propertyId={success.id} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top progress bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Exit
          </Link>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground truncate">
                Step {step} of 7 · {STEP_LABELS[step - 1]}
              </span>
              <span className="text-muted-foreground">{Math.round((step / 7) * 100)}%</span>
            </div>
            <Progress value={(step / 7) * 100} className="h-1.5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:pt-12">
        <div className="animate-fade-in">
          {step === 1 && <StepType value={draft.property_type} onChange={(v) => setField("property_type", v)} />}
          {step === 2 && <StepPhotos media={media} setMedia={setMedia} />}
          {step === 3 && <StepLocation draft={draft} setField={setField} />}
          {step === 4 && <StepDetails draft={draft} setField={setField} />}
          {step === 5 && <StepAmenities value={draft.amenities ?? []} onChange={(v) => setField("amenities", v)} />}
          {step === 6 && <StepReview draft={draft} media={media} onEdit={setStep} />}
          {step === 7 && <StepPublish onPublish={() => submit(true)} onDraft={() => submit(false)} submitting={submitting} />}
        </div>
      </main>

      {/* Sticky footer nav */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={prev} disabled={step === 1 || submitting} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 7 ? (
            <Button onClick={next} size="lg" className="gap-2 rounded-full px-6">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="text-xs text-muted-foreground">Choose an option above</div>
          )}
        </div>
      </footer>
    </div>
  );
}

// ---------- Step 1: Type ----------
function StepType({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <section>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">What are you listing?</h1>
      <p className="mt-2 text-muted-foreground">Choose the type that best fits your property.</p>
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
                "group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all",
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

// ---------- Step 2: Photos ----------
function StepPhotos({ media, setMedia }: { media: MediaItem[]; setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>> }) {
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const images = media.filter((m) => m.kind === "image");
  const video = media.find((m) => m.kind === "video");

  function addFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 30 - images.length;
    const arr = Array.from(files).slice(0, remaining);
    const items: MediaItem[] = arr.map((f, i) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      kind: "image",
      isCover: images.length === 0 && i === 0,
    }));
    setMedia((prev) => [...prev, ...items]);
  }

  function addVideo(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 100 * 1024 * 1024) return toast.error("Video too large (max 100MB)");
    if (video) setMedia((prev) => prev.filter((m) => m.kind !== "video"));
    setMedia((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file: f, previewUrl: URL.createObjectURL(f), kind: "video", isCover: false },
    ]);
  }

  function remove(id: string) {
    setMedia((prev) => {
      const removed = prev.find((m) => m.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const rest = prev.filter((m) => m.id !== id);
      // ensure a cover exists
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

  function move(id: string, dir: -1 | 1) {
    setMedia((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }

  return (
    <section>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Add your photos</h1>
      <p className="mt-2 text-muted-foreground">
        Upload up to 30 photos. The first photo becomes your cover — buyers see it first.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={cn(
          "mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/40",
        )}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ImageIcon className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium">Drag photos here or</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="gap-2 rounded-full">
            <ImageIcon className="h-4 w-4" /> Choose from gallery
          </Button>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="gap-2 rounded-full">
            <Camera className="h-4 w-4" /> Take photo
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
        <p className="mt-3 text-xs text-muted-foreground">JPG, PNG · auto-compressed · max 30 photos</p>
      </div>

      {images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.filter((m) => m.kind === "image").map((m, idx) => (
            <div key={m.id} className="group relative overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={m.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              {m.isCover && (
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  COVER
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" onClick={() => makeCover(m.id)} title="Set as cover" className="rounded-full bg-white/90 p-1.5 text-primary hover:bg-white">
                    <Star className={cn("h-3.5 w-3.5", m.isCover && "fill-current")} />
                  </button>
                  <button type="button" onClick={() => setEditing(m)} title="Edit" className="rounded-full bg-white/90 p-1.5 text-primary hover:bg-white">
                    <Crop className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(m.id, -1)} disabled={idx === 0} className="rounded-full bg-white/90 px-2 py-1 text-xs text-primary hover:bg-white disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => move(m.id, 1)} className="rounded-full bg-white/90 px-2 py-1 text-xs text-primary hover:bg-white">↓</button>
                  <button type="button" onClick={() => remove(m.id)} className="rounded-full bg-white/90 p-1.5 text-destructive hover:bg-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      <div className="mt-8 rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <Video className="h-4 w-4 text-primary" /> Optional walkthrough video
            </h3>
            <p className="text-xs text-muted-foreground">Up to 2 minutes · 100MB max</p>
          </div>
          <Button type="button" variant="outline" onClick={() => videoRef.current?.click()} className="rounded-full">
            {video ? "Replace" : "Upload"}
          </Button>
        </div>
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
        {video && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-3">
            <video src={video.previewUrl} className="h-16 w-24 rounded-lg object-cover" muted />
            <div className="min-w-0 flex-1 truncate text-sm">{video.file.name}</div>
            <button type="button" onClick={() => remove(video.id)} className="rounded-full p-1 hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

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

// ---------- Step 3: Location ----------
function StepLocation({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Where is your property?</h1>
        <p className="mt-2 text-muted-foreground">Drop a pin so buyers can find it easily.</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Region *" hint="e.g. Dar es Salaam">
          <Input value={draft.region ?? ""} onChange={(e) => setField("region", e.target.value)} placeholder="Dar es Salaam" />
        </Field>
        <Field label="District *" hint="e.g. Kinondoni">
          <Input value={draft.district ?? ""} onChange={(e) => setField("district", e.target.value)} placeholder="Kinondoni" />
        </Field>
        <Field label="Ward" hint="e.g. Mikocheni">
          <Input value={draft.ward ?? ""} onChange={(e) => setField("ward", e.target.value)} placeholder="Mikocheni" />
        </Field>
        <Field label="Street" hint="e.g. Chole Road">
          <Input value={draft.street ?? ""} onChange={(e) => setField("street", e.target.value)} placeholder="Chole Road" />
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------- Step 4: Details ----------
function StepDetails({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Tell us the details</h1>
        <p className="mt-2 text-muted-foreground">The clearer the info, the faster you find a buyer.</p>
      </div>

      <Field label="Listing title *" hint="e.g. Modern 3-bedroom apartment in Mikocheni">
        <Input value={draft.title ?? ""} onChange={(e) => setField("title", e.target.value)} placeholder="Modern 3-bedroom apartment in Mikocheni" className="h-11" />
      </Field>

      <div>
        <Label className="text-sm font-semibold">For rent or for sale? *</Label>
        <RadioGroup value={draft.listing_type ?? "rent"} onValueChange={(v) => setField("listing_type", v as any)} className="mt-2 grid grid-cols-2 gap-3">
          {(["rent", "sale"] as const).map((v) => (
            <label key={v} className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition",
              draft.listing_type === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
            )}>
              <RadioGroupItem value={v} />
              <span className="text-sm font-semibold capitalize">For {v}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Price *" hint={draft.listing_type === "rent" ? "Monthly rent amount" : "Total sale price"}>
          <Input type="number" min="0" value={draft.price ?? ""} onChange={(e) => setField("price", Number(e.target.value))} placeholder="500000" className="h-11" />
        </Field>
        <Field label="Currency">
          <select
            value={draft.currency ?? "TZS"}
            onChange={(e) => setField("currency", e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="TZS">TZS</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={!!draft.negotiable} onCheckedChange={(v) => setField("negotiable", !!v)} />
        Price is negotiable
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Bedrooms"><Input type="number" min="0" value={draft.bedrooms ?? ""} onChange={(e) => setField("bedrooms", Number(e.target.value))} className="h-11" /></Field>
        <Field label="Bathrooms"><Input type="number" min="0" value={draft.bathrooms ?? ""} onChange={(e) => setField("bathrooms", Number(e.target.value))} className="h-11" /></Field>
        <Field label="Parking"><Input type="number" min="0" value={draft.parking ?? ""} onChange={(e) => setField("parking", Number(e.target.value))} className="h-11" /></Field>
        <Field label="Area (sqm)"><Input type="number" min="0" value={draft.area_sqm ?? ""} onChange={(e) => setField("area_sqm", Number(e.target.value))} className="h-11" /></Field>
      </div>

      <Field label="Description" hint="Describe the neighborhood, unique features, and what makes it special.">
        <Textarea value={draft.description ?? ""} onChange={(e) => setField("description", e.target.value)} rows={5} placeholder="Spacious apartment with a great view, close to schools and shopping centers…" />
      </Field>
    </section>
  );
}

// ---------- Step 5: Amenities ----------
function StepAmenities({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <section>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Amenities</h1>
      <p className="mt-2 text-muted-foreground">Tap all that apply. This helps buyers filter your listing.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AMENITIES.map((a) => {
          const active = value.includes(a.value);
          const Icon = a.icon;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => toggle(a.value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition",
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Step 6: Review ----------
function StepReview({ draft, media, onEdit }: { draft: WizardDraft; media: MediaItem[]; onEdit: (s: number) => void }) {
  const cover = media.find((m) => m.isCover && m.kind === "image") ?? media.find((m) => m.kind === "image");
  const price = useMemo(() => (draft.price ?? 0).toLocaleString(), [draft.price]);
  const row = (label: string, val?: string | number | null) =>
    val ? <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{val}</span></div> : null;

  return (
    <section>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Review your listing</h1>
      <p className="mt-2 text-muted-foreground">This is what buyers will see. Everything look right?</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {cover && <img src={cover.previewUrl} className="aspect-[16/9] w-full object-cover" alt="" />}
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{draft.title || "Untitled listing"}</h2>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{draft.currency ?? "TZS"} {price}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {draft.listing_type === "sale" ? "For Sale" : "Per month"}{draft.negotiable && " · Negotiable"}
              </div>
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {[draft.ward, draft.district, draft.region].filter(Boolean).join(", ") || "Location TBD"}
          </p>
          {draft.description && <p className="mt-4 text-sm leading-relaxed text-foreground/85">{draft.description}</p>}
          <div className="mt-4 grid grid-cols-4 gap-3 rounded-2xl bg-muted p-3 text-center text-sm">
            <div><div className="font-bold">{draft.bedrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Beds</div></div>
            <div><div className="font-bold">{draft.bathrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Baths</div></div>
            <div><div className="font-bold">{draft.parking ?? "—"}</div><div className="text-xs text-muted-foreground">Parking</div></div>
            <div><div className="font-bold">{draft.area_sqm ?? "—"}</div><div className="text-xs text-muted-foreground">sqm</div></div>
          </div>
          {(draft.amenities?.length ?? 0) > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {draft.amenities!.map((a) => (
                <span key={a} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">{a}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <h3 className="mb-2 font-semibold">Everything at a glance</h3>
        {row("Property type", draft.property_type)}
        {row("Photos", media.filter((m) => m.kind === "image").length)}
        {row("Video", media.find((m) => m.kind === "video") ? "Yes" : "No")}
        {row("Region", draft.region)}
        {row("District", draft.district)}
        {row("Amenities", (draft.amenities?.length ?? 0) + " selected")}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" onClick={() => onEdit(2)} className="rounded-full">Edit photos</Button>
        <Button variant="outline" onClick={() => onEdit(3)} className="rounded-full">Edit location</Button>
        <Button variant="outline" onClick={() => onEdit(4)} className="rounded-full">Edit details</Button>
      </div>
    </section>
  );
}

// ---------- Step 7: Publish ----------
function StepPublish({ onPublish, onDraft, submitting }: { onPublish: () => void; onDraft: () => void; submitting: boolean }) {
  return (
    <section className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold sm:text-3xl">Ready to go live?</h1>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        Publishing makes your listing visible to everyone on SPACES. You can edit or unpublish anytime.
      </p>
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
        <Button size="lg" onClick={onPublish} disabled={submitting} className="h-12 rounded-full text-base">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</> : "Publish Now"}
        </Button>
        <Button size="lg" variant="outline" onClick={onDraft} disabled={submitting} className="h-12 rounded-full text-base">
          Save as Draft
        </Button>
      </div>
    </section>
  );
}

// ---------- Success screen ----------
function SuccessScreen({ status, propertyId }: { status: "live" | "draft"; propertyId: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard/$section", params: { section: "properties" } }), 3500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="max-w-md animate-fade-in text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
        </div>
        <h1 className="mt-8 font-display text-3xl font-semibold">Your property has been submitted 🎉</h1>
        <p className="mt-3 text-muted-foreground">
          Status:{" "}
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
            status === "live" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            {status === "live" ? "Live" : "Draft"}
          </span>
        </p>
        <p className="mt-6 text-sm text-muted-foreground">Redirecting to My Properties…</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/$section" params={{ section: "properties" }}>Go now</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/upload">Publish another</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
