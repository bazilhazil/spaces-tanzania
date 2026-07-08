import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera, Image as ImageIcon, Video, Trash2, Star, Crop, X, GripVertical,
  Sparkles, ChevronLeft, ChevronRight, ZoomIn, RefreshCw, Droplets,
  ShieldCheck, AlertTriangle, CheckCircle2, Info, Play, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ImageEditorDialog } from "@/components/upload-wizard/image-editor-dialog";
import { analyzeImage, type QualityMetrics } from "@/lib/image-analysis";
import { readVideoMeta, generateVideoThumbnail } from "@/lib/video-utils";

export type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
  isCover: boolean;
  quality?: QualityMetrics;
  analyzing?: boolean;
  thumbUrl?: string;   // for video
  duration?: number;   // for video (seconds)
};

const MAX_PHOTOS = 30;
const VIDEO_MAX_SECONDS = 120;
const VIDEO_MAX_MB = 80;

/* ============================================================
   Score → color helpers
============================================================ */
function scoreColor(s?: number) {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 88) return "bg-emerald-500 text-white";
  if (s >= 72) return "bg-primary text-primary-foreground";
  if (s >= 55) return "bg-amber-500 text-white";
  return "bg-rose-500 text-white";
}
function scoreRing(s?: number) {
  if (s == null) return "ring-border";
  if (s >= 88) return "ring-emerald-500/60";
  if (s >= 72) return "ring-primary/60";
  if (s >= 55) return "ring-amber-500/60";
  return "ring-rose-500/60";
}

/* ============================================================
   PHOTO MANAGER
============================================================ */
export function PhotoManager({
  media, setMedia, watermark, onWatermarkChange,
}: {
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  watermark: boolean;
  onWatermarkChange: (v: boolean) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);

  const images = useMemo(() => media.filter((m) => m.kind === "image"), [media]);
  const video = useMemo(() => media.find((m) => m.kind === "video"), [media]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  /* ---------------- Analyse quality after add / edit ---------------- */
  const analyseQueue = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, analyzing: true } : m)));
      const target = media.find((m) => m.id === id) ?? null;
      const src = target?.previewUrl;
      if (!src) return;
      analyzeImage(src)
        .then((q) => setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, quality: q, analyzing: false } : m))))
        .catch(() => setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, analyzing: false } : m))));
    });
  }, [media, setMedia]);

  // Run analysis for any image that doesn't have quality yet
  useEffect(() => {
    const pending = media.filter((m) => m.kind === "image" && !m.quality && !m.analyzing);
    pending.forEach((m) => {
      setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, analyzing: true } : x)));
      analyzeImage(m.previewUrl)
        .then((q) => setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, quality: q, analyzing: false } : x))))
        .catch(() => setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, analyzing: false } : x))));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length]);

  /* ---------------- Add / remove / cover ---------------- */
  function addImages(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_PHOTOS - images.length;
    const arr = Array.from(files).slice(0, remaining);
    if (arr.length === 0) return toast.info(`You've reached the ${MAX_PHOTOS} photo limit`);
    const newItems: MediaItem[] = arr.map((f, i) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      kind: "image",
      isCover: images.length === 0 && i === 0,
    }));
    setMedia((prev) => [...prev, ...newItems]);
  }

  async function addVideo(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.size > VIDEO_MAX_MB * 1024 * 1024) return toast.error(`Video must be under ${VIDEO_MAX_MB} MB`);
    try {
      const meta = await readVideoMeta(f);
      if (meta.duration > VIDEO_MAX_SECONDS + 1) {
        return toast.error(`Video must be under ${VIDEO_MAX_SECONDS / 60} minutes`);
      }
      let thumbUrl: string | undefined;
      try {
        const thumb = await generateVideoThumbnail(f);
        thumbUrl = URL.createObjectURL(thumb);
      } catch { /* no thumb */ }
      setMedia((prev) => {
        const withoutVideo = prev.filter((m) => m.kind !== "video");
        return [...withoutVideo, {
          id: crypto.randomUUID(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          kind: "video",
          isCover: false,
          thumbUrl,
          duration: meta.duration,
        }];
      });
      toast.success("Video added");
    } catch {
      toast.error("Couldn't read that video");
    }
  }

  function remove(id: string) {
    setMedia((prev) => {
      const removed = prev.find((m) => m.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        if (removed.thumbUrl) URL.revokeObjectURL(removed.thumbUrl);
      }
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

  function triggerReplace(id: string) {
    setReplaceTarget(id);
    replaceRef.current?.click();
  }
  function onReplaceFile(files: FileList | null) {
    const f = files?.[0];
    if (!f || !replaceTarget) return;
    setMedia((prev) => prev.map((m) => {
      if (m.id !== replaceTarget) return m;
      URL.revokeObjectURL(m.previewUrl);
      return {
        ...m,
        file: f,
        previewUrl: URL.createObjectURL(f),
        quality: undefined,
        analyzing: false,
      };
    }));
    setReplaceTarget(null);
  }

  /* ---------------- Aggregate quality ---------------- */
  const avgScore = useMemo(() => {
    const s = images.map((m) => m.quality?.score).filter((n): n is number => typeof n === "number");
    if (!s.length) return null;
    return Math.round(s.reduce((a, b) => a + b, 0) / s.length);
  }, [images]);

  const suggestions = useMemo(() => {
    const list: { photoIndex: number; message: string; tag: QualityMetrics["tag"] }[] = [];
    images.forEach((m, idx) => {
      if (!m.quality) return;
      if (m.quality.tag === "poor" || m.quality.tag === "fair") {
        const first = m.quality.issues[0] ?? "Consider replacing for better visibility";
        list.push({ photoIndex: idx + 1, message: first, tag: m.quality.tag });
      }
    });
    return list.slice(0, 3);
  }, [images]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your photo gallery 📸</h1>
          <p className="mt-2 text-muted-foreground">
            Drag to reorder. Tap ★ to set your cover. AI checks quality automatically.
          </p>
        </div>
        {images.length > 0 && avgScore != null && (
          <div className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm",
            scoreColor(avgScore),
          )}>
            <Sparkles className="h-3.5 w-3.5" />
            Avg quality {avgScore}%
          </div>
        )}
      </div>

      {/* Empty state */}
      {images.length === 0 && !video ? (
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-background to-primary/10 transition hover:border-primary hover:from-primary/10"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Camera className="h-9 w-9" />
            </div>
            <div className="text-center">
              <div className="font-display text-xl font-semibold">Open camera</div>
              <div className="mt-1 text-sm text-muted-foreground">Take bright, wide photos of every room</div>
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
          {/* Grid */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((m, idx) => (
                  <SortablePhoto
                    key={m.id}
                    item={m}
                    index={idx}
                    onRemove={() => remove(m.id)}
                    onEdit={() => setEditing(m)}
                    onCover={() => makeCover(m.id)}
                    onZoom={() => setLightboxIndex(idx)}
                    onReplace={() => triggerReplace(m.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-primary transition hover:border-primary hover:bg-primary/5"
                  aria-label="Add more photos"
                >
                  <Camera className="h-7 w-7 transition group-hover:scale-110" />
                  <span className="text-xs font-medium">Add</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>

          {/* Quick add row */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => galleryRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
              <ImageIcon className="h-4 w-4" /> Gallery
            </button>
            <button type="button" onClick={() => videoRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
              <Video className="h-4 w-4" /> {video ? "Replace video" : "Add video (optional)"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {images.length} of {MAX_PHOTOS} photos · WebP-optimised · auto-saved
          </p>

          {/* AI suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI suggestions
              </div>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-3 text-sm dark:bg-amber-950/20">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-200">Photo {s.photoIndex} — {s.tag}</div>
                    <div className="text-amber-800/90 dark:text-amber-300/90">{s.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Watermark toggle */}
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Watermark my photos</div>
              <div className="text-xs text-muted-foreground">Adds a subtle SPACES badge to discourage copying</div>
            </div>
            <Switch checked={watermark} onCheckedChange={onWatermarkChange} />
          </label>

          {/* Video card */}
          {video && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative">
                {video.thumbUrl ? (
                  <img src={video.thumbUrl} className="aspect-video w-full object-cover" alt="" />
                ) : (
                  <video src={video.previewUrl} className="aspect-video w-full object-cover" muted />
                )}
                <div className="absolute inset-0 grid place-items-center bg-black/25">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-primary shadow-lg">
                    <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                  </div>
                </div>
                {video.duration && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{video.file.name}</div>
                  <div className="text-xs text-muted-foreground">Walkthrough video · max 2 min</div>
                </div>
                <button type="button" onClick={() => remove(video.id)}
                  className="rounded-full p-2 text-destructive hover:bg-destructive/10" aria-label="Remove video">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
      <input ref={replaceRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { onReplaceFile(e.target.files); e.target.value = ""; }} />

      {/* Editor */}
      {editing && (
        <ImageEditorDialog
          src={editing.previewUrl}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onDone={(file) => {
            const url = URL.createObjectURL(file);
            setMedia((prev) => prev.map((m) =>
              m.id === editing.id ? { ...m, file, previewUrl: url, quality: undefined } : m
            ));
          }}
        />
      )}

      {/* Lightbox */}
      {lightboxIndex != null && images[lightboxIndex] && (
        <Lightbox
          items={images}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onCover={(id) => makeCover(id)}
          onEdit={(item) => { setLightboxIndex(null); setEditing(item); }}
          onReplace={(id) => { setLightboxIndex(null); triggerReplace(id); }}
          onRemove={(id) => { remove(id); setLightboxIndex(null); }}
        />
      )}
    </section>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/* ============================================================
   SORTABLE PHOTO TILE
============================================================ */
function SortablePhoto({
  item, index, onRemove, onEdit, onCover, onZoom, onReplace,
}: {
  item: MediaItem;
  index: number;
  onRemove: () => void;
  onEdit: () => void;
  onCover: () => void;
  onZoom: () => void;
  onReplace: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  const s = item.quality?.score;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-muted ring-2 ring-transparent transition",
        isDragging && "scale-[1.03] shadow-2xl ring-primary",
        s != null && !isDragging && `ring-1 ${scoreRing(s)}`,
      )}
    >
      <button type="button" onClick={onZoom} className="block w-full">
        <img src={item.previewUrl} alt="" className="aspect-square w-full object-cover transition group-hover:scale-[1.03]" />
      </button>

      {/* # index */}
      <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-[11px] font-bold text-white">
        {index + 1}
      </span>

      {/* Cover */}
      {item.isCover && (
        <span className="absolute left-10 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow">
          Cover
        </span>
      )}

      {/* Quality chip */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {item.analyzing ? (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/95 text-primary shadow">
            <Loader2 className="h-3 w-3 animate-spin" />
          </span>
        ) : s != null ? (
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow", scoreColor(s))}>
            {s}
          </span>
        ) : null}
        <button type="button" {...attributes} {...listeners}
          className="grid h-6 w-6 touch-none place-items-center rounded-full bg-white/95 text-foreground/70 shadow"
          aria-label="Drag to reorder">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Action bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-2 opacity-100 transition sm:opacity-0 group-hover:opacity-100">
        <div className="pointer-events-auto flex gap-1">
          <IconChip onClick={onCover} label="Cover"><Star className={cn("h-3.5 w-3.5", item.isCover && "fill-current")} /></IconChip>
          <IconChip onClick={onEdit} label="Crop"><Crop className="h-3.5 w-3.5" /></IconChip>
          <IconChip onClick={onReplace} label="Replace"><RefreshCw className="h-3.5 w-3.5" /></IconChip>
          <IconChip onClick={onZoom} label="Zoom"><ZoomIn className="h-3.5 w-3.5" /></IconChip>
        </div>
        <div className="pointer-events-auto">
          <IconChip onClick={onRemove} label="Delete" tone="destructive"><X className="h-3.5 w-3.5" /></IconChip>
        </div>
      </div>
    </div>
  );
}

function IconChip({
  children, onClick, label, tone = "primary",
}: { children: React.ReactNode; onClick: () => void; label: string; tone?: "primary" | "destructive" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "rounded-full bg-white/95 p-1.5 shadow-sm transition hover:bg-white",
        tone === "primary" ? "text-primary" : "text-destructive",
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================
   LIGHTBOX / FULLSCREEN PREVIEW
============================================================ */
function Lightbox({
  items, index, onIndex, onClose, onCover, onEdit, onReplace, onRemove,
}: {
  items: MediaItem[];
  index: number;
  onIndex: (n: number) => void;
  onClose: () => void;
  onCover: (id: string) => void;
  onEdit: (item: MediaItem) => void;
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const item = items[index];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;
  const q = item.quality;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium">{index + 1} / {items.length}</div>
        </div>
        {q && (
          <div className={cn(
            "hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex",
            scoreColor(q.score),
          )}>
            {q.tag === "poor" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Quality {q.score}% · {q.tag}
          </div>
        )}
      </div>

      {/* Image + arrows */}
      <div className="relative flex flex-1 items-center justify-center px-2">
        {index > 0 && (
          <button onClick={() => onIndex(index - 1)}
            className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
            aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <img
          key={item.id}
          src={item.previewUrl}
          alt=""
          className="max-h-full max-w-full animate-fade-in rounded-xl object-contain"
        />
        {index < items.length - 1 && (
          <button onClick={() => onIndex(index + 1)}
            className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
            aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Quality panel */}
      {q && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2">
          <div className="grid grid-cols-4 gap-2 text-center text-white/90">
            <QStat label="Brightness" value={`${Math.round((q.brightness / 255) * 100)}%`} />
            <QStat label="Sharpness" value={q.sharpness > 250 ? "Crisp" : q.sharpness > 120 ? "OK" : "Soft"} />
            <QStat label="Resolution" value={`${q.megapixels} MP`} />
            <QStat label="Orientation" value={q.orientation} />
          </div>
          {q.issues[0] && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/5 p-2.5 text-xs text-white/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              {q.issues[0]}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 px-4 pb-6 pt-3">
        <LbAction onClick={() => onCover(item.id)} icon={<Star className={cn("h-4 w-4", item.isCover && "fill-current text-amber-400")} />} label={item.isCover ? "Cover ✓" : "Set cover"} />
        <LbAction onClick={() => onEdit(item)} icon={<Crop className="h-4 w-4" />} label="Crop / rotate" />
        <LbAction onClick={() => onReplace(item.id)} icon={<RefreshCw className="h-4 w-4" />} label="Replace" />
        <LbAction onClick={() => onRemove(item.id)} icon={<Trash2 className="h-4 w-4" />} label="Delete" tone="destructive" />
      </div>
    </div>
  );
}

function QStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-white/60">{label}</div>
      <div className="text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}

function LbAction({
  onClick, icon, label, tone = "default",
}: { onClick: () => void; icon: React.ReactNode; label: string; tone?: "default" | "destructive" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur transition",
        tone === "destructive"
          ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
          : "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ============================================================
   LISTING SCORE (used in header)
============================================================ */
export function computeListingScore(input: {
  photos: number;
  photoAvgQuality: number | null;
  descriptionLen: number;
  amenities: number;
  hasLocation: boolean;
  hasContact: boolean;
  hasVideo: boolean;
}) {
  // Photos (up to 30 pts)
  const photoCount = Math.min(input.photos, 8) / 8 * 22; // 22 pts for 8+ photos
  const photoQ = input.photoAvgQuality != null ? (input.photoAvgQuality / 100) * 8 : 0;
  const photos = photoCount + photoQ;

  // Description (up to 20)
  const desc = Math.min(input.descriptionLen, 180) / 180 * 20;

  // Amenities (up to 15)
  const amen = Math.min(input.amenities, 6) / 6 * 15;

  // Location (15) + Contact (10) + Video bonus (10)
  const loc = input.hasLocation ? 15 : 0;
  const contact = input.hasContact ? 10 : 0;
  const video = input.hasVideo ? 10 : 0;

  const total = Math.round(photos + desc + amen + loc + contact + video);
  const breakdown = [
    { key: "Photos", got: Math.round(photos), max: 30 },
    { key: "Description", got: Math.round(desc), max: 20 },
    { key: "Amenities", got: Math.round(amen), max: 15 },
    { key: "Location", got: loc, max: 15 },
    { key: "Contact", got: contact, max: 10 },
    { key: "Video", got: video, max: 10 },
  ];
  return { total: Math.min(100, total), breakdown };
}

export function ListingScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "text-emerald-600" : score >= 65 ? "text-primary" : "text-amber-600";
  const ring = score >= 85 ? "stroke-emerald-500" : score >= 65 ? "stroke-primary" : "stroke-amber-500";
  const C = 2 * Math.PI * 14;
  const off = C - (score / 100) * C;
  return (
    <div className="flex items-center gap-2">
      <div className="relative grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 32 32" className="h-9 w-9 -rotate-90">
          <circle cx="16" cy="16" r="14" strokeWidth="3" className="fill-none stroke-border" />
          <circle cx="16" cy="16" r="14" strokeWidth="3" strokeLinecap="round"
            className={cn("fill-none transition-all duration-700", ring)}
            strokeDasharray={C} strokeDashoffset={off} />
        </svg>
        <span className={cn("absolute text-[10px] font-bold", color)}>{score}</span>
      </div>
      <div className="hidden sm:block">
        <div className="text-xs font-semibold text-foreground">Listing quality</div>
        <div className="text-[10px] text-muted-foreground">Higher scores rank first</div>
      </div>
    </div>
  );
}

export function ListingScorePanel({
  score, breakdown,
}: { score: number; breakdown: { key: string; got: number; max: number }[] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing quality</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-primary">{score}%</span>
            <span className="text-sm text-muted-foreground">the more complete, the higher you rank</span>
          </div>
        </div>
        <ShieldCheck className="h-8 w-8 text-primary/40" />
      </div>
      <div className="mt-4 space-y-2.5">
        {breakdown.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-foreground/80">{b.key}</span>
              <span className="text-muted-foreground">{b.got}/{b.max}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                style={{ width: `${(b.got / b.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
