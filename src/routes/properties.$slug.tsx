import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck, Bath, BedDouble, Building2, Calendar, Car, ChevronLeft, ChevronRight,
  Heart, Mail, MapPin, MessageCircle, Phone, Ruler, Share2, ShieldCheck, Sparkles,
  Star, X, Play, Calculator, Send, Timer, CheckCircle2, Maximize2, FileText,
  Flag, ZoomIn, ZoomOut, Eye,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PropertyCard } from "@/components/property-card";
import { AuthGateDialog } from "@/components/auth-gate-dialog";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { TrustScoreRing } from "@/components/trust/trust-score-ring";
import { QualityScorePill } from "@/components/trust/quality-score";
import { computeTrustScore, MOCK_TRUST_SIGNALS } from "@/lib/trust-engine";
import { formatPrice, getAgent, getProperty, properties } from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/properties/$slug")({
  loader: ({ params }) => {
    const property = getProperty(params.slug);
    if (!property) throw notFound();
    return property;
  },
  component: PropertyDetailPage,
  notFoundComponent: NotFoundPanel,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — ${loaderData.ward}, ${loaderData.city} · SPACES` },
          { name: "description", content: `${loaderData.bedrooms ? loaderData.bedrooms + "-bed " : ""}${loaderData.category.toLowerCase()} in ${loaderData.ward}, ${loaderData.city}. ${loaderData.description.slice(0, 130)}` },
          { property: "og:title", content: `${loaderData.title} — SPACES` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:image", content: loaderData.images[0] },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.images[0] },
        ]
      : [],
    links: loaderData ? [{ rel: "canonical", href: `https://spacestz.com/properties/${loaderData.slug}` }] : [],
    scripts: loaderData ? [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Residence",
        name: loaderData.title,
        description: loaderData.description,
        address: {
          "@type": "PostalAddress",
          streetAddress: loaderData.street,
          addressLocality: loaderData.city,
          addressRegion: loaderData.district,
          addressCountry: "TZ",
        },
        numberOfRooms: loaderData.bedrooms,
        floorSize: { "@type": "QuantitativeValue", value: loaderData.size, unitCode: "MTK" },
        image: loaderData.images,
      }),
    }] : [],
  }),
});

function NotFoundPanel() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-3xl">{t("properties.notFoundTitle")}</h1>
        <Link to="/properties" className="mt-4 inline-block text-primary underline">
          {t("properties.notFoundBack")}
        </Link>
      </div>
    </div>
  );
}

function PropertyDetailPage() {
  const property = Route.useLoaderData();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const agent = getAgent(property.agentId);

  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [authGate, setAuthGate] = useState(false);

  const favorited = isFavorite(property.id);
  const similar = useMemo(
    () => properties
      .filter((p) => p.id !== property.id && (p.category === property.category || p.city === property.city))
      .slice(0, 4),
    [property.id, property.category, property.city],
  );
  const trust = computeTrustScore(MOCK_TRUST_SIGNALS);
  const publicId = property.id.toUpperCase();
  const listingLabel =
    property.listingType === "sale" ? t("card.forSale")
    : property.listingType === "rent" ? t("card.forRent")
    : t("card.forLease");

  function requireAuth(cb: () => void) {
    if (!user) { setAuthGate(true); return; }
    cb();
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share({ title: property.title, url }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  const amenityIcons: Record<string, React.ReactNode> = {
    Security: <ShieldCheck className="h-3.5 w-3.5" />,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-page pt-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">{t("properties.breadcrumbHome")}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/properties" className="hover:text-primary">{t("properties.breadcrumbProperties")}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="line-clamp-1 text-foreground">{property.title}</span>
          </nav>
        </div>

        {/* Gallery */}
        <section className="container-page mt-4">
          <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2">
            <button
              onClick={() => setLightbox(true)}
              className="group relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-2"
            >
              <div className="aspect-[4/3] md:aspect-auto md:h-full">
                <img
                  src={property.images[activeImage] ?? property.images[0]}
                  alt={property.title}
                  width={1920}
                  height={1200}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              </div>
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <div className="flex flex-wrap gap-2">
                  {property.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/95 px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <BadgeCheck className="h-3.5 w-3.5" /> {t("properties.detail.verifiedBadge")}
                    </span>
                  )}
                  {property.premium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> {t("common.premium")}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3" /> View all
                </span>
              </div>
            </button>
            {property.images.slice(0, 4).map((img: string, i: number) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className="relative overflow-hidden rounded-2xl"
              >
                <div className="aspect-[4/3]">
                  <img
                    src={img}
                    alt={`${property.title} view ${i + 1}`}
                    loading="lazy"
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover transition hover:scale-105"
                  />
                </div>
                {activeImage === i && <div className="absolute inset-0 ring-4 ring-primary" />}
                {i === 3 && property.images.length > 4 && (
                  <div className="absolute inset-0 grid place-items-center bg-black/55 font-display text-lg font-semibold text-white">
                    +{property.images.length - 4}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="container-page mt-10 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
          <div>
            {/* Title bar */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  {listingLabel} · {t(`search.types.${property.category}`)}
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
                  {property.title}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {property.street}, {property.ward}, {property.district}, {property.city}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.verified && <VerificationBadge kind="property" size="sm" />}
                  {property.verified && <VerificationBadge kind="identity" size="sm" />}
                  {agent?.verified && <VerificationBadge kind="agent" size="sm" />}
                  <QualityScorePill score={78} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold text-primary md:text-4xl">
                  {formatPrice(property.price, property.currency, property.listingType)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant={favorited ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const now = toggleFavorite(property.id);
                      toast.success(now ? "Saved to favorites" : "Removed from favorites");
                    }}
                  >
                    <Heart className={cn("h-4 w-4", favorited && "fill-current")} /> {t("common.save")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={share}>
                    <Share2 className="h-4 w-4" /> {t("common.share")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick facts */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-secondary/40 p-4 sm:grid-cols-4">
              <Fact icon={<BedDouble className="h-4 w-4" />} label={t("card.bedrooms")} value={property.bedrooms || "—"} />
              <Fact icon={<Bath className="h-4 w-4" />} label={t("card.bathrooms")} value={property.bathrooms} />
              <Fact icon={<Car className="h-4 w-4" />} label={t("card.parking")} value={property.parking} />
              <Fact icon={<Ruler className="h-4 w-4" />} label={t("card.size")} value={`${property.size} m²`} />
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">{t("properties.detail.about")}</h2>
              <p className={cn("mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base", !showFullDesc && property.description.length > 320 && "line-clamp-6")}>
                {property.description}
              </p>
              {property.description.length > 320 && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {showFullDesc ? "Show less" : "Read more"}
                </button>
              )}
            </div>

            {/* Details */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoBlock label={t("properties.detail.yearBuilt")} value={property.yearBuilt.toString()} icon={<Calendar className="h-4 w-4" />} />
              <InfoBlock label={t("properties.detail.furnished")} value={property.furnished ? t("common.yes") : t("common.no")} icon={<Sparkles className="h-4 w-4" />} />
              <InfoBlock label={t("properties.detail.propertyType")} value={t(`search.types.${property.category}`)} icon={<Building2 className="h-4 w-4" />} />
              <InfoBlock label={t("properties.detail.propertyId")} value={publicId} icon={<BadgeCheck className="h-4 w-4" />} />
              <InfoBlock label="Land size" value={`${property.size} m²`} icon={<Ruler className="h-4 w-4" />} />
              <InfoBlock label="Availability" value="Available now" icon={<CheckCircle2 className="h-4 w-4" />} />
              <InfoBlock label="Listing date" value={new Date(property.createdAt).toLocaleDateString()} icon={<Calendar className="h-4 w-4" />} />
              <InfoBlock label="Views" value={property.views.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
              <InfoBlock label="Saves" value={Math.max(3, Math.round(property.views / 40)).toString()} icon={<Heart className="h-4 w-4" />} />

            {/* Amenities */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">{t("properties.detail.amenities")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {property.amenities.map((a: string) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
                  >
                    {amenityIcons[a] ?? <BadgeCheck className="h-3.5 w-3.5 text-primary" />} {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Video walkthrough */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">Video walkthrough</h2>
              <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-center">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Play className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Video walkthrough will appear here when the owner uploads one.</p>
                </div>
              </div>
            </div>

            {/* Floor plans */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">Floor plans</h2>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Floor plans are optional. Ask the owner if you'd like to see the layout.
              </div>
            </div>

            {/* Location */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">{t("properties.detail.location")}</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                <LocationChip label="Region" value={property.district} />
                <LocationChip label="District" value={property.district} />
                <LocationChip label="Ward" value={property.ward} />
                <LocationChip label="Street" value={property.street} />
              </div>
              <div className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border">
                <iframe
                  title={`Map of ${property.title}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.ward}, ${property.city}, Tanzania`)}&z=13&output=embed`}
                  loading="lazy"
                  className="h-full w-full"
                />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <NearbyItem label={t("properties.detail.nearbySchools")} />
                <NearbyItem label={t("properties.detail.nearbyHospitals")} />
                <NearbyItem label={t("properties.detail.nearbySupermarkets")} />
                <NearbyItem label={t("properties.detail.nearbyBusStops")} />
              </div>
            </div>

            {/* Mortgage placeholder */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-gold/5 p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-foreground">Mortgage & affordability</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estimate your monthly repayment and check affordability with partner banks. Coming soon.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>Coming soon</Button>
              </div>
            </div>
          </div>

          {/* Sidebar: agent + contact */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {agent && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      loading="lazy"
                      width={120}
                      height={120}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    {agent.verified && (
                      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                        <BadgeCheck className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{agent.agency}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                      <Star className="h-3.5 w-3.5 fill-current" /> {agent.rating.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-secondary/60 p-2">
                    <div className="inline-flex items-center gap-1 text-muted-foreground"><MessageCircle className="h-3 w-3" /> Response</div>
                    <div className="mt-0.5 font-display text-sm font-semibold">98%</div>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-2">
                    <div className="inline-flex items-center gap-1 text-muted-foreground"><Timer className="h-3 w-3" /> Avg reply</div>
                    <div className="mt-0.5 font-display text-sm font-semibold">~1h</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => requireAuth(() => setViewingOpen(true))}>
                    <Calendar className="h-4 w-4" /> {t("properties.detail.bookViewing")}
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => requireAuth(() => setInquiryOpen(true))}>
                    <Send className="h-4 w-4" /> Send inquiry
                  </Button>
                  <a
                    href={`https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(t("properties.detail.whatsappMessage", { title: property.title }))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!user) { e.preventDefault(); setAuthGate(true); } }}
                  >
                    <Button className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => requireAuth(() => { window.location.href = `tel:${agent.phone.replace(/\s/g, "")}`; })}>
                      <Phone className="h-4 w-4" /> Call
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => requireAuth(() => { window.location.href = `mailto:${agent.email}`; })}>
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("properties.detail.trustLine")}</span>
                </div>
              </div>
            )}

            {/* Trust score */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-4">
                <TrustScoreRing score={trust.score} tier={trust.tier} size={80} />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Trust score</p>
                  <p className="font-display text-lg font-semibold">{trust.tier}</p>
                  <p className="text-xs text-muted-foreground">Verified profile, strong track record</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {similar.length > 0 && (
          <section className="mt-16 bg-secondary/40">
            <div className="container-page py-16">
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                {t("properties.detail.similar")}
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {similar.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />

      {/* Fullscreen lightbox */}
      {lightbox && (
        <Lightbox
          images={property.images}
          index={activeImage}
          onIndex={setActiveImage}
          onClose={() => setLightbox(false)}
          title={property.title}
        />
      )}

      {/* Inquiry dialog */}
      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        propertyTitle={property.title}
      />

      {/* Viewing booking dialog */}
      <ViewingDialog
        open={viewingOpen}
        onOpenChange={setViewingOpen}
        propertyTitle={property.title}
      />

      <AuthGateDialog open={authGate} onOpenChange={setAuthGate} />
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function LocationChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function NearbyItem({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span>{t("properties.detail.nearby", { label })}</span>
    </div>
  );
}

function Lightbox({
  images, index, onIndex, onClose, title,
}: {
  images: string[]; index: number; onIndex: (n: number) => void; onClose: () => void; title: string;
}) {
  const prev = () => onIndex((index - 1 + images.length) % images.length);
  const next = () => onIndex((index + 1) % images.length);
  return (
    <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-black/95 backdrop-blur" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{index + 1} / {images.length} · {title}</span>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative grid place-items-center overflow-hidden px-4">
        <img src={images[index]} alt={`${title} ${index + 1}`} className="max-h-full max-w-full object-contain" />
        <button onClick={prev} aria-label="Previous" className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} aria-label="Next" className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto p-4">
        {images.map((img, i) => (
          <button key={i} onClick={() => onIndex(i)} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition", i === index ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}>
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InquiryDialog({ open, onOpenChange, propertyTitle }: { open: boolean; onOpenChange: (v: boolean) => void; propertyTitle: string }) {
  const [message, setMessage] = useState(`Hi, I'm interested in "${propertyTitle}". Is it still available?`);
  function submit() {
    if (message.trim().length < 10) { toast.error("Please write a longer message"); return; }
    toast.success("Inquiry sent — the owner will get back to you shortly");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send inquiry</DialogTitle>
          <DialogDescription>Your name and contact details are shared securely with the owner.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <p className="text-[11px] text-muted-foreground">{message.length}/1000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="gap-1.5"><Send className="h-4 w-4" /> Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewingDialog({ open, onOpenChange, propertyTitle }: { open: boolean; onOpenChange: (v: boolean) => void; propertyTitle: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  function submit() {
    if (!date || !time) { toast.error("Choose date and time"); return; }
    toast.success(`Viewing requested for ${date} at ${time}`);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a viewing</DialogTitle>
          <DialogDescription>Choose a date and time. The owner will confirm or suggest a new slot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Date
              <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Time
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </label>
          </div>
          <Textarea rows={3} placeholder={`Notes for the owner about "${propertyTitle}" (optional)`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="gap-1.5"><Calendar className="h-4 w-4" /> Request viewing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
