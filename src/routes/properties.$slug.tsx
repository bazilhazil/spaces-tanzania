import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  ChevronRight,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property-card";
import { formatPrice, getAgent, getProperty, properties } from "@/lib/mock-data";

export const Route = createFileRoute("/properties/$slug")({
  loader: ({ params }) => {
    const property = getProperty(params.slug);
    if (!property) throw notFound();
    return property;
  },
  component: PropertyDetailPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-3xl">Property not found</h1>
        <Link to="/properties" className="mt-4 inline-block text-primary underline">
          Back to properties
        </Link>
      </div>
    </div>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — SPACES` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.title} — SPACES` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:image", content: loaderData.images[0] },
          { property: "og:type", content: "article" },
          { name: "twitter:image", content: loaderData.images[0] },
        ]
      : [],
  }),
});

function PropertyDetailPage() {
  const property = Route.useLoaderData();
  const agent = getAgent(property.agentId);
  const [activeImage, setActiveImage] = useState(0);
  const similar = properties.filter((p) => p.id !== property.id && p.category === property.category).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-page pt-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/properties" className="hover:text-primary">Properties</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="line-clamp-1 text-foreground">{property.title}</span>
          </nav>
        </div>

        {/* Gallery */}
        <section className="container-page mt-4">
          <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2">
            <div className="relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-2">
              <div className="aspect-[4/3] md:aspect-auto md:h-full">
                <img
                  src={property.images[activeImage] ?? property.images[0]}
                  alt={property.title}
                  width={1920}
                  height={1200}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <div className="flex flex-wrap gap-2">
                  {property.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/95 px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified by SPACES
                    </span>
                  )}
                  {property.premium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
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
              </button>
            ))}
          </div>
        </section>

        <section className="container-page mt-10 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  For {property.listingType === "sale" ? "Sale" : property.listingType === "rent" ? "Rent" : "Lease"} · {property.category}
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
                  {property.title}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {property.street}, {property.ward}, {property.district}, {property.city}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold text-primary md:text-4xl">
                  {formatPrice(property.price, property.currency, property.listingType)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Heart className="h-4 w-4" /> Save
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-secondary/40 p-4 sm:grid-cols-4">
              <Fact icon={<BedDouble className="h-4 w-4" />} label="Bedrooms" value={property.bedrooms || "—"} />
              <Fact icon={<Bath className="h-4 w-4" />} label="Bathrooms" value={property.bathrooms} />
              <Fact icon={<Car className="h-4 w-4" />} label="Parking" value={property.parking} />
              <Fact icon={<Ruler className="h-4 w-4" />} label="Size" value={`${property.size} m²`} />
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">About this space</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
                {property.description}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a: string) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" /> {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Year built" value={property.yearBuilt.toString()} icon={<Calendar className="h-4 w-4" />} />
              <InfoBlock label="Furnished" value={property.furnished ? "Yes" : "No"} icon={<Sparkles className="h-4 w-4" />} />
              <InfoBlock label="Property type" value={property.category} icon={<Building2 className="h-4 w-4" />} />
              <InfoBlock label="Property ID" value={property.id.toUpperCase()} icon={<BadgeCheck className="h-4 w-4" />} />
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-foreground">Location</h2>
              <div className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border">
                <iframe
                  title={`Map of ${property.title}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.ward}, ${property.city}, Tanzania`)}&z=13&output=embed`}
                  loading="lazy"
                  className="h-full w-full"
                />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <NearbyItem label="Schools" />
                <NearbyItem label="Hospitals" />
                <NearbyItem label="Supermarkets" />
                <NearbyItem label="Bus stops" />
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
                  <div>
                    <p className="font-semibold text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.agency}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                      <Star className="h-3.5 w-3.5 fill-current" /> {agent.rating.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <a
                    href={`https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(`Hello, I'm interested in ${property.title} on SPACES.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                  <a href={`tel:${agent.phone.replace(/\s/g, "")}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Phone className="h-4 w-4" /> Call {agent.phone}
                    </Button>
                  </a>
                  <a href={`mailto:${agent.email}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                  </a>
                  <Button className="mt-1 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Calendar className="h-4 w-4" /> Book a viewing
                  </Button>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified agent. Response within 24 hours.</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        {similar.length > 0 && (
          <section className="bg-secondary/40 mt-16">
            <div className="container-page py-16">
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Similar spaces
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
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
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
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function NearbyItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span>Nearby {label}</span>
    </div>
  );
}
