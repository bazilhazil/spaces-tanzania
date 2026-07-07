import { Link } from "@tanstack/react-router";
import { Menu, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const nav = [
  { to: "/", label: "Home", exact: true },
  { to: "/properties", label: "Buy", search: { type: "sale" as const } },
  { to: "/properties", label: "Rent", search: { type: "rent" as const } },
  { to: "/properties", label: "Commercial", search: { type: "commercial" as const } },
  { to: "/agents", label: "Agents" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <Link to="/auth" className="hidden md:inline-flex">
            <Button size="sm" className="gap-2 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
              <Upload className="h-4 w-4" /> Upload Property
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="rounded-full text-foreground/80 hover:text-primary">
              Login
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button variant="outline" size="sm" className="rounded-full border-primary/20 text-primary hover:bg-primary/5">
              Register
            </Button>
          </Link>
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
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 rounded-full">
                  <Upload className="h-4 w-4" /> Upload Property
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full">Login</Button>
                </Link>
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full border-primary/20 text-primary">Register</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
