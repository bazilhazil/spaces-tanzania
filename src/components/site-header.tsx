import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, Upload, User as UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthGateDialog } from "@/components/auth-gate-dialog";
import { toast } from "sonner";


export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const { user, profile, primaryRole, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const nav = [
    { to: "/" as const, label: t("nav.home"), exact: true },
    { to: "/properties" as const, label: t("nav.buy"), search: { type: "sale" as const } },
    { to: "/properties" as const, label: t("nav.rent"), search: { type: "rent" as const } },
    { to: "/properties" as const, label: t("nav.commercial"), search: { type: "commercial" as const } },
    { to: "/agents" as const, label: t("nav.agents") },
  ];


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function onUpload() {
    if (user) navigate({ to: "/dashboard/$section", params: { section: "upload" } });
    else setGateOpen(true);
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const initials = (profile?.full_name || user?.email || "S")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header
      className={
        "sticky top-0 z-50 border-b transition-all duration-300 " +
        (scrolled
          ? "border-border/70 bg-background/95 shadow-[0_1px_0_0_var(--color-border),0_10px_30px_-20px_rgba(15,76,129,0.25)] backdrop-blur-xl"
          : "border-transparent bg-background/70 backdrop-blur-md")
      }
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-18">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Logo className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-semibold tracking-tight text-primary">
            SPACES
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              search={"search" in item ? (item.search as never) : undefined}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-foreground"
              activeOptions={item.exact ? { exact: true } : undefined}
              activeProps={{ className: "text-primary bg-primary/5" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden md:inline-flex" />
          <Button
            size="sm"
            onClick={onUpload}
            className="hidden gap-2 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90 md:inline-flex"
          >
            <Upload className="h-4 w-4" /> {t("nav.upload")}
          </Button>


          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/60 bg-background p-1 pr-3 transition hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[110px] truncate text-sm font-medium text-foreground md:inline">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{profile?.full_name || "SPACES account"}</div>
                  <div className="text-xs font-normal text-muted-foreground capitalize">{primaryRole}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/$section" params={{ section: "settings" }}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden md:inline-flex">
                <Button variant="ghost" size="sm" className="rounded-full text-foreground/80 hover:text-primary">
                  Login
                </Button>
              </Link>
              <Link to="/register" className="hidden md:inline-flex">
                <Button variant="outline" size="sm" className="rounded-full border-primary/20 text-primary hover:bg-primary/5">
                  Register
                </Button>
              </Link>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border/60 bg-background lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {nav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={"search" in item ? (item.search as never) : undefined}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2">
              <Button onClick={() => { setOpen(false); onUpload(); }} className="w-full gap-2 rounded-full">
                <Upload className="h-4 w-4" /> Upload Property
              </Button>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" onClick={handleSignOut} className="w-full rounded-full">Sign out</Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full">Login</Button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full border-primary/20 text-primary">Register</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </header>
  );
}
