import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, BadgeCheck, Home, UserCheck, Building2, Upload, Camera,
  Check, X, Clock, AlertCircle, FileText, Loader2, ChevronRight, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VerifiedBadge } from "@/components/trust/verified-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  fetchMyVerifications, submitVerification, uploadVerificationDoc,
  fetchVerificationEvents, STATUS_TONE,
  type VerificationRequest, type VerificationSubject, type VerificationStatus, type VerificationDoc,
  type VerificationEvent,
} from "@/lib/verification-db";

type FieldDef = { key: string; labelKey: string; fallback: string; type?: "text" | "tel" | "email" | "textarea"; required?: boolean };
type DocDef = { key: string; labelKey: string; fallback: string; required?: boolean };

const SUBJECTS: VerificationSubject[] = ["user", "owner", "agent", "property"];

const SUBJECT_META: Record<VerificationSubject, {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string; titleFallback: string;
  descKey: string; descFallback: string;
  fields: FieldDef[];
  docs: DocDef[];
}> = {
  user: {
    icon: BadgeCheck,
    titleKey: "verify.type.user", titleFallback: "User Verification",
    descKey: "verify.typeDesc.user", descFallback: "Confirm who you are so people know they are dealing with a real person.",
    fields: [
      { key: "full_name", labelKey: "verify.field.fullName", fallback: "Full name", required: true },
      { key: "phone", labelKey: "verify.field.phone", fallback: "Phone number", type: "tel", required: true },
      { key: "email", labelKey: "verify.field.email", fallback: "Email", type: "email", required: true },
    ],
    docs: [
      { key: "photo", labelKey: "verify.doc.photo", fallback: "Profile photo", required: true },
      { key: "id_doc", labelKey: "verify.doc.id", fallback: "Identification document", required: true },
    ],
  },
  owner: {
    icon: Home,
    titleKey: "verify.type.owner", titleFallback: "Owner Verification",
    descKey: "verify.typeDesc.owner", descFallback: "Verify yourself as a property owner to earn the Verified Owner badge.",
    fields: [
      { key: "full_name", labelKey: "verify.field.fullName", fallback: "Full name", required: true },
      { key: "phone", labelKey: "verify.field.phone", fallback: "Phone number", type: "tel", required: true },
      { key: "email", labelKey: "verify.field.email", fallback: "Email", type: "email", required: true },
      { key: "business_name", labelKey: "verify.field.business", fallback: "Business information (if any)" },
    ],
    docs: [
      { key: "photo", labelKey: "verify.doc.photo", fallback: "Profile photo", required: true },
      { key: "id_doc", labelKey: "verify.doc.id", fallback: "Identification document", required: true },
    ],
  },
  agent: {
    icon: UserCheck,
    titleKey: "verify.type.agent", titleFallback: "Agent Verification",
    descKey: "verify.typeDesc.agent", descFallback: "Verify your agency details to earn the Verified Agent badge.",
    fields: [
      { key: "full_name", labelKey: "verify.field.fullName", fallback: "Full name", required: true },
      { key: "phone", labelKey: "verify.field.phone", fallback: "Phone number", type: "tel", required: true },
      { key: "email", labelKey: "verify.field.email", fallback: "Email", type: "email", required: true },
      { key: "agency_name", labelKey: "verify.field.agency", fallback: "Agency / business name", required: true },
    ],
    docs: [
      { key: "photo", labelKey: "verify.doc.photo", fallback: "Profile photo", required: true },
      { key: "id_doc", labelKey: "verify.doc.id", fallback: "Identification document", required: true },
      { key: "license", labelKey: "verify.doc.license", fallback: "Business / license document" },
    ],
  },
  property: {
    icon: Building2,
    titleKey: "verify.type.property", titleFallback: "Property Verification",
    descKey: "verify.typeDesc.property", descFallback: "Submit ownership information for a listing to earn the Verified Space badge.",
    fields: [
      { key: "ownership", labelKey: "verify.field.ownership", fallback: "Ownership information", type: "textarea", required: true },
      { key: "location", labelKey: "verify.field.location", fallback: "Location / plot details", required: true },
      { key: "extra", labelKey: "verify.field.extra", fallback: "Additional information", type: "textarea" },
    ],
    docs: [
      { key: "ownership_doc", labelKey: "verify.doc.ownership", fallback: "Supporting ownership document", required: true },
      { key: "property_photos", labelKey: "verify.doc.propertyPhotos", fallback: "Property photos", required: true },
    ],
  },
};

const STATUS_CLS: Record<VerificationStatus, string> = {
  pending: "bg-muted text-foreground/70 ring-border",
  under_review: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-[color:var(--color-warning-200)]",
  more_info: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-[color:var(--color-warning-200)]",
  approved: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]",
  rejected: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-[color:var(--color-danger-200)]",
};

export function StatusPill({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  const Icon = status === "approved" ? Check : status === "rejected" ? X : status === "more_info" ? AlertCircle : Clock;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
      STATUS_CLS[status],
    )}>
      <Icon className="h-3 w-3" /> {t(`verify.status.${status}`)}
    </span>
  );
}

export function VerificationCenter() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<VerificationSubject | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setRequests(await fetchMyVerifications(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const latest = useMemo(() => {
    const map: Partial<Record<VerificationSubject, VerificationRequest>> = {};
    for (const r of requests) if (!map[r.subject_type]) map[r.subject_type] = r;
    return map;
  }, [requests]);

  const approved = requests.filter((r) => r.status === "approved");

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Approved badges — never shown before approval */}
      <section className="ds-card p-5">
        <div className="ds-caption">{t("verify.myBadges")}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {approved.length === 0 ? (
            <span className="text-sm text-muted-foreground">{t("verify.noBadges")}</span>
          ) : (
            approved.map((r) => (
              <VerifiedBadge
                key={r.id}
                kind={r.subject_type === "property" ? "space" : r.subject_type === "user" ? "identity" : r.subject_type}
                label={t(`verify.badge.${r.subject_type === "property" ? "space" : r.subject_type === "user" ? "identity" : r.subject_type}`)}
                size="sm"
              />
            ))
          )}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> {t("verify.privacyNote")}
        </p>
      </section>

      <Tabs defaultValue="user" className="space-y-4">
        <TabsList className="flex w-full justify-start overflow-x-auto rounded-2xl bg-muted p-1">
          {SUBJECTS.map((s) => {
            const meta = SUBJECT_META[s];
            return (
              <TabsTrigger key={s} value={s} className="shrink-0 gap-2 rounded-xl px-3">
                <meta.icon className="h-3.5 w-3.5" />
                {t(meta.titleKey).replace(" Verification", "").replace("Uhakiki wa ", "")}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SUBJECTS.map((s) => (
          <TabsContent key={s} value={s}>
            <SubjectPanel
              subject={s}
              request={latest[s] ?? null}
              loading={loading}
              onStart={() => setWizard(s)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {wizard && (
        <VerificationWizard
          subject={wizard}
          onClose={() => setWizard(null)}
          onDone={() => { setWizard(null); void load(); }}
        />
      )}
    </div>
  );
}

function SubjectPanel({
  subject, request, loading, onStart,
}: { subject: VerificationSubject; request: VerificationRequest | null; loading: boolean; onStart: () => void }) {
  const { t } = useI18n();
  const meta = SUBJECT_META[subject];
  const [events, setEvents] = useState<VerificationEvent[]>([]);

  useEffect(() => {
    if (!request) { setEvents([]); return; }
    void fetchVerificationEvents(request.id).then(setEvents);
  }, [request]);

  const canSubmit = !request || request.status === "rejected" || request.status === "more_info";

  return (
    <div className="ds-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <meta.icon className="h-4 w-4 text-[color:var(--color-brand-700)]" />
            <h2 className="ds-h-sm">{t(meta.titleKey)}</h2>
          </div>
          <p className="ds-body mt-1 text-muted-foreground">{t(meta.descKey)}</p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : request ? (
          <StatusPill status={request.status} />
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/70 ring-1 ring-inset ring-border">
            {t("verify.status.not_verified")}
          </span>
        )}
      </div>

      {request?.review_reason && (
        <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
          <div className="ds-caption">{t("verify.reviewerNote")}</div>
          <p className="mt-1 text-foreground/80">{request.review_reason}</p>
        </div>
      )}

      {events.length > 0 && (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-500)]" />
              <span>
                <strong className="text-foreground">{t(`verify.event.${e.action}`)}</strong>{" "}
                · {new Date(e.created_at).toLocaleDateString()}
                {e.reason ? ` — ${e.reason}` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}

      <Button onClick={onStart} disabled={!canSubmit} className="h-12 w-full rounded-2xl text-base md:h-11 md:w-auto md:text-sm">
        {request ? t("verify.resubmit") : t("verify.start")} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
      {!canSubmit && (
        <p className="text-xs text-muted-foreground">{t("verify.alreadySubmitted")}</p>
      )}
    </div>
  );
}

function VerificationWizard({
  subject, onClose, onDone,
}: { subject: VerificationSubject; onClose: () => void; onDone: () => void }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const meta = SUBJECT_META[subject];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const p = (profile ?? {}) as Record<string, string | null>;
    return {
      full_name: p.full_name ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      agency_name: p.agency_name ?? "",
      business_name: p.business_name ?? "",
    };
  });
  const [propertyId, setPropertyId] = useState<string>("");
  const [myProperties, setMyProperties] = useState<{ id: string; title: string }[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (subject !== "property" || !user) return;
    void supabase
      .from("properties")
      .select("id,title")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyProperties((data ?? []) as { id: string; title: string }[]));
  }, [subject, user]);

  const steps = ["details", "documents", "review"] as const;
  const progress = ((step + 1) / steps.length) * 100;

  function detailsValid() {
    if (subject === "property" && !propertyId) return false;
    return meta.fields.every((f) => !f.required || (values[f.key] ?? "").trim().length > 1);
  }
  function docsValid() {
    return meta.docs.every((d) => !d.required || files[d.key]);
  }

  async function handleSubmit() {
    if (!user) return;
    setBusy(true);
    try {
      const docs: VerificationDoc[] = [];
      for (const d of meta.docs) {
        const f = files[d.key];
        if (!f) continue;
        const up = await uploadVerificationDoc(user.id, subject, f);
        docs.push({ key: d.key, label: t(d.labelKey), path: up.path, size: up.size, type: up.type });
      }
      await submitVerification({
        requesterId: user.id,
        subject,
        propertyId: subject === "property" ? propertyId : null,
        details: values,
        documents: docs,
        notes: notes || undefined,
      });
      toast.success(t("verify.submittedToast"));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t("verify.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="ds-h-sm">{t(meta.titleKey)}</DialogTitle>
          <DialogDescription>{t(`verify.step.${steps[step]}`)} — {step + 1}/{steps.length}</DialogDescription>
        </DialogHeader>
        <Progress value={progress} className="h-1.5" />

        {step === 0 && (
          <div className="space-y-4">
            {subject === "property" && (
              <div className="space-y-1.5">
                <Label>{t("verify.field.property")}</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder={t("verify.field.propertyPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {myProperties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {meta.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`vf-${f.key}`}>{t(f.labelKey)}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={`vf-${f.key}`} rows={3} maxLength={1000}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`vf-${f.key}`} type={f.type ?? "text"} maxLength={200}
                    className="h-12 rounded-2xl"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {meta.docs.map((d) => (
              <FilePicker
                key={d.key}
                label={`${t(d.labelKey)}${d.required ? " *" : ""}`}
                file={files[d.key] ?? null}
                onPick={(f) => setFiles((s) => ({ ...s, [d.key]: f }))}
              />
            ))}
            <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" /> {t("verify.docsPrivate")}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              {meta.fields.map((f) => (
                <div key={f.key} className="flex justify-between gap-3 py-0.5">
                  <span className="text-muted-foreground">{t(f.labelKey)}</span>
                  <span className="truncate font-medium">{values[f.key] || "—"}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              {meta.docs.map((d) => (
                <div key={d.key} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-muted-foreground">{t(d.labelKey)}</span>
                  <span className="inline-flex items-center gap-1 truncate font-medium">
                    {files[d.key] ? <><FileText className="h-3 w-3" /> {files[d.key]?.name}</> : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-notes">{t("verify.field.notes")}</Label>
              <Textarea id="v-notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 0 && (
            <Button variant="ghost" className="h-12 rounded-2xl md:h-10" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              {t("common.back")}
            </Button>
          )}
          {step < 2 ? (
            <Button
              className="h-12 flex-1 rounded-2xl md:h-10 md:flex-none"
              disabled={step === 0 ? !detailsValid() : !docsValid()}
              onClick={() => setStep((s) => s + 1)}
            >
              {t("common.next")}
            </Button>
          ) : (
            <Button className="h-12 flex-1 rounded-2xl md:h-10 md:flex-none" disabled={busy} onClick={handleSubmit}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {t("verify.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilePicker({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const { t } = useI18n();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {file && <button type="button" onClick={() => onPick(null)} className="text-xs text-muted-foreground hover:text-foreground">{t("common.remove")}</button>}
      </div>
      {file ? (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> {file.name}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => gallery.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> {t("verify.upload")}
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => camera.current?.click()}>
            <Camera className="mr-1.5 h-4 w-4" /> {t("verify.camera")}
          </Button>
        </div>
      )}
      <input ref={gallery} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </div>
  );
}

export { SUBJECT_META, STATUS_TONE };
