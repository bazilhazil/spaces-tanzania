import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Brand } from "@/components/brand";
import { redirectPathForRole, type AppRole } from "@/hooks/use-auth";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/auth-gate-dialog";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Welcome back — Sign in to SPACES" },
      { name: "description", content: "Sign in to manage your SPACES listings, favorites, and viewings." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login")) return toast.error("Incorrect email or password.");
      if (msg.includes("email not confirmed")) return toast.error("Please confirm your email before signing in.");
      if (msg.includes("disabled")) return toast.error("This account has been disabled. Contact support.");
      if (msg.includes("network") || msg.includes("fetch")) return toast.error("Network error. Check your connection and try again.");
      return toast.error(error.message);
    }
    toast.success(t("auth.login.welcomeToast"));

    // Look up role before redirecting so we land on the right surface.
    let primary: AppRole = "buyer";
    if (data.user) {
      const { data: rows } = await sb.from("user_roles").select("role").eq("user_id", data.user.id);
      const roles = ((rows ?? []) as { role: AppRole }[]).map((r) => r.role);
      const priority: AppRole[] = ["super_admin", "admin", "agent", "owner", "customer", "buyer"];
      primary = priority.find((r) => roles.includes(r)) ?? "buyer";
    }
    setLoading(false);
    const hasMode = data.user && typeof window !== "undefined"
      && !!window.localStorage.getItem(`spaces:mode:${data.user.id}`);
    const target = (primary === "buyer" || primary === "customer") && !hasMode
      ? "/welcome"
      : redirectPathForRole(primary);
    navigate({ to: target, replace: true });
  }

  async function google() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Illustration side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 lg:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center">
            <Brand size="lg" tone="inherit" />
          </Link>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              {t("auth.login.heroTitle")}
            </h2>
            <p className="mt-4 text-primary-foreground/85">
              {t("auth.login.heroBody")}
            </p>
          </div>
          <p className="text-sm text-primary-foreground/70">
            © 2025 SPACES Group Ltd — Dar es Salaam, Tanzania.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <Link to="/" className="mb-8 flex items-center lg:hidden">
            <Brand size="md" />
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("auth.login.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.login.email")}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.login.emailPlaceholder")}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.login.password")}</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.login.passwordPlaceholder")}
                  className="h-11 rounded-xl pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-foreground/80">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                {t("auth.login.remember")}
              </label>
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t("auth.login.forgot")}
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.submit")}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("common.or")} <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={google} className="h-11 w-full gap-2 rounded-xl">
            <GoogleIcon /> {t("auth.login.continueGoogle")}
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("auth.login.noAccount")}{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              {t("auth.login.createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
