import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
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
import { toast } from "sonner";

type Search = { redirect?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in to SPACES — Tanzania's premium property marketplace" },
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
            <ArrowLeft className="h-3.5 w-3.5" /> Keep browsing
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
                Your keys to Tanzania's<br />
                <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
                  premium property market.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
                Browse thousands of verified homes without signing up. Create an
                account only when you want to save favorites, contact owners, or
                list your own property.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/70">
                {[
                  "Save and compare properties across devices",
                  "Message verified owners and agents directly",
                  "List and manage your properties with pro tools",
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
                    {mode === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/60">
                    {mode === "signin"
                      ? "Sign in to continue where you left off."
                      : "Join SPACES in under a minute."}
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
                      {m === "signin" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>

                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-white/5 text-white/70">
                    <TabsTrigger value="email" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Email</TabsTrigger>
                    <TabsTrigger value="phone" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Phone</TabsTrigger>
                    <TabsTrigger value="google" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Google</TabsTrigger>
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
                  By continuing you agree to the SPACES Terms of Service and Privacy Policy.
                </p>
              </div>

              <p className="mt-6 text-center text-sm text-white/60">
                Just looking?{" "}
                <Link to="/" className="font-medium text-primary hover:underline">
                  Browse properties without an account
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
          toast.error("Password must be at least 6 characters.");
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
        if (error) return toast.error(error.message);
        toast.success("Account created — welcome to SPACES.");
        const to = await resolveRedirect(data.user?.id, redirect);
        navigate({ to, replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(error.message);
        toast.success("Welcome back to SPACES.");
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
            placeholder="Full name"
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
          placeholder="you@example.com"
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
          placeholder="Password"
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 pr-10 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </Field>

      <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}

/* ─────────────── Phone ─────────────── */
function PhoneForm({
  redirect,
  navigate,
}: {
  redirect?: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  function normalize(raw: string) {
    const cleaned = raw.replace(/\s+/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("0")) return "+255" + cleaned.slice(1);
    return "+" + cleaned;
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const p = normalize(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: p });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Verification code sent to ${p}`);
    setStep("otp");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const p = normalize(phone);
    const { data, error } = await supabase.auth.verifyOtp({ phone: p, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in.");
    const to = await resolveRedirect(data.user?.id, redirect);
    navigate({ to, replace: true });
  }

  if (step === "otp") {
    return (
      <form onSubmit={verify} className="space-y-4">
        <div className="text-center">
          <Label className="text-white/70">Enter the 6-digit code</Label>
          <p className="mt-1 text-xs text-white/50">Sent to {normalize(phone)}</p>
        </div>
        <OtpField value={otp} onChange={setOtp} length={6} className="justify-center" />
        <Button type="submit" disabled={loading || otp.length < 6} className="h-11 w-full rounded-xl text-base font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
        </Button>
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="w-full text-center text-xs text-white/60 hover:text-white"
        >
          Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3">
      <Field icon={<Phone className="h-4 w-4" />}>
        <Input
          required
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+255 712 345 678"
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40"
        />
      </Field>
      <p className="text-xs text-white/50">We'll text you a one-time code. Standard SMS rates may apply.</p>
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
      </Button>
    </form>
  );
}

/* ─────────────── Google ─────────────── */
function GoogleContinue({ redirect }: { redirect?: string }) {
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><GoogleIcon /> Continue with Google</>)}
      </Button>
      <p className="text-center text-xs text-white/50">
        Fastest option — no password to remember.
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
