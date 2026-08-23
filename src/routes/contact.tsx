import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";
import { COMPANY, mailHref, telHref, whatsappHref } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";

type ContactSearch = { subject?: string };

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  validateSearch: (search: Record<string, unknown>): ContactSearch => ({
    subject: typeof search.subject === "string" ? search.subject.slice(0, 160) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact SPACES | Phone, email and WhatsApp support" },
      {
        name: "description",
        content:
          "Reach the SPACES team by phone, email or WhatsApp, or send a message using our contact form. We reply within one business day.",
      },
      { property: "og:title", content: "Contact SPACES" },
      { property: "og:description", content: "Phone, email, WhatsApp and a simple contact form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/contact" }],
  }),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ContactPage() {
  const { lang } = useI18n();
  const c = SITE_CONTENT[lang].contact;
  const search = useSearch({ from: "/contact" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(search.subject ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const em = email.trim();
    const su = subject.trim();
    const ms = message.trim();
    if (!n || !EMAIL_RE.test(em) || !su || !ms || n.length > 120 || su.length > 160 || ms.length > 4000) {
      setError(c.invalid);
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("contact_messages").insert({
      name: n,
      email: em,
      phone: phone.trim().slice(0, 40) || null,
      subject: su,
      message: ms,
      user_id: auth.user?.id ?? null,
    } as never);
    setBusy(false);
    if (err) {
      setError(c.failure);
      return;
    }
    setSent(true);
    setName(""); setEmail(""); setPhone(""); setSubject(""); setMessage("");
  }

  const details = [
    COMPANY.phone && { icon: Phone, label: c.phone, value: COMPANY.phone, href: telHref(COMPANY.phone) },
    COMPANY.email && { icon: Mail, label: c.email, value: COMPANY.email, href: mailHref(COMPANY.email) },
    COMPANY.whatsapp && {
      icon: MessageCircle, label: c.whatsapp, value: COMPANY.whatsapp, href: whatsappHref(COMPANY.whatsapp),
    },
    COMPANY.address && { icon: MapPin, label: c.location, value: COMPANY.address, href: null },
    COMPANY.hours && { icon: Clock, label: c.hours, value: COMPANY.hours, href: null },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string | null }[];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{c.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{c.subtitle}</p>
          </div>
        </section>

        <section className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">{c.detailsTitle}</h2>
            <ul className="mt-5 space-y-4">
              {details.map((d) => (
                <li key={d.label} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <d.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
                    {d.href ? (
                      <a href={d.href} className="break-words text-sm font-medium text-foreground hover:text-primary">
                        {d.value}
                      </a>
                    ) : (
                      <p className="break-words text-sm font-medium text-foreground">{d.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">{c.formTitle}</h2>

            {sent ? (
              <p className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
                {c.success}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ct-name">{c.name}</Label>
                    <Input id="ct-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ct-email">{c.emailField}</Label>
                    <Input id="ct-email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ct-phone">
                      {c.phoneField} <span className="text-xs text-muted-foreground">({c.optional})</span>
                    </Label>
                    <Input id="ct-phone" type="tel" value={phone} maxLength={40} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ct-subject">{c.subject}</Label>
                    <Input id="ct-subject" value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-message">{c.message}</Label>
                  <Textarea id="ct-message" rows={6} value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy} className="w-full rounded-full sm:w-auto sm:justify-self-start">
                  {busy ? c.sending : c.send}
                </Button>
                <p className="text-xs text-muted-foreground">{c.privacyNote}</p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
