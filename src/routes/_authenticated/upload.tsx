import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Home, Warehouse, Store, Briefcase, LandPlot, Building,
  ArrowLeft, ArrowRight, X, Star,
  Loader2, Check, MapPin, Sparkles, Save,
  Zap, Droplet, ParkingCircle, Fence, Shield, Cctv, Waves, Trees,
  Sun, Fuel, Wind, PawPrint, Accessibility, Wifi, Phone, MessageCircle,
  User, Pencil,
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
import { watermarkImage } from "@/lib/image-watermark";
import { generateVideoThumbnail } from "@/lib/video-utils";
import { LocationMapPicker } from "@/components/upload-wizard/location-map-picker";
import {
  PhotoManager, type MediaItem,
  computeListingScore, ListingScoreBadge, ListingScorePanel,
} from "@/components/upload-wizard/photo-manager";

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
  { value: "commercial", label: "Commercial", icon: Building },
  { value: "land", label: "Land", icon: LandPlot },
] as const;

const AMENITIES = [
  { value: "electricity", label: "Electricity", icon: Zap },
  { value: "water", label: "Water", icon: Droplet },
  { value: "parking", label: "Parking", icon: ParkingCircle },
  { value: "fence", label: "Fence", icon: Fence },
  { value: "security", label: "Security", icon: Shield },
  { value: "cctv", label: "CCTV", icon: Cctv },
  { value: "pool", label: "Swimming Pool", icon: Waves },
  { value: "garden", label: "Garden", icon: Trees },
  { value: "solar", label: "Solar", icon: Sun },
  { value: "generator", label: "Generator", icon: Fuel },
  { value: "ac", label: "Air Conditioning", icon: Wind },
  { value: "pets", label: "Pet Friendly", icon: PawPrint },
  { value: "wheelchair", label: "Wheelchair Access", icon: Accessibility },
  { value: "internet", label: "Internet", icon: Wifi },
] as const;

const STEP_LABELS = ["Photos", "Type", "Details", "Location", "Amenities", "Contact", "Preview", "Publish"];
const TOTAL = 8;

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
  const [draft, setDraft] = useState<WizardDraft>({
    step: 1, currency: "TZS", listing_type: "rent", amenities: [], preferred_contact: "both",
  });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedTick, setSavedTick] = useState<number>(0);
  const [success, setSuccess] = useState<{ status: "live" | "draft"; id?: string } | null>(null);
  const dirtyRef = useRef(false);
  const draftRef = useRef(draft);
  const stepRef = useRef(step);
  draftRef.current = draft;
  stepRef.current = step;

  // Prefill contact from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setDraft((p) => ({
        ...p,
        contact_name: p.contact_name ?? data.full_name ?? undefined,
        contact_phone: p.contact_phone ?? data.phone ?? undefined,
        contact_whatsapp: p.contact_whatsapp ?? data.phone ?? undefined,
      }));
    });
  }, [user]);

  // Load draft
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setDraft((p) => ({ ...p, ...d }));
      setStep(Math.min(d.step || 1, TOTAL));
    }
  }, []);

  // Auto-save every 5s
  useEffect(() => {
    const iv = setInterval(() => {
      if (!dirtyRef.current) return;
      saveDraft({ ...draftRef.current, step: stepRef.current });
      setSavedTick(Date.now());
      dirtyRef.current = false;
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if ((dirtyRef.current || media.length > 0) && !success) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [success, media.length]);

  const setField = useCallback(<K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => {
    dirtyRef.current = true;
    setDraft((p) => ({ ...p, [k]: v }));
  }, []);

  function canProceed(): string | null {
    switch (step) {
      case 1: return media.some((m) => m.kind === "image") ? null : "Add at least one photo";
      case 2: return draft.property_type ? null : "Pick a property type";
      case 3:
        if (!draft.price || draft.price <= 0) return "Enter a price";
        return null;
      case 4:
        if (!draft.region?.trim() || !draft.district?.trim()) return "Region and district are required";
        return null;
      case 6:
        if (!draft.contact_name?.trim()) return "Add your name";
        if (!draft.contact_phone?.trim()) return "Add a phone number";
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

  const autoTitle = useMemo(() => {
    const type = PROPERTY_TYPES.find((t) => t.value === draft.property_type)?.label ?? "Property";
    const place = draft.ward || draft.district || draft.region;
    const beds = draft.bedrooms ? `${draft.bedrooms}-bed ` : "";
    return place ? `${beds}${type} in ${place}` : `${beds}${type}`;
  }, [draft.property_type, draft.ward, draft.district, draft.region, draft.bedrooms]);

  async function submit(mode: "publish" | "draft") {
    if (!user) return toast.error("Please sign in");
    if (mode === "publish" && !media.some((m) => m.kind === "image")) return toast.error("Add at least one photo");
    setSubmitting(true);
    try {
      const title = (draft.title?.trim() || autoTitle);
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
          floor: draft.floor ?? null,
          year_built: draft.year_built ?? null,
          region: draft.region ?? null,
          district: draft.district ?? null,
          ward: draft.ward ?? null,
          street: draft.street ?? null,
          address: draft.address ?? null,
          landmark: draft.landmark ?? null,
          latitude: draft.latitude ?? null,
          longitude: draft.longitude ?? null,
          amenities: draft.amenities ?? [],
          contact_name: draft.contact_name ?? null,
          contact_phone: draft.contact_phone ?? null,
          contact_whatsapp: draft.contact_whatsapp ?? null,
          preferred_contact: draft.preferred_contact ?? null,
          status: mode === "publish" ? "live" : "draft",
        } as any)
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
      setSuccess({ status: mode === "publish" ? "live" : "draft", id: propertyId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <SuccessScreen status={success.status} />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Exit</Link>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate font-semibold text-foreground">
                Step {step} of {TOTAL} · {STEP_LABELS[step - 1]}
              </span>
              <span className="text-muted-foreground">
                {savedTick > 0 ? (
                  <span className="inline-flex items-center gap-1"><Save className="h-3 w-3" /> Saved</span>
                ) : (
                  `${Math.round((step / TOTAL) * 100)}%`
                )}
              </span>
            </div>
            <Progress value={(step / TOTAL) * 100} className="h-1.5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-36 pt-6 sm:pt-10">
        <div key={step} className="animate-fade-in">
          {step === 1 && <StepPhotos media={media} setMedia={setMedia} />}
          {step === 2 && <StepType value={draft.property_type} onChange={(v) => setField("property_type", v)} />}
          {step === 3 && <StepInfo draft={draft} setField={setField} />}
          {step === 4 && <StepLocation draft={draft} setField={setField} />}
          {step === 5 && <StepAmenities value={draft.amenities ?? []} onChange={(v) => setField("amenities", v)} />}
          {step === 6 && <StepContact draft={draft} setField={setField} />}
          {step === 7 && <StepPreview draft={draft} media={media} autoTitle={autoTitle} onEdit={setStep} />}
          {step === 8 && (
            <StepPublish
              submitting={submitting}
              onPublish={() => submit("publish")}
              onDraft={() => submit("draft")}
            />
          )}
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
            <Button onClick={() => submit("publish")} disabled={submitting} size="lg" className="gap-2 rounded-full px-8">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="h-4 w-4" /> Publish now</>}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// STEP 1 — Photos with drag-to-reorder, cover, crop/rotate, video
// ============================================================
function StepPhotos({ media, setMedia }: { media: MediaItem[]; setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>> }) {
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const images = media.filter((m) => m.kind === "image");
  const video = media.find((m) => m.kind === "video");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function addFiles(files: FileList | null, kind: "image" | "video" = "image") {
    if (!files) return;
    if (kind === "video") {
      const f = files[0];
      if (!f) return;
      if (f.size > 60 * 1024 * 1024) return toast.error("Video must be under 60 MB");
      // Replace existing video
      setMedia((prev) => {
        const withoutVideo = prev.filter((m) => m.kind !== "video");
        return [...withoutVideo, {
          id: crypto.randomUUID(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          kind: "video",
          isCover: false,
        }];
      });
      return;
    }
    const remaining = 30 - images.length;
    const arr = Array.from(files).slice(0, remaining);
    if (arr.length === 0) {
      toast.info("You've reached the 30 photo limit");
      return;
    }
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

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setMedia((prev) => {
      const imgs = prev.filter((m) => m.kind === "image");
      const oldIdx = imgs.findIndex((m) => m.id === active.id);
      const newIdx = imgs.findIndex((m) => m.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const reordered = arrayMove(imgs, oldIdx, newIdx);
      const others = prev.filter((m) => m.kind !== "image");
      return [...reordered, ...others];
    });
  }

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Snap your space 📸</h1>
      <p className="mt-2 text-muted-foreground">
        Add up to 30 photos. Drag to reorder. The first one is your cover.
      </p>

      {images.length === 0 ? (
        <div className="mt-8 space-y-3">
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
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent"
          >
            <ImageIcon className="h-4 w-4" /> Choose from gallery
          </button>
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((m) => (
                  <SortablePhoto
                    key={m.id}
                    item={m}
                    onRemove={() => remove(m.id)}
                    onEdit={() => setEditing(m)}
                    onCover={() => makeCover(m.id)}
                  />
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
            </SortableContext>
          </DndContext>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
            >
              <ImageIcon className="h-4 w-4" /> Add from gallery
            </button>
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
            >
              <Video className="h-4 w-4" /> {video ? "Replace video" : "Add a video (optional)"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {images.length} of 30 photos · tap ★ to change cover · drag to reorder · auto-compressed
          </p>

          {video && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <video src={video.previewUrl} className="h-16 w-24 rounded-lg object-cover" muted />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{video.file.name}</div>
                <div className="text-xs text-muted-foreground">Optional walkthrough video</div>
              </div>
              <button
                type="button"
                onClick={() => remove(video.id)}
                className="rounded-full p-2 text-destructive hover:bg-destructive/10"
                aria-label="Remove video"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { addFiles(e.target.files, "video"); e.target.value = ""; }} />

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

function SortablePhoto({
  item, onRemove, onEdit, onCover,
}: {
  item: MediaItem; onRemove: () => void; onEdit: () => void; onCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-muted",
        isDragging && "shadow-2xl ring-2 ring-primary",
      )}
    >
      <img src={item.previewUrl} alt="" className="aspect-square w-full object-cover" />
      {item.isCover && (
        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
          COVER
        </span>
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-foreground/70 shadow touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition sm:opacity-0 group-hover:opacity-100">
        <div className="flex gap-1">
          <button type="button" onClick={onCover} className="rounded-full bg-white/95 p-1.5 text-primary hover:bg-white" aria-label="Set as cover">
            <Star className={cn("h-3.5 w-3.5", item.isCover && "fill-current")} />
          </button>
          <button type="button" onClick={onEdit} className="rounded-full bg-white/95 p-1.5 text-primary hover:bg-white" aria-label="Edit">
            <Crop className="h-3.5 w-3.5" />
          </button>
        </div>
        <button type="button" onClick={onRemove} className="rounded-full bg-white/95 p-1.5 text-destructive hover:bg-white" aria-label="Remove">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2 — Type
// ============================================================
function StepType({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">What kind of space?</h1>
      <p className="mt-2 text-muted-foreground">Pick the option that fits your property.</p>
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
              <div className={cn("grid h-14 w-14 place-items-center rounded-2xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                <Icon className="h-7 w-7" />
              </div>
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// STEP 3 — Property Information
// ============================================================
function StepInfo({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  const listing = draft.listing_type ?? "rent";
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Tell us about it 📝</h1>
        <p className="mt-2 text-muted-foreground">Just the basics. You can polish later.</p>
      </div>

      <Field label="Title (optional — we'll suggest one)">
        <Input
          value={draft.title ?? ""}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Bright 2-bed apartment near the beach"
          className="h-12"
        />
      </Field>

      <Field label="Description (optional)">
        <textarea
          value={draft.description ?? ""}
          onChange={(e) => setField("description", e.target.value)}
          rows={4}
          placeholder="What makes this place special?"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary"
        />
      </Field>

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

      <div>
        <Label className="text-sm font-semibold">Rooms & size</Label>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Bedrooms" value={draft.bedrooms} onChange={(n) => setField("bedrooms", n)} />
          <NumField label="Bathrooms" value={draft.bathrooms} onChange={(n) => setField("bathrooms", n)} />
          <NumField label="Parking" value={draft.parking} onChange={(n) => setField("parking", n)} />
          <NumField label="Size (sqm)" value={draft.area_sqm} onChange={(n) => setField("area_sqm", n)} />
          <NumField label="Floor" value={draft.floor} onChange={(n) => setField("floor", n)} />
          <NumField label="Year built" value={draft.year_built} onChange={(n) => setField("year_built", n)} />
        </div>
      </div>
    </section>
  );
}

function NumField({ label, value, onChange }: { label: string; value?: number; onChange: (n: number | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-11"
        placeholder="—"
      />
    </div>
  );
}

// ============================================================
// STEP 4 — Location
// ============================================================
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

      <Field label="Nearby landmark (optional)">
        <Input
          value={draft.landmark ?? ""}
          onChange={(e) => setField("landmark", e.target.value)}
          placeholder="Opposite Mlimani City"
          className="h-12"
        />
      </Field>

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

// ============================================================
// STEP 5 — Amenities
// ============================================================
function StepAmenities({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function toggle(k: string) {
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  }
  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">What's included? ✨</h1>
      <p className="mt-2 text-muted-foreground">Tap everything your property offers.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AMENITIES.map((a) => {
          const Icon = a.icon;
          const active = value.includes(a.value);
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => toggle(a.value)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all active:scale-[0.98]",
                active
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border hover:border-primary/40 hover:bg-accent",
              )}
            >
              <div className={cn("grid h-12 w-12 place-items-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// STEP 6 — Contact
// ============================================================
function StepContact({ draft, setField }: { draft: WizardDraft; setField: <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => void }) {
  const method = draft.preferred_contact ?? "both";
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">How can buyers reach you? 📞</h1>
        <p className="mt-2 text-muted-foreground">This shows on your listing.</p>
      </div>

      <Field label="Your name *">
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.contact_name ?? ""}
            onChange={(e) => setField("contact_name", e.target.value)}
            className="h-12 pl-9"
            placeholder="Full name"
          />
        </div>
      </Field>

      <Field label="Phone number *">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            value={draft.contact_phone ?? ""}
            onChange={(e) => {
              setField("contact_phone", e.target.value);
              if (!draft.contact_whatsapp) setField("contact_whatsapp", e.target.value);
            }}
            className="h-12 pl-9"
            placeholder="+255 700 000 000"
          />
        </div>
      </Field>

      <Field label="WhatsApp number (optional)">
        <div className="relative">
          <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            value={draft.contact_whatsapp ?? ""}
            onChange={(e) => setField("contact_whatsapp", e.target.value)}
            className="h-12 pl-9"
            placeholder="Same as phone by default"
          />
        </div>
      </Field>

      <div>
        <Label className="text-sm font-semibold">Preferred contact method</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([
            { v: "phone", label: "Call", icon: Phone },
            { v: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            { v: "both", label: "Both", icon: Sparkles },
          ] as const).map((o) => {
            const Icon = o.icon;
            const active = method === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => setField("preferred_contact", o.v)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition active:scale-[0.98]",
                  active ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/70 hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// STEP 7 — Preview
// ============================================================
function StepPreview({
  draft, media, autoTitle, onEdit,
}: {
  draft: WizardDraft; media: MediaItem[]; autoTitle: string; onEdit: (s: number) => void;
}) {
  const images = media.filter((m) => m.kind === "image");
  const cover = images.find((m) => m.isCover) ?? images[0];
  const price = (draft.price ?? 0).toLocaleString();
  const place = [draft.ward, draft.district, draft.region].filter(Boolean).join(", ");
  const typeLabel = PROPERTY_TYPES.find((t) => t.value === draft.property_type)?.label ?? "";
  const amenityChips = (draft.amenities ?? []).map((v) => AMENITIES.find((a) => a.value === v)).filter(Boolean) as typeof AMENITIES[number][];

  const EditBtn = ({ s, label }: { s: number; label: string }) => (
    <button
      type="button"
      onClick={() => onEdit(s)}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground/70 hover:bg-accent"
    >
      <Pencil className="h-3 w-3" /> {label}
    </button>
  );

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Preview 👀</h1>
      <p className="mt-2 text-muted-foreground">Exactly how buyers will see it. Tap any section to edit.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {cover ? (
          <div className="relative">
            <img src={cover.previewUrl} className="aspect-[4/5] w-full object-cover sm:aspect-[16/10]" alt="" />
            <div className="absolute right-3 top-3"><EditBtn s={1} label="Photos" /></div>
            {images.length > 1 && (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                +{images.length - 1} more
              </div>
            )}
          </div>
        ) : (
          <div className="grid aspect-[16/10] place-items-center bg-muted text-muted-foreground">No cover photo</div>
        )}

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">{draft.title || autoTitle}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {place || "Location set"} · {typeLabel}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{draft.currency ?? "TZS"} {price}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {draft.listing_type === "sale" ? "For Sale" : "Per month"}{draft.negotiable && " · Negotiable"}
              </div>
            </div>
          </div>

          <div className="flex justify-end"><EditBtn s={3} label="Details" /></div>

          {(draft.bedrooms || draft.bathrooms || draft.parking || draft.area_sqm) && (
            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-muted p-3 text-center text-sm">
              <div><div className="font-bold">{draft.bedrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Beds</div></div>
              <div><div className="font-bold">{draft.bathrooms ?? "—"}</div><div className="text-xs text-muted-foreground">Baths</div></div>
              <div><div className="font-bold">{draft.parking ?? "—"}</div><div className="text-xs text-muted-foreground">Parking</div></div>
              <div><div className="font-bold">{draft.area_sqm ?? "—"}</div><div className="text-xs text-muted-foreground">sqm</div></div>
            </div>
          )}

          {draft.description && (
            <p className="text-sm leading-relaxed text-foreground/85">{draft.description}</p>
          )}

          {amenityChips.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Amenities</div>
                <EditBtn s={5} label="Edit" />
              </div>
              <div className="flex flex-wrap gap-2">
                {amenityChips.map((a) => {
                  const Icon = a.icon;
                  return (
                    <span key={a.value} className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-foreground/80">
                      <Icon className="h-3.5 w-3.5 text-primary" /> {a.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Contact</div>
              <EditBtn s={6} label="Edit" />
            </div>
            <div className="text-sm text-foreground/80">
              <div>{draft.contact_name || "—"}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {draft.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {draft.contact_phone}</span>}
                {draft.contact_whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {draft.contact_whatsapp}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// STEP 8 — Publish
// ============================================================
function StepPublish({
  submitting, onPublish, onDraft,
}: {
  submitting: boolean; onPublish: () => void; onDraft: () => void;
}) {
  return (
    <section className="space-y-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-9 w-9" />
      </div>
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ready to go live? 🚀</h1>
        <p className="mt-2 text-muted-foreground">Publish now and reach thousands of buyers today.</p>
      </div>

      <div className="space-y-3 pt-2">
        <Button onClick={onPublish} disabled={submitting} size="lg" className="h-14 w-full rounded-full text-base">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="mr-2 h-5 w-5" /> Publish now</>}
        </Button>
        <Button onClick={onDraft} disabled={submitting} variant="outline" size="lg" className="h-14 w-full rounded-full text-base">
          <Save className="mr-2 h-5 w-5" /> Save as draft
        </Button>
      </div>

      <p className="pt-2 text-xs text-muted-foreground">
        By publishing you confirm the information is accurate and the property is yours to list.
      </p>
    </section>
  );
}

// ============================================================
// Success screen
// ============================================================
function SuccessScreen({ status }: { status: "live" | "draft" }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard/$section", params: { section: "properties" } }), 3400);
    return () => clearTimeout(t);
  }, [navigate]);

  const isLive = status === "live";
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="max-w-md animate-fade-in text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
        </div>
        <div className={cn(
          "mt-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          isLive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500" : "bg-amber-500")} />
          {isLive ? "Live" : "Saved as draft"}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">
          {isLive ? "You're live! 🎉" : "Draft saved 💾"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isLive
            ? "Your property is now visible to buyers on SPACES."
            : "You can finish and publish it any time from My Properties."}
        </p>
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
