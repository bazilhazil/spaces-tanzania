import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, Eye, Calendar, DollarSign, Ruler, Camera, MapPin, FileText,
  Pause, Play, Trash2, Star, Upload as UploadIcon, X, Home, Loader2, Save, GripVertical, Check, ExternalLink,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadMediaFile, compressImageFile } from "@/lib/property-media";
import { deletePropertyWithStorage } from "@/lib/property-actions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "@/components/property-management/constants";

export const Route = createFileRoute("/_authenticated/dashboard/properties/$id/manage")({
  component: ManagePropertyPage,
  head: () => ({
    meta: [
      { title: "Manage Listing — SPACES" },
      { name: "description", content: "Manage your property listing on SPACES." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Property = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  status: "draft" | "live" | "archived" | "pending" | "paused" | "sold" | "rented";
  listing_type: "rent" | "sale";
  property_type: string;
  view_count: number;
  created_at: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  region: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_name: string | null;
};

type MediaRow = {
  id: string;
  storage_path: string;
  is_cover: boolean;
  position: number;
  media_type: string;
  url?: string;
};

function ManagePropertyPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prop, setProp] = useState<Property | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "photos" | "settings">("overview");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  function jumpToSection(tab: "overview" | "details" | "photos" | "settings") {
    setActiveTab(tab);
    // Desktop: all sections are visible, so scroll to the anchor.
    // Defer to next frame so the mobile tab has switched first.
    requestAnimationFrame(() => {
      document.getElementById(`section-${tab}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: p, error } = await supabase
        .from("properties").select("*").eq("id", id).maybeSingle();
      if (error || !p) {
        if (alive) { setLoading(false); toast.error("Property not found"); }
        return;
      }
      const { data: m } = await supabase
        .from("property_media")
        .select("id,storage_path,is_cover,position,media_type")
        .eq("property_id", id)
        .order("position");
      const rows = (m ?? []) as MediaRow[];
      const withUrls = await Promise.all(rows.map(async (r) => ({
        ...r, url: (await signedUrl(r.storage_path)) ?? undefined,
      })));
      if (!alive) return;
      setProp(p as Property);
      setMedia(withUrls);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  async function patch(fields: Partial<Property>, label?: string) {
    if (!prop) return false;
    setSaving(true);
    const { error } = await supabase
      .from("properties").update(fields as never).eq("id", prop.id);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    setProp({ ...prop, ...fields });
    setLastSavedAt(Date.now());
    toast.success(label ? `✓ ${label} updated successfully` : "✓ Changes saved");
    return true;
  }

  async function togglePause() {
    if (!prop) return;
    const next = prop.status === "paused" ? "live" : "paused";
    await patch({ status: next as Property["status"] });
  }

  async function doDelete() {
    if (!prop) return;
    try {
      await deletePropertyWithStorage(prop.id);
      toast.success("Property deleted");
      navigate({ to: "/dashboard/properties" });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="mx-auto flex max-w-5xl items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }
  if (!prop) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-5xl py-24 text-center">
          <p className="text-muted-foreground">Property not found.</p>
          <Link to="/dashboard/properties" className="mt-4 inline-block text-primary hover:underline">
            Back to My Properties
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const cover = media.find((m) => m.is_cover) ?? media[0];
  const location = [prop.ward, prop.district, prop.region].filter(Boolean).join(", ") || "Tanzania";

  return (
    <DashboardShell>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <Button
            variant="ghost" size="sm"
            className="shrink-0 gap-1 rounded-lg px-2"
            onClick={() => navigate({ to: "/dashboard/properties" })}
          >
            <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">My Properties</span>
          </Button>
          <h1 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-foreground sm:text-base">
            {prop.title}
          </h1>
          <SaveStatus saving={saving} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-6 pb-28 animate-fade-in">


        {/* HEADER */}
        <header className="overflow-hidden rounded-3xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
          <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64">
            {cover?.url ? (
              <img src={cover.url} alt={prop.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground/40">
                <Home className="h-10 w-10" />
              </div>
            )}
            <div className="absolute left-4 top-4"><StatusBadge status={prop.status} /></div>
          </div>
          <div className="grid gap-3 p-4 sm:p-6">
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold text-foreground sm:text-3xl">{prop.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {location}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> {prop.view_count ?? 0} views</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Created {new Date(prop.created_at).toLocaleDateString()}</span>
              <span className="inline-flex items-center gap-1.5 font-display font-semibold text-primary">
                {prop.currency} {Number(prop.price).toLocaleString()}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile tabs / Desktop full */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6 md:mt-0 md:!block">
            <QuickActions prop={prop} onPauseToggle={togglePause} onDelete={() => setConfirmDelete(true)} onJump={jumpToSection} />
          </TabsContent>

          <TabsContent value="details" className="mt-4 space-y-4 md:mt-6 md:!block">
            <DetailsSection prop={prop} onSave={patch} />
          </TabsContent>

          <TabsContent value="photos" className="mt-4 md:mt-6 md:!block">
            <PhotosSection
              propertyId={prop.id}
              userId={user?.id ?? ""}
              media={media}
              setMedia={setMedia}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4 md:mt-6 md:!block">
            <DangerZone onDelete={() => setConfirmDelete(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky footer action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl sm:flex-none"
            onClick={() => window.open(`/property/${prop.id}`, "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Preview listing</span>
            <span className="sm:hidden">Preview</span>
          </Button>
          <Button
            size="lg"
            className="flex-1 gap-1.5 rounded-xl sm:flex-none"
            disabled={saving}
            onClick={() => {
              toast.success("✓ Changes saved successfully");
              navigate({ to: "/dashboard/properties" });
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Done editing
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this property?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

function SaveStatus({ saving, lastSavedAt }: { saving: boolean; lastSavedAt: number | null }) {
  if (saving) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  return null;
}



function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: "bg-emerald-500/90 text-white",
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/90 text-white",
    paused: "bg-slate-500/90 text-white",
    archived: "bg-slate-500/90 text-white",
    sold: "bg-primary text-primary-foreground",
    rented: "bg-violet-500/90 text-white",
  };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold shadow", map[status] ?? map.draft)}>
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}

function QuickActions({
  prop, onPauseToggle, onJump,
}: {
  prop: Property;
  onPauseToggle: () => void;
  onDelete: () => void;
  onJump: (tab: "overview" | "details" | "photos" | "settings") => void;
}) {
  const items: Array<{
    icon: typeof DollarSign;
    label: string;
    tab?: "details" | "photos" | "settings";
    action?: () => void;
    hint: string;
  }> = [
    { icon: DollarSign, label: "Edit price", tab: "details", hint: `${prop.currency} ${Number(prop.price).toLocaleString()}` },
    { icon: Ruler, label: "Size & details", tab: "details", hint: `${prop.area_sqm ?? "—"} sqm` },
    { icon: Camera, label: "Manage photos", tab: "photos", hint: "Reorder, cover, upload" },
    { icon: MapPin, label: "Edit location", tab: "details", hint: [prop.district, prop.region].filter(Boolean).join(", ") || "Set location" },
    { icon: FileText, label: "Edit description", tab: "details", hint: "Tell buyers more" },
    {
      icon: prop.status === "paused" ? Play : Pause,
      label: prop.status === "paused" ? "Resume listing" : "Pause listing",
      action: onPauseToggle,
      hint: prop.status === "paused" ? "Currently paused" : "Currently active",
    },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={it.action ?? (() => onJump(it.tab!))}
              className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-foreground">{it.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{it.hint}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DetailsSection({
  prop, onSave,
}: { prop: Property; onSave: (f: Partial<Property>, label?: string) => Promise<boolean | undefined> }) {
  return (
    <section id="section-details" className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground">Property details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <EditField label="Title" value={prop.title} onSave={(v) => onSave({ title: v }, "Title")} />
        <EditField
          label="Price" type="number" value={String(prop.price)}
          onSave={(v) => onSave({ price: Number(v) }, "Price")}
        />
        <EditField
          label="Area (sqm)" type="number" value={prop.area_sqm != null ? String(prop.area_sqm) : ""}
          onSave={(v) => onSave({ area_sqm: v === "" ? null : (Number(v) as never) }, "Area")}
        />
        <EditField
          label="Bedrooms" type="number" value={prop.bedrooms != null ? String(prop.bedrooms) : ""}
          onSave={(v) => onSave({ bedrooms: v === "" ? null : Number(v) }, "Bedrooms")}
        />
        <EditField
          label="Bathrooms" type="number" value={prop.bathrooms != null ? String(prop.bathrooms) : ""}
          onSave={(v) => onSave({ bathrooms: v === "" ? null : Number(v) }, "Bathrooms")}
        />
        <EditSelect
          label="Property type" value={prop.property_type}
          options={PROPERTY_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
          onSave={(v) => onSave({ property_type: v }, "Property type")}
        />
        <EditSelect
          label="Listing type" value={prop.listing_type}
          options={[{ value: "rent", label: "For Rent" }, { value: "sale", label: "For Sale" }]}
          onSave={(v) => onSave({ listing_type: v as "rent" | "sale" }, "Listing type")}
        />
        <EditField
          label="Contact phone" value={prop.contact_phone ?? ""}
          onSave={(v) => onSave({ contact_phone: v }, "Contact phone")}
        />
        <EditField
          label="Region" value={prop.region ?? ""}
          onSave={(v) => onSave({ region: v }, "Location")}
        />
        <EditField
          label="District" value={prop.district ?? ""}
          onSave={(v) => onSave({ district: v }, "Location")}
        />
      </div>

      <EditTextArea
        label="Description" value={prop.description ?? ""}
        onSave={(v) => onSave({ description: v }, "Description")}
      />
    </section>
  );
}


function EditField({
  label, value, onSave, type = "text",
}: { label: string; value: string; onSave: (v: string) => Promise<boolean | undefined>; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(value), [value]);
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type={type} value={v} disabled={!editing}
          onChange={(e) => setV(e.target.value)}
          className="h-9 flex-1"
        />
        {editing ? (
          <Button
            size="sm" className="rounded-lg" disabled={saving}
            onClick={async () => {
              if (v === value) { setEditing(false); return; }
              setSaving(true);
              const ok = await onSave(v);
              setSaving(false);
              if (ok) setEditing(false);
            }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>
    </div>
  );
}

function EditSelect({
  label, value, options, onSave,
}: { label: string; value: string; options: { value: string; label: string }[]; onSave: (v: string) => Promise<boolean | undefined> }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Select value={v} onValueChange={setV} disabled={!editing}>
          <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {editing ? (
          <Button
            size="sm" className="rounded-lg"
            onClick={async () => {
              if (v === value) { setEditing(false); return; }
              const ok = await onSave(v);
              if (ok) setEditing(false);
            }}
          ><Save className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>
    </div>
  );
}

function EditTextArea({
  label, value, onSave,
}: { label: string; value: string; onSave: (v: string) => Promise<boolean | undefined> }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(value), [value]);
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {editing ? (
          <Button
            size="sm" className="rounded-lg" disabled={saving}
            onClick={async () => {
              setSaving(true);
              const ok = await onSave(v);
              setSaving(false);
              if (ok) setEditing(false);
            }}
          >{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}</Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>
      <Textarea
        rows={5} value={v} disabled={!editing}
        onChange={(e) => setV(e.target.value)}
        placeholder="Tell buyers about this property…"
        className="mt-2 resize-none"
      />
    </div>
  );
}

function PhotosSection({
  propertyId, userId, media, setMedia,
}: {
  propertyId: string; userId: string; media: MediaRow[];
  setMedia: React.Dispatch<React.SetStateAction<MediaRow[]>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(files: FileList | null) {
    if (!files?.length || !userId) return;
    setUploading(true);
    try {
      const list = Array.from(files);
      const inserts: MediaRow[] = [];
      let nextPos = media.length;
      for (const f of list) {
        const file = f.type.startsWith("image/") ? await compressImageFile(f) : f;
        const { path } = await uploadMediaFile(userId, propertyId, file);
        const isCover = media.length === 0 && inserts.length === 0;
        const { data, error } = await supabase.from("property_media").insert({
          property_id: propertyId,
          storage_path: path,
          media_type: file.type.startsWith("video/") ? "video" : "image",
          position: nextPos++,
          is_cover: isCover,
        } as never).select("id,storage_path,is_cover,position,media_type").single();
        if (error) throw error;
        const url = (await signedUrl((data as MediaRow).storage_path)) ?? undefined;
        inserts.push({ ...(data as MediaRow), url });
      }
      setMedia((prev) => [...prev, ...inserts]);
      toast.success(`Uploaded ${inserts.length} photo${inserts.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(m: MediaRow) {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("property_media").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await supabase.storage.from("property-media").remove([m.storage_path]);
    setMedia((prev) => {
      const next = prev.filter((x) => x.id !== m.id);
      if (m.is_cover && next.length && !next.some((x) => x.is_cover)) {
        void supabase.from("property_media").update({ is_cover: true } as never).eq("id", next[0].id);
        next[0] = { ...next[0], is_cover: true };
      }
      return next;
    });
    toast.success("Photo removed");
  }

  async function setCover(m: MediaRow) {
    await supabase.from("property_media").update({ is_cover: false } as never).eq("property_id", propertyId);
    await supabase.from("property_media").update({ is_cover: true } as never).eq("id", m.id);
    setMedia((prev) => prev.map((x) => ({ ...x, is_cover: x.id === m.id })));
    toast.success("Cover updated");
  }

  async function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...media];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const reindexed = next.map((m, i) => ({ ...m, position: i }));
    setMedia(reindexed);
    await Promise.all(reindexed.map((m) =>
      supabase.from("property_media").update({ position: m.position } as never).eq("id", m.id)
    ));
  }

  return (
    <section id="section-photos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-foreground">Photos ({media.length})</h2>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-2 rounded-xl"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
          Add photos
        </Button>
        <input
          ref={fileRef} type="file" accept="image/*,video/*" multiple hidden
          onChange={(e) => onUpload(e.target.files)}
        />
      </div>

      {media.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 p-10 text-center">
          <Camera className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">No photos yet. Upload to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted",
                dragIdx === i && "opacity-50",
              )}
            >
              {m.media_type === "video" ? (
                <video src={m.url} className="h-full w-full object-cover" />
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              {m.is_cover && (
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
              <div className="absolute right-2 top-2 rounded-md bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {!m.is_cover && (
                  <button
                    onClick={() => setCover(m)}
                    className="flex-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-white"
                  >
                    <Star className="mx-auto h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => removePhoto(m)}
                  className="flex-1 rounded-md bg-red-500/90 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-500"
                >
                  <X className="mx-auto h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Drag photos to reorder. Star to set the cover.</p>
    </section>
  );
}

function DangerZone({ onDelete }: { onDelete: () => void }) {
  return (
    <section id="section-settings" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Danger zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Delete this property. This action cannot be undone.
          </p>
        </div>
        <Button variant="destructive" className="rounded-xl" onClick={onDelete}>
          Delete property
        </Button>
      </div>
    </section>
  );
}
