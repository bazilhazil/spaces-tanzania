import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Building2, Handshake, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "Welcome to SPACES" },
      { name: "description", content: "Choose how you'd like to use SPACES today." },
    ],
  }),
});

type Card = {
  key: SpacesMode;
  emoji: string;
  icon: typeof Home;
  title: string;
  desc: string;
  unlocks: string[];
  gradient: string;
};

const CARDS: Card[] = [
  {
    key: "buyer",
    emoji: "🏠",
    icon: Home,
    title: "Find a Property",
    desc: "Browse thousands of verified listings.",
    unlocks: ["Favorites", "Viewing Requests", "Saved Searches"],
    gradient: "from-sky-500/15 via-primary/10 to-transparent",
  },
  {
    key: "owner",
    emoji: "🏡",
    icon: Building2,
    title: "List My Property",
    desc: "Upload your house, office, apartment, warehouse or land.",
    unlocks: ["Upload Property", "My Properties", "Analytics", "Bookings"],
    gradient: "from-emerald-500/15 via-primary/10 to-transparent",
  },
  {
    key: "agent",
    emoji: "🤝",
    icon: Handshake,
    title: "I'm a Real Estate Agent",
    desc: "Manage multiple listings and clients.",
    unlocks: ["Clients", "Listings", "Commission", "Performance"],
    gradient: "from-amber-500/15 via-primary/10 to-transparent",
  },
];

function WelcomePage() {
  const navigate = useNavigate();
  const { setMode } = useMode();
  const { profile, user } = useAuth();
  const { t } = useI18n();
  const [selected, setSelected] = useState<SpacesMode | null>(null);
  const firstName = (profile?.full_name || user?.email || "").split(" ")[0] || t("common.welcome");

  function choose(m: SpacesMode) {
    setSelected(m);
  }

  function proceed() {
    if (!selected) return;
    setMode(selected);
    toast.success(`You're all set — ${selected.charAt(0).toUpperCase() + selected.slice(1)} mode is on.`);
    if (selected === "owner") navigate({ to: "/upload" });
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary/[0.06] via-background to-background">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_10%,var(--color-primary)/0.08,transparent_40%),radial-gradient(circle_at_80%_0%,var(--color-primary)/0.06,transparent_45%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 md:py-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-semibold text-primary">SPACES</span>
          </div>
          <button
            onClick={() => {
              setMode("buyer");
              navigate({ to: "/dashboard" });
            }}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Skip for now
          </button>
        </header>

        <div className="mt-10 md:mt-16 animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">Welcome, {firstName}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Welcome to SPACES <span className="inline-block">👋</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            What would you like to do today? You can switch modes anytime from Settings — one account, endless possibilities.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3">
          {CARDS.map((c, i) => {
            const active = selected === c.key;
            return (
              <button
                key={c.key}
                onClick={() => choose(c.key)}
                style={{ animationDelay: `${i * 80}ms` }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border bg-background p-6 text-left transition-all duration-300 animate-fade-in",
                  "hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]",
                  active
                    ? "border-primary shadow-[0_0_0_2px_var(--color-primary),0_20px_50px_-20px_rgba(0,0,0,0.3)]"
                    : "border-border/70 shadow-[var(--shadow-soft)]",
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity", c.gradient, active ? "opacity-100" : "group-hover:opacity-100")} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-3xl shadow-[var(--shadow-soft)] ring-1 ring-border/60">
                      <span aria-hidden>{c.emoji}</span>
                    </div>
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                        active ? "border-primary bg-primary text-primary-foreground scale-100" : "border-border/60 bg-background/60 scale-90 opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="mt-6 font-display text-xl font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>

                  <ul className="mt-5 space-y-1.5 border-t border-border/50 pt-4">
                    {c.unlocks.map((u) => (
                      <li key={u} className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 md:mt-12 md:flex-row">
          <p className="text-xs text-muted-foreground">
            You can change your mode anytime from Settings → My Mode.
          </p>
          <Button
            size="lg"
            disabled={!selected}
            onClick={proceed}
            className="h-12 gap-2 rounded-full px-8 text-base shadow-[var(--shadow-soft)]"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
