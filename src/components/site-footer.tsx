import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-xl font-semibold text-primary">SPACES</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Tanzania's most trusted real estate marketplace. Find your perfect space to rent, buy, or grow.
          </p>
          <div className="mt-5 flex gap-3 text-muted-foreground">
            <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>

        <FooterCol title="Explore" links={[
          { to: "/properties", label: "Buy" },
          { to: "/properties", label: "Rent" },
          { to: "/properties", label: "Commercial" },
          { to: "/agents", label: "Agents" },
        ]} />
        <FooterCol title="Company" links={[
          { to: "/", label: "About" },
          { to: "/", label: "Careers" },
          { to: "/", label: "Press" },
          { to: "/", label: "Contact" },
        ]} />
        <FooterCol title="Support" links={[
          { to: "/", label: "Help center" },
          { to: "/", label: "Verification" },
          { to: "/", label: "Terms" },
          { to: "/", label: "Privacy" },
        ]} />
      </div>
      <div className="border-t border-border/60">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} SPACES Group Ltd. All rights reserved. Dar es Salaam, Tanzania.</p>
          <p>Find Your Perfect Space.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-muted-foreground hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
