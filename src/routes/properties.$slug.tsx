import { createFileRoute, Link } from "@tanstack/react-router";
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
import { PropertyShareDialog } from "@/components/property-share-dialog";
import { createLead, type LeadContactMethod } from "@/lib/leads-db";
import { sendPropertyMessage } from "@/lib/inquiry";

import { createViewingRequest } from "@/lib/viewings-db";
import { VerifiedBadge } from "@/components/trust/verified-badge";
import { ReportSheet } from "@/components/safety/report-sheet";
import { TrustScoreRing } from "@/components/trust/trust-score-ring";
import { QualityScorePill } from "@/components/trust/quality-score";
import { computeTrustScore, MOCK_TRUST_SIGNALS } from "@/lib/trust-engine";
import { PropertyReviews } from "@/components/reviews/property-reviews";
import { formatPrice, type Property, type Agent } from "@/lib/mock-data";
import { fetchLiveProperties, fetchPropertyById, fetchPropertyContact, contactAgentFromRow } from "@/lib/properties-db";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { getListingSeo } from "@/lib/public-listings.functions";
import { canonicalPropertyUrl, idFromSlug, propertySlug, SITE_URL } from "@/lib/seo";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/properties/$slug")({
  loader: async ({ params }) => {
    const listing = await getListingSeo({ data: { id: idFromSlug(params.slug) } });
    return { listing };
  },
  component: PropertyDetailPage,
  head: ({ params, loaderData }) => {
    const listing = loaderData?.listing;
    if (!listing) {
      return {
        meta: [
          { title: "Space unavailable · SPACES" },
          { name: "description", content: "This space is no longer available on SPACES." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const place = [listing.ward, listing.district, listing.city].filter(Boolean).join(", ");
    const action = listing.listingType === "sale" ? "for Sale" : listing.listingType === "lease" ? "for Lease" : "for Rent";
    const bed = listing.bedrooms ? `${listing.bedrooms} Bedroom ` : "";
    const title = `${bed}${listing.category} ${action} in ${place || "Tanzania"} | SPACES`;
    const priceText = `${listing.currency} ${listing.price.toLocaleString()}`;
    const description =
      (listing.description || "").replace(/\s+/g, " ").trim().slice(0, 150) ||
      `${bed}${listing.category} ${action.toLowerCase()} in ${place || "Tanzania"} at ${priceText}. Verified listings on SPACES.`;
    const canonical = canonicalPropertyUrl(propertySlug({ ...listing, id: listing.id }));
    const image = `${SITE_URL}/api/public/og/property/${listing.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: [listing.category, action, place, "Tanzania property", "SPACES"].filter(Boolean).join(", ") },
        { property: "og:title", content: `${title.replace(" | SPACES", "")} — ${priceText}` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: listing.title,
            description,
            url: canonical,
            image,
            datePosted: listing.createdAt ?? undefined,
            address: {
              "@type": "PostalAddress",
              addressLocality: listing.district || listing.city || undefined,
              addressRegion: listing.city || undefined,
              addressCountry: "TZ",
            },
            offers: {
              "@type": "Offer",
              price: listing.price,
              priceCurrency: listing.currency,
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Spaces", item: `${SITE_URL}/properties` },
              { "@type": "ListItem", position: 3, name: listing.title, item: canonical },
            ],
          }),
        },
      ],
    };
  },
});


function PropertyDetailPage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<string>("live");
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Property[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const propertyId = idFromSlug(slug);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const res = await fetchPropertyById(propertyId);
      if (!alive) return;
      if (res) {
        setProperty(res.property);
        setAgent(contactAgentFromRow(res.row));
        setStatus((res.row?.status as string) ?? "live");
        setOwnerId(((res.row as unknown as { owner_id?: string })?.owner_id) ?? null);
        track("property_viewed", { property_id: res.property.id, category: res.property.category });
        const others = await fetchLiveProperties(12);
        if (!alive) return;
        setSimilar(others.filter((p) => p.id !== res.property.id).slice(0, 4));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [propertyId]);


  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [authGate, setAuthGate] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);


  const trust = useMemo(() => computeTrustScore(MOCK_TRUST_SIGNALS), []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container-page flex-1 py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-3 md:grid-cols-4 md:grid-rows-2">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted md:col-span-2 md:row-span-2" />
            {[0,1,2,3].map((i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />)}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container-page flex-1 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">{t("properties.notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This space may have been rented, sold or removed.
          </p>
          <Link to="/properties" className="mt-6 inline-block">
            <Button>View similar spaces</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const favorited = isFavorite(property.id);
  const publicId = property.id.slice(0, 8).toUpperCase();
  const listingLabel =
    property.listingType === "sale" ? t("card.forSale")
    : property.listingType === "rent" ? t("card.forRent")
    : t("card.forLease");

  const unavailable = ["sold", "rented", "archived", "paused"].includes(status);
  const locationLine = [property.ward, property.district, property.city].filter(Boolean).join(", ");
  const whatsappText = t("properties.detail.whatsappMessageFull", {
    title: property.title,
    location: locationLine,
  });

  function requireAuth(cb: () => void) {
    if (!user) { setAuthGate(true); return; }
    cb();
  }


  /**
   * Owner contact details are only released to visitors who have actually
   * engaged with the listing. We record the lead first, then fetch the
   * contact row and hydrate the sidebar before performing the action.
   */
  async function contactVia(method: LeadContactMethod): Promise<Agent | null> {
    if (!property || !agent) return null;
    track(method === "whatsapp" ? "whatsapp_clicked" : "contact_clicked", {
      property_id: property.id,
      method,
    });
    await createLead({
      propertyId: property.id,
      ownerId: property.agentId,
      contactMethod: method,
    });
    const c = await fetchPropertyContact(property.id);
    if (!c) return agent;
    const next: Agent = {
      ...agent,
      name: c.contact_name || agent.name,
      phone: c.contact_phone || agent.phone,
      whatsapp: (c.contact_whatsapp || c.contact_phone || agent.whatsapp || "").replace(/\D/g, ""),
    };
    setAgent(next);
    return next;
  }

  function contactAndOpen(method: LeadContactMethod, build: (a: Agent) => string | null) {
    requireAuth(() => {
      void (async () => {
        const a = await contactVia(method);
        const href = a ? build(a) : null;
        if (!href) {
          toast.error(t("properties.detail.contactUnavailable"));
          return;
        }
        window.location.href = href;
      })();
    });
  }

  function openWhatsApp() {
    contactAndOpen("whatsapp", (a) =>
      a.whatsapp ? `https://wa.me/${a.whatsapp}?text=${encodeURIComponent(whatsappText)}` : null,
    );
  }

  /** Mobile: one-tap dial. Desktop: reveal the verified number safely. */
  function callAction() {
    requireAuth(() => {
      void (async () => {
        const a = await contactVia("call");
        const phone = a?.phone?.trim();
        if (!phone) {
          toast.error(t("properties.detail.contactUnavailable"));
          return;
        }
        const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
        if (isMobile) window.location.href = `tel:${phone.replace(/\s/g, "")}`;
        else setRevealedPhone(phone);
      })();
    });
  }

  function share() {
    setShareOpen(true);
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
                  {property.verified && <VerifiedBadge kind="space" label={t("verify.badge.space")} size="sm" />}
                  {agent?.verified && <VerifiedBadge kind="agent" label={t("verify.badge.agent")} size="sm" />}
                  <QualityScorePill score={78} />
                </div>
                {property.verified && (
                  <p className="mt-2 text-xs text-muted-foreground">{t("verify.spaceExplainer")}</p>
                )}
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
                      if (!user) { setAuthGate(true); return; }
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
            </div>


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
                  {unavailable ? (
                    <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
                      <p className="text-sm font-medium text-foreground">{t("inquiry.unavailable")}</p>
                      <Button variant="outline" className="mt-3 w-full" asChild>
                        <Link to="/properties">{t("inquiry.viewSimilar")}</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => requireAuth(() => setInquiryOpen(true))}>
                        <Send className="h-4 w-4" /> {t("inquiry.message")}
                      </Button>
                      <Button
                        className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90"
                        onClick={openWhatsApp}
                      >
                        <MessageCircle className="h-4 w-4" /> {t("inquiry.whatsapp")}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2" onClick={callAction}>
                          <Phone className="h-4 w-4" /> {t("inquiry.call")}
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => requireAuth(() => setViewingOpen(true))}>
                          <Calendar className="h-4 w-4" /> {t("inquiry.requestViewing")}
                        </Button>
                      </div>
                      {revealedPhone && (
                        <a
                          href={`tel:${revealedPhone.replace(/\s/g, "")}`}
                          className="rounded-lg bg-secondary/60 p-2 text-center font-display text-sm font-semibold text-foreground"
                        >
                          {revealedPhone}
                        </a>
                      )}
                    </>
                  )}

                  <ReportSheet
                    target={{ type: "property", label: property.title, propertyId: property.id, userId: ownerId }}
                    trigger={
                      <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-destructive">
                        <Flag className="h-3.5 w-3.5" /> {t("verify.reportSpace")}
                      </Button>
                    }
                  />
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

        {property && (
          <div className="container-page">
            <PropertyReviews propertyId={property.id} canRespond={!!user && !!ownerId && user.id === ownerId} />
          </div>
        )}

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

      {/* Mobile sticky action bar */}
      {agent && !unavailable && (
        <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-4 gap-1.5 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Button size="sm" className="flex-col gap-0.5 py-2 text-[11px]" onClick={() => requireAuth(() => setInquiryOpen(true))}>
              <Send className="h-4 w-4" /> {t("inquiry.message")}
            </Button>
            <Button
              size="sm"
              className="flex-col gap-0.5 bg-success py-2 text-[11px] text-success-foreground hover:bg-success/90"
              onClick={openWhatsApp}
            >
              <MessageCircle className="h-4 w-4" /> {t("inquiry.whatsapp")}
            </Button>
            <Button size="sm" variant="outline" className="flex-col gap-0.5 py-2 text-[11px]" onClick={callAction}>
              <Phone className="h-4 w-4" /> {t("inquiry.call")}
            </Button>
            <Button size="sm" variant="outline" className="flex-col gap-0.5 py-2 text-[11px]" onClick={() => requireAuth(() => setViewingOpen(true))}>
              <Calendar className="h-4 w-4" /> {t("inquiry.viewing")}
            </Button>
          </div>
        </div>
      )}
      {agent && unavailable && (
        <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <p className="mb-2 text-center text-xs text-muted-foreground">{t("inquiry.unavailable")}</p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/properties">{t("inquiry.viewSimilar")}</Link>
          </Button>
        </div>
      )}



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
        propertyId={property.id}
        ownerId={property.agentId}
        ownerName={agent?.name ?? ""}
      />


      {/* Viewing booking dialog */}
      <ViewingDialog
        open={viewingOpen}
        onOpenChange={setViewingOpen}
        propertyTitle={property.title}
        propertyId={property.id}
        ownerId={property.agentId}
      />

      <PropertyShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={property.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
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
  const [zoom, setZoom] = useState(1);
  const touchStart = useRef<number | null>(null);
  const prev = () => { setZoom(1); onIndex((index - 1 + images.length) % images.length); };
  const next = () => { setZoom(1); onIndex((index + 1) % images.length); };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.25));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) (dx > 0 ? prev() : next());
    touchStart.current = null;
  }

  return (
    <div className="fixed inset-0 z-[60] grid grid-rows-[auto_1fr_auto] bg-black/95 backdrop-blur" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="truncate text-sm font-medium">{index + 1} / {images.length} · {title}</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40" disabled={zoom <= 1}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40" disabled={zoom >= 3}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={onClose} aria-label="Close" className="ml-2 grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className="relative grid place-items-center overflow-auto px-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[index]}
          alt={`${title} ${index + 1}`}
          onDoubleClick={() => setZoom((z) => (z >= 2 ? 1 : z + 1))}
          style={{ transform: `scale(${zoom})`, transition: "transform 200ms" }}
          className="max-h-full max-w-full origin-center object-contain select-none"
          draggable={false}
        />
        <button onClick={prev} aria-label="Previous" className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} aria-label="Next" className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto p-4">
        {images.map((img, i) => (
          <button key={i} onClick={() => { setZoom(1); onIndex(i); }} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition", i === index ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}>
            <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InquiryDialog({
  open,
  onOpenChange,
  propertyTitle,
  propertyId,
  ownerId,
  ownerName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyTitle: string;
  propertyId: string;
  ownerId: string;
  ownerName: string;
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setMessage(t("inquiry.suggested"));
  }, [open, t]);

  async function submit() {
    if (message.trim().length < 10) { toast.error(t("inquiry.tooShort")); return; }
    setSending(true);
    const res = await sendPropertyMessage({ propertyId, ownerId, body: message });
    setSending(false);
    if (!res.ok) {
      toast.error(res.error === "auth" ? t("inquiry.signInRequired") : t("inquiry.sendFailed"));
      return;
    }
    toast.success(t("inquiry.sent"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inquiry.message")}</DialogTitle>
          <DialogDescription>{t("inquiry.formHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-secondary/60 p-3 text-xs">
            <div className="font-medium text-foreground">{propertyTitle}</div>
            {ownerName && <div className="mt-0.5 text-muted-foreground">{ownerName}</div>}
          </div>
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <p className="text-[11px] text-muted-foreground">{message.length}/1000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={sending} className="gap-1.5">
            <Send className="h-4 w-4" /> {t("inquiry.sendMessage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ViewingDialog({ open, onOpenChange, propertyTitle, propertyId, ownerId }: { open: boolean; onOpenChange: (v: boolean) => void; propertyTitle: string; propertyId: string; ownerId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  async function submit() {
    if (sending) return; // guard against double taps
    if (!date || !time) { toast.error("Choose a date and a time"); return; }
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      toast.error("Please choose a future date and time");
      return;
    }
    setSending(true);
    const res = await createViewingRequest({
      propertyId,
      ownerId,
      scheduledAt: when.toISOString(),
      message: notes.trim() || undefined,
    });
    setSending(false);
    if (!res.ok) {
      const msg =
        res.error === "auth" ? "Please sign in to request a viewing."
        : res.error === "property_missing" ? "This property could not be found."
        : res.error === "invalid_date" ? "Please choose a future date and time."
        : res.error === "permission" ? "You don't have permission to submit this request."
        : "We couldn't send your request. Please try again.";
      toast.error(msg);
      return;
    }
    toast.success("Viewing request sent successfully.", {
      description: "Waiting for the owner/agent to confirm.",
    });
    setNotes("");
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
          <Button onClick={() => void submit()} disabled={sending} className="gap-1.5"><Calendar className="h-4 w-4" /> {sending ? "Sending request..." : "Request viewing"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
