import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Handshake, MessageSquare, ShieldCheck, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { submitVerification } from "@/lib/verification-db";

export const Route = createFileRoute("/become-dalali")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s.ref === "string" ? { ref: s.ref.slice(0, 20) } : {},
  head: () => ({
    meta: [
      { title: "Become a Dalali on SPACES — Get leads, close deals, protect commission" },
      { name: "description", content: "Join SPACES as a Dalali in Tanzania. Get property leads, manage viewings and deals, and have your agreed commission recorded and protected." },
      { property: "og:title", content: "Become a Dalali on SPACES" },
      { property: "og:description", content: "Get leads, manage viewings and deals, and keep your agreed commission protected on SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BecomeDalali,
});

const SERVICES = ["sales", "rentals", "commercial", "land", "management"] as const;

function BecomeDalali() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { ref } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", areas: "", experience: "", services: [] as string[], bio: "", ref: ref ?? "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF((x) => ({ ...x, name: x.name || data.full_name || "", phone: x.phone || data.phone || "" }));
    });
  }, [user?.id]);

  const steps = ["personal", "area", "experience", "services", "referral"] as const;
  const canNext =
    step === 0 ? f.name.trim().length > 1 && f.phone.trim().length >= 9
    : step === 1 ? f.areas.trim().length > 1
    : step === 3 ? f.services.length > 0
    : true;

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      const areas = f.areas.split(",").map((a) => a.trim()).filter(Boolean).slice(0, 10);
      await supabase.from("profiles").update({
        full_name: f.name.trim(), phone: f.phone.trim(), bio: f.bio.trim() || null,
        areas_served: areas, services: f.services,
        experience_years: f.experience ? Math.max(0, Math.min(60, Number(f.experience))) : null,
      } as never).eq("id", user.id);
      if (f.ref.trim()) await supabase.rpc("claim_referral" as never, { _code: f.ref.trim(), _source: "dalali_signup" } as never);
      await submitVerification({
        requesterId: user.id, subject: "agent" as never,
        details: { full_name: f.name.trim(), phone: f.phone.trim(), areas: areas.join(", "), experience_years: f.experience, services: f.services.join(", ") },
        documents: [],
      });
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message || t("s3.dalali.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container-page flex-1 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">{t("s3.dalali.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("s3.dalali.subtitle")}</p>
            <div className="mt-6 space-y-4">
              {([
                ["leads", MessageSquare], ["deals", Handshake], ["commission", Wallet], ["protect", ShieldCheck],
              ] as const).map(([k, Icon]) => (
                <div key={k} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{t(`s3.dalali.how.${k}.title`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`s3.dalali.how.${k}.body`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            {!user ? (
              <div className="space-y-4 text-center">
                <p className="font-semibold text-foreground">{t("s3.dalali.startTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("s3.dalali.startBody")}</p>
                <Button asChild className="w-full"><Link to="/register" search={{ redirect: `/become-dalali${ref ? `?ref=${ref}` : ""}` } as never}>{t("s3.dalali.createAccount")}</Link></Button>
                <Button asChild variant="outline" className="w-full"><Link to="/login" search={{ redirect: "/become-dalali" } as never}>{t("s3.dalali.haveAccount")}</Link></Button>
              </div>
            ) : done ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                <p className="font-display text-xl font-semibold text-foreground">{t("s3.dalali.doneTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("s3.dalali.doneBody")}</p>
                <Button asChild className="w-full"><Link to="/dashboard">{t("s3.dalali.goDashboard")}</Link></Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("s3.dalali.step", { n: step + 1, total: steps.length })} · {t(`s3.dalali.steps.${steps[step]}`)}</p>
                  <Progress value={((step + 1) / steps.length) * 100} className="mt-2" />
                </div>
                {step === 0 && (
                  <div className="space-y-3">
                    <div><Label htmlFor="d-name">{t("s3.dalali.name")}</Label><Input id="d-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></div>
                    <div><Label htmlFor="d-phone">{t("s3.dalali.phone")}</Label><Input id="d-phone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={20} placeholder="07xx xxx xxx" /></div>
                  </div>
                )}
                {step === 1 && (
                  <div><Label htmlFor="d-areas">{t("s3.dalali.areas")}</Label><Input id="d-areas" value={f.areas} onChange={(e) => setF({ ...f, areas: e.target.value })} maxLength={200} placeholder="Masaki, Mikocheni, Mbezi" /><p className="mt-1 text-xs text-muted-foreground">{t("s3.dalali.areasHint")}</p></div>
                )}
                {step === 2 && (
                  <div className="space-y-3">
                    <div><Label htmlFor="d-exp">{t("s3.dalali.experience")}</Label><Input id="d-exp" type="number" min={0} max={60} value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} /></div>
                    <div><Label htmlFor="d-bio">{t("s3.dalali.bio")}</Label><Textarea id="d-bio" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={500} rows={3} /></div>
                  </div>
                )}
                {step === 3 && (
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((s) => {
                      const on = f.services.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => setF({ ...f, services: on ? f.services.filter((x) => x !== s) : [...f.services, s] })}
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}>
                          {t(`s3.dalali.services.${s}`)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {step === 4 && (
                  <div><Label htmlFor="d-ref">{t("s3.dalali.referral")}</Label><Input id="d-ref" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value.toUpperCase() })} maxLength={20} /><p className="mt-1 text-xs text-muted-foreground">{t("s3.dalali.referralHint")}</p></div>
                )}
                <div className="flex gap-2">
                  {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>{t("s3.back")}</Button>}
                  {step < steps.length - 1
                    ? <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>{t("s3.next")}</Button>
                    : <Button className="flex-1" disabled={busy} onClick={submit}>{busy ? t("s3.saving") : t("s3.dalali.submit")}</Button>}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
