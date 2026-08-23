import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";
import { COMPANY, SOCIAL_LINKS } from "@/lib/company";

const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
} as const;

export function SiteFooter() {
  const { t, lang } = useI18n();
  const f = SITE_CONTENT[lang].footer;

  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Brand size="md" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("footer.brandBlurb")}</p>
          {SOCIAL_LINKS.length > 0 && (
            <div className="mt-5 flex gap-3 text-muted-foreground">
              {SOCIAL_LINKS.map((s) => {
                const Icon = SOCIAL_ICONS[s.key];
                return (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={s.key}
                    className="hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
          <div className="mt-5">
            <LanguageSwitcher />
          </div>
        </div>

        <FooterCol
          title={t("footer.explore")}
          links={[
            { to: "/properties", label: f.findSpace },
            { to: "/upload", label: f.listSpace },
            { to: "/agents", label: t("nav.agents") },
          ]}
        />
        <FooterCol
          title={t("footer.company")}
          links={[
            { to: "/about", label: f.about },
            { to: "/contact", label: f.contact },
          ]}
        />
        <FooterCol
          title={t("footer.support")}
          links={[
            { to: "/help", label: f.help },
            { to: "/safety", label: f.safety },
            { to: "/terms", label: f.terms },
            { to: "/privacy", label: f.privacy },
          ]}
        />
      </div>
      <div className="border-t border-border/60">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} {COMPANY.legalName}. {t("footer.rights")}
          </p>
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
