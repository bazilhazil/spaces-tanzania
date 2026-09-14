import { useRef, useState } from "react";
import { Sparkles, X, Camera, MapPin, Briefcase, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { avatarInitials } from "@/lib/display-name";
import { uploadAvatar, validateAvatarFile, AVATAR_TYPES } from "@/lib/avatar-upload";

export function ProfileCompletionCard() {
  const { user, profile, refresh } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    agency_name: profile?.agency_name ?? "",
    location: profile?.location ?? "",
    avatar_url: profile?.avatar_url ?? "",
  });

  if (!open) return null;
  // Basic onboarding is only about the name — advanced details live in Profile / Verification.
  if (profile?.full_name?.trim()) return null;

  async function pickPhoto(file: File) {
    if (!user) return;
    const problem = validateAvatarFile(file);
    if (problem) return toast.error(t(`profileCard.${problem === "tooLarge" ? "photoTooLarge" : "photoInvalid"}`));
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setForm((f) => ({ ...f, avatar_url: url }));
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    const fullName = form.full_name.trim();
    if (!fullName) return toast.error(t("profileCard.nameRequired"));
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        location: form.location.trim() || null,
        agency_name: form.agency_name.trim() || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(t("profileCard.saved"));
    await refresh();
    setOpen(false);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-[var(--shadow-soft)] md:p-6">
      <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label={t("profileCard.dismiss")}>
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground">{t("profileCard.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("profileCard.subtitle")}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Photo */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-center">
          <Avatar className="h-20 w-20 ring-2 ring-primary/15">
            <AvatarImage src={form.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {avatarInitials({ full_name: form.full_name })}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pickPhoto(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="h-10 rounded-xl"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {form.avatar_url ? t("profileCard.changePhoto") : t("profileCard.uploadPhoto")}
          </Button>
        </div>

        {/* Fields */}
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground" htmlFor="pc-name">
              <User className="h-3.5 w-3.5" /> {t("profileCard.fullName")}
            </Label>
            <Input
              id="pc-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder={t("profileCard.fullNamePlaceholder")}
              className="h-11 rounded-xl"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground" htmlFor="pc-location">
              <MapPin className="h-3.5 w-3.5" /> {t("profileCard.locationOptional")}
            </Label>
            <Input
              id="pc-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t("profileCard.locationPlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground" htmlFor="pc-agency">
              <Briefcase className="h-3.5 w-3.5" /> {t("profileCard.agency")}
            </Label>
            <Input
              id="pc-agency"
              value={form.agency_name}
              onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
              placeholder={t("profileCard.agencyPlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={save} disabled={saving || uploading} className="h-11 rounded-xl">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("profileCard.save")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 rounded-xl">{t("profileCard.skip")}</Button>
      </div>
    </div>
  );
}
