import { Link } from "@tanstack/react-router";
import { Menu, Search, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const nav = [
  { to: "/properties", label: "Buy", search: { type: "sale" as const } },
  { to: "/properties", label: "Rent", search: { type: "rent" as const } },
  { to: "/properties", label: "Commercial", search: { type: "commercial" as const } },
  { to: "/agents", label: "Agents" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display text-xl font-semibold tracking-tight text-primary">
            SPACES
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              search={"search" in item ? (item.search as never) : undefined}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/properties"
            className="hidden md:inline-flex"
            aria-label="Search properties"
          >
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" /> Sign in
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-soft)]">
              List a Property
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {nav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={"search" in item ? (item.search as never) : undefined}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button className="mt-2 w-full">List a Property</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
