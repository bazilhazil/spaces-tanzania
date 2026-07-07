import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/auth-gate-dialog";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
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
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-10 w-10" />
            <span className="font-display text-2xl font-semibold">SPACES</span>
          </Link>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Find your perfect space in Tanzania.
            </h2>
            <p className="mt-4 text-primary-foreground/85">
              Verified listings. Trusted agents. From Dar es Salaam to Zanzibar — your next home is
              one login away.
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
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo className="h-9 w-9" />
            <span className="font-display text-xl font-semibold text-primary">SPACES</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue your search.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-foreground/80">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                Remember me
              </label>
              <Link to="/login" className="font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={google} className="h-11 w-full gap-2 rounded-xl">
            <GoogleIcon /> Continue with Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to SPACES?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
