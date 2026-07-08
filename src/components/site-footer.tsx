import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "@/components/logo";
import { useI18n } from "@/hooks/use-i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-xl font-semibold text-primary">SPACES</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("footer.brandBlurb")}</p>
          <div className="mt-5 flex gap-3 text-muted-foreground">
            <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>

        <FooterCol title={t("footer.explore")} links={[
          { to: "/properties", label: t("nav.buy") },
          { to: "/properties", label: t("nav.rent") },
          { to: "/properties", label: t("nav.commercial") },
          { to: "/agents", label: t("nav.agents") },
        ]} />
        <FooterCol title={t("footer.company")} links={[
          { to: "/", label: t("footer.companyLinks.about") },
          { to: "/", label: t("footer.companyLinks.careers") },
          { to: "/", label: t("footer.companyLinks.press") },
          { to: "/", label: t("footer.companyLinks.contact") },
        ]} />
        <FooterCol title={t("footer.support")} links={[
          { to: "/", label: t("footer.supportLinks.help") },
          { to: "/", label: t("footer.supportLinks.verification") },
          { to: "/", label: t("footer.supportLinks.terms") },
          { to: "/", label: t("footer.supportLinks.privacy") },
        ]} />
      </div>
      <div className="border-t border-border/60">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row">
          <p>{t("footer.copyright")} {t("footer.rights")}</p>
          <p>{t("footer.tagline")}</p>
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
