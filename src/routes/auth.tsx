import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, Phone, User as UserIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OtpField } from "@/components/ds/otp-field";
import { Brand } from "@/components/brand";
import { GoogleIcon } from "@/components/auth-gate-dialog";
import { redirectPathForRole, type AppRole } from "@/hooks/use-auth";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { friendlyError, errorMessage } from "@/lib/errors";
import { normalizeTanzanianPhoneNumber, maskTzPhone } from "@/lib/phone";
import { useI18n } from "@/hooks/use-i18n";

type Search = { redirect?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in to SPACES - Tanzania's premium property marketplace" },
      { name: "description", content: "Continue with Google, email, or phone to save favorites, contact owners, and list properties on SPACES." },
    ],
  }),
});

async function resolveRedirect(userId: string | undefined, fallback?: string) {
  if (fallback && fallback.startsWith("/")) return fallback;
  if (!userId) return "/";
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
  const priority: AppRole[] = ["super_admin", "admin", "agent", "owner", "customer", "buyer"];
  const primary = priority.find((r) => roles.includes(r)) ?? "buyer";
  return redirectPathForRole(primary);
}

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[560px] w-[560px] rounded-full bg-sky-500/15 blur-[160px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white/90 transition hover:text-white">
            <Brand size="md" tone="inherit" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("auth.page.keepBrowsing")}
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            {/* Left: value prop */}
            <div className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                SPACES · Tanzania
              </p>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight">
                {t("auth.page.heroTitleA")}<br />
                <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
                  {t("auth.page.heroTitleB")}
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
                {t("auth.page.heroBody")}
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/70">
                {[
                  t("auth.page.benefit1"),
                  t("auth.page.benefit2"),
                  t("auth.page.benefit3"),
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: card */}
            <div className="mx-auto w-full max-w-md">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                <div className="mb-6 text-center">
                  <h2 className="font-display text-2xl font-semibold text-white">
                    {mode === "signin" ? t("auth.page.welcomeBack") : t("auth.page.createTitle")}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/60">
                    {mode === "signin"
                      ? t("auth.page.signinSub")
                      : t("auth.page.signupSub")}
                  </p>
                </div>

                <div className="mb-5 flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={
                        "flex-1 rounded-full px-4 py-1.5 font-medium transition " +
                        (mode === m
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-white/70 hover:text-white")
                      }
                    >
                      {m === "signin" ? t("auth.page.signin") : t("auth.page.signup")}
                    </button>
                  ))}
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "phone" | "google")} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-white/5 text-white/70">
                    <TabsTrigger value="email" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">{t("auth.page.tabEmail")}</TabsTrigger>
                    <TabsTrigger value="phone" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">{t("auth.page.tabPhone")}</TabsTrigger>
                    <TabsTrigger value="google" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">{t("auth.page.tabGoogle")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="mt-5">
                    <EmailForm mode={mode} redirect={search.redirect} navigate={navigate} />
                  </TabsContent>
                  <TabsContent value="phone" className="mt-5">
                    <PhoneForm redirect={search.redirect} navigate={navigate} />
                  </TabsContent>
                  <TabsContent value="google" className="mt-5">
                    <GoogleContinue redirect={search.redirect} />
                  </TabsContent>
                </Tabs>

                <p className="mt-6 text-center text-xs leading-relaxed text-white/50">
                  {t("auth.page.legal")}
                </p>
              </div>

              <p className="mt-6 text-center text-sm text-white/60">
                {t("auth.page.justLooking")}{" "}
                <Link to="/" className="font-medium text-primary hover:underline">
                  {t("auth.page.browseLink")}
                </Link>
              </p>

              <p className="mt-2 text-center text-sm">
                <Link to="/help" search={{ topic: "account" } as never} className="font-medium text-white/70 hover:underline">
                  {t("support.needHelp")}
                </Link>
              </p>

            </div>
          </div>
        </main>

        <footer className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} SPACES Group Ltd · Dar es Salaam, Tanzania
        </footer>
      </div>
    </div>
  );
}

/* ─────────────── Email ─────────────── */
function EmailForm({
  mode,
  redirect,
  navigate,
}: {
  mode: "signin" | "signup";
  redirect?: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) {
          toast.error(t("auth.page.passwordShort"));
          return;
        }

        // Account linking: a phone-based account adding an email keeps the
        // same account instead of creating a second one.
        const { data: current } = await supabase.auth.getUser();
        if (current.user && !current.user.email) {
          const { error: linkError } = await supabase.auth.updateUser({
            email,
            password,
            data: fullName ? { full_name: fullName } : undefined,
          });
          if (linkError) return toast.error(friendlyError(linkError));
          toast.success(errorMessage("emailLinked"));
          const to = await resolveRedirect(current.user.id, redirect);
          navigate({ to, replace: true });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/welcome`,
            data: { full_name: fullName },
          },
        });
        if (error) return toast.error(friendlyError(error));
        // Supabase returns a user with no identities when the email already exists.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          return toast.error(errorMessage("emailTaken"));
        }
        track("signup_completed", { method: "email" });
        toast.success(t("auth.page.accountCreated"));
        if (!data.session) {
          toast.info(t("auth.page.confirmEmail"));
          return;
        }
        const to = await resolveRedirect(data.user?.id, redirect);
        navigate({ to, replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(friendlyError(error));
        toast.success(t("auth.page.welcomeToast"));
        const to = await resolveRedirect(data.user?.id, redirect);
        navigate({ to, replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "signup" && (
        <Field icon={<UserIcon className="h-4 w-4" />}>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("auth.page.fullName")}
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
          />
        </Field>
      )}
      <Field icon={<Mail className="h-4 w-4" />}>
        <Input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.page.emailPlaceholder")}
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
        />
      </Field>
      <Field icon={<Lock className="h-4 w-4" />}>
        <Input
          required
          type={show ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.page.password")}
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 pr-10 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          aria-label={show ? t("auth.page.hidePassword") : t("auth.page.showPassword")}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </Field>

      <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? t("auth.page.signin") : t("auth.page.createAccountBtn")}
      </Button>
    </form>
  );
}

/* ─────────────── Phone ─────────────── */
const OTP_TTL_SECONDS = 300; // codes are short-lived
const MAX_SENDS = 3; // per number, per window
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;

const sendLog: Record<string, number[]> = {};

function canSend(phone: string) {
  const now = Date.now();
  const list = (sendLog[phone] ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  sendLog[phone] = list;
  return list.length < MAX_SENDS;
}
function recordSend(phone: string) {
  sendLog[phone] = [...(sendLog[phone] ?? []), Date.now()];
}

function PhoneForm({
  redirect,
  navigate,
}: {
  redirect?: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const id = setTimeout(() => setExpiresIn((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [expiresIn]);

  function resetToPhone() {
    setStep("phone");
    setOtp("");
    setAttempts(0);
    setExpiresIn(0);
  }

  async function send(target: string) {
    if (!canSend(target)) {
      toast.error(errorMessage("otpAttempts"));
      return false;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: target });
    setLoading(false);
    if (error) {
      if (import.meta.env.DEV) {
        console.error("[auth/phone] OTP request failed", {
          code: (error as { code?: string }).code,
          status: error.status,
        });
      }
      toast.error(friendlyError(error, "otpSendFailed"));
      return false;
    }
    recordSend(target);
    setCooldown(45);
    setExpiresIn(OTP_TTL_SECONDS);
    setOtp("");
    setAttempts(0);
    setStep("otp");
    return true;
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const target = normalizeTanzanianPhoneNumber(phone);
    if (!target) return toast.error(errorMessage("invalidPhone"));
    setE164(target);
    await send(target);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (expiresIn <= 0) return toast.error(errorMessage("otpExpired"));
    if (attempts >= MAX_ATTEMPTS) return toast.error(errorMessage("otpAttempts"));
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: "sms" });
    setLoading(false);
    if (error) {
      const next = attempts + 1;
      setAttempts(next);
      setOtp("");
      if (next >= MAX_ATTEMPTS) {
        toast.error(errorMessage("otpAttempts"));
        resetToPhone();
        return;
      }
      return toast.error(friendlyError(error, "otpWrong"));
    }
    
    const user = data.user;
    // Brand-new accounts continue into the existing onboarding flow.
    const isNew =
      !!user &&
      !!user.created_at &&
      Date.now() - new Date(user.created_at).getTime() < 60_000;
    const to = isNew && !redirect ? "/welcome" : await resolveRedirect(user?.id, redirect);
    navigate({ to, replace: true });
  }

  if (step === "otp") {
    const mm = Math.floor(expiresIn / 60);
    const ss = String(expiresIn % 60).padStart(2, "0");
    return (
      <form onSubmit={verify} className="space-y-4">
        <div className="text-center">
          <Label className="text-white/70">{t("auth.page.verifyPhone")}</Label>
          <p className="mt-1 text-xs text-white/50">{t("auth.page.sentCode", { phone: maskTzPhone(e164) })}</p>
        </div>
        <OtpField value={otp} onChange={setOtp} length={6} className="justify-center" autoFocus />
        <p className="text-center text-xs text-white/50">
          {expiresIn > 0
            ? t("auth.page.codeExpiresIn", { time: `${mm}:${ss}` })
            : t("auth.page.codeExpired")}
        </p>
        <Button
          type="submit"
          disabled={loading || otp.length < 6 || expiresIn <= 0}
          className="h-11 w-full rounded-xl text-base font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.page.verify")}
        </Button>
        <div className="space-y-2 text-center text-xs text-white/60">
          <p>{t("auth.page.noCode")}</p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={loading || cooldown > 0}
              onClick={() => void send(e164)}
              className="hover:text-white disabled:opacity-50"
            >
              {cooldown > 0 ? t("auth.page.resendIn", { s: cooldown }) : t("auth.page.resendCode")}
            </button>
            <span className="text-white/20">|</span>
            <button type="button" onClick={resetToPhone} className="hover:text-white">
              {t("auth.page.changeNumber")}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3">
      <Field icon={<Phone className="h-4 w-4" />}>
        <Input
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("auth.page.phonePlaceholder")}
          className="h-12 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-base text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
        />
      </Field>
      <p className="text-xs text-white/50">{t("auth.page.smsNote")}</p>
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold">
        {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("auth.page.sendingCode")}</>) : t("auth.page.sendCode")}
      </Button>
    </form>
  );
}


/* ─────────────── Google ─────────────── */
function GoogleContinue({ redirect }: { redirect?: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    try {
      if (redirect && redirect.startsWith("/")) {
        try {
          sessionStorage.setItem("spaces:post-auth-redirect", redirect);
        } catch { /* ignore */ }
      }
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button
        onClick={go}
        disabled={loading}
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl border-white/15 bg-white text-slate-900 hover:bg-white/90 hover:text-slate-900"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><GoogleIcon /> {t("auth.page.continueGoogle")}</>)}
      </Button>
      <p className="text-center text-xs text-white/50">
        {t("auth.page.googleNote")}
      </p>
    </div>
  );
}

/* ─────────────── Field ─────────────── */
function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
        {icon}
      </span>
      {children}
    </div>
  );
}
