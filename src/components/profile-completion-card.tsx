import { useState } from "react";
import { Sparkles, X, Camera, MapPin, IdCard, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function ProfileCompletionCard() {
  const { user, profile, refresh } = useAuth();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    national_id: profile?.national_id ?? "",
    business_name: profile?.business_name ?? "",
    agency_name: profile?.agency_name ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    avatar_url: profile?.avatar_url ?? "",
  });

  if (!open) return null;
  const complete = profile && (profile.location || profile.bio || profile.avatar_url);
  if (complete) return null;

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    await refresh();
    setOpen(false);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background p-6 shadow-[var(--shadow-soft)]">
      <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Complete your profile</h3>
          <p className="text-sm text-muted-foreground">Optional — helps you stand out and unlock features.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field icon={Camera} label="Profile photo URL">
          <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" className="h-10 rounded-xl" />
        </Field>
        <Field icon={IdCard} label="National ID (optional)">
          <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} placeholder="e.g. 1234567" className="h-10 rounded-xl" />
        </Field>
        <Field icon={Briefcase} label="Business name (optional)">
          <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Business Ltd" className="h-10 rounded-xl" />
        </Field>
        <Field icon={Briefcase} label="Agency name (optional)">
          <Input value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} placeholder="Agency Co." className="h-10 rounded-xl" />
        </Field>
        <Field icon={MapPin} label="Location">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dar es Salaam" className="h-10 rounded-xl" />
        </Field>
        <Field icon={Sparkles} label="Bio">
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A short introduction…" className="min-h-10 rounded-xl" rows={1} />
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <Button onClick={save} disabled={saving} className="rounded-xl">Save profile</Button>
        <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Skip for now</Button>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}
