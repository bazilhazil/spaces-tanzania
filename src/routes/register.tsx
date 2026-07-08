import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/auth-gate-dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Create your SPACES account" },
      { name: "description", content: "Join SPACES — Tanzania's premium real estate marketplace." },
    ],
  }),
});

type Role = "buyer" | "owner" | "agent";
const ROLE_KEYS: Role[] = ["buyer", "owner", "agent"];

function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [role, setRole] = useState<Role>("buyer");
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error(t("auth.register.errors.passwordMismatch"));
    if (form.password.length < 6) return toast.error(t("auth.register.errors.passwordShort"));
    if (!agree) return toast.error(t("auth.register.errors.acceptTerms"));
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          role,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.register.toastWelcome"));
    navigate({ to: "/dashboard" });
  }

  async function google() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 lg:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_80%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-10 w-10" />
            <span className="font-display text-2xl font-semibold">SPACES</span>
          </Link>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              {t("auth.register.heroTitle")}
            </h2>
            <p className="mt-4 text-primary-foreground/85">
              {t("auth.register.heroBody")}
            </p>
          </div>
          <p className="text-sm text-primary-foreground/70">© 2025 SPACES Group Ltd.</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <Link to="/" className="mb-6 flex items-center gap-2 lg:hidden">
            <Logo className="h-9 w-9" />
            <span className="font-display text-xl font-semibold text-primary">SPACES</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("auth.register.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.register.fullName")}</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={t("auth.register.fullNamePlaceholder")} className="h-11 rounded-xl pl-10" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("auth.register.phone")}</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" required type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t("auth.register.phonePlaceholder")} className="h-11 rounded-xl pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.register.email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={t("auth.register.emailPlaceholder")} className="h-11 rounded-xl pl-10" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw">{t("auth.register.password")}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pw" required type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={t("auth.register.passwordPlaceholder")} className="h-11 rounded-xl pl-10 pr-10" />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? t("auth.login.hidePassword") : t("auth.login.showPassword")}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpw">{t("auth.register.confirm")}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="cpw" required type={show ? "text" : "password"} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} placeholder={t("auth.register.confirmPlaceholder")} className="h-11 rounded-xl pl-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("auth.register.roleLabel")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_KEYS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      role === r
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
                        : "border-border hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{t(`auth.register.roles.${r}.label`)}</div>
                    <div className="text-[11px] text-muted-foreground">{t(`auth.register.roles.${r}.desc`)}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground/80">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <span>
                {t("auth.register.agreePre")}{" "}
                <a href="#" className="text-primary hover:underline">{t("auth.register.terms")}</a>{" "}
                {t("auth.register.and")}{" "}
                <a href="#" className="text-primary hover:underline">{t("auth.register.privacy")}</a>.
              </span>
            </label>

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.register.submit")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("common.or")} <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={google} className="h-11 w-full gap-2 rounded-xl">
            <GoogleIcon /> {t("auth.register.continueGoogle")}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.register.haveAccount")}{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t("auth.register.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
