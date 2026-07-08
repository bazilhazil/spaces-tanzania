import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Eye, Heart, MessageSquare, TrendingUp, Home, Upload, BarChart3,
  Bell, CheckCircle2, Loader2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  StatusBadge, StatCard, DashboardTile, NotificationCard,
  EmptyState, SkeletonCard, PriceInput, PhoneInput, OtpField, SearchInput,
  type StatusKind,
} from "@/components/ds";

export const Route = createFileRoute("/design-system")({
  component: DesignSystemPage,
  head: () => ({
    meta: [
      { title: "Design System — SPACES" },
      { name: "description", content: "SPACES Design System: colors, typography, components and motion for the entire application." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const BRAND_SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

function DesignSystemPage() {
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState<number | undefined>();
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-linear-to-br from-[color:var(--color-brand-50)] via-background to-[color:var(--color-gold-50)]">
        <div className="container-page py-16">
          <div className="ds-caption">SPACES Design System · v1.0</div>
          <h1 className="ds-h-xl mt-3">The foundation of every SPACES screen.</h1>
          <p className="ds-body-lg mt-4 max-w-2xl text-muted-foreground">
            Premium, modern, elegant. One color system, one typography scale, one motion language —
            reused across the marketplace, owner portal, and agent tools.
          </p>
        </div>
      </header>

      <main className="container-page space-y-20 py-16">
        {/* Principles */}
        <Section title="Design Principles" caption="What every screen must feel like">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {["Premium", "Modern", "Elegant", "Fast", "Simple", "Professional", "Trustworthy", "Minimal", "Mobile-first"].map((p) => (
              <div key={p} className="ds-card p-4 text-center">
                <div className="ds-h-sm">{p}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Colors */}
        <Section title="Color System" caption="Semantic tokens with 50–900 scales">
          <ScaleRow name="Brand · Deep Blue" varName="brand" />
          <ScaleRow name="Gold" varName="gold" />
          <ScaleRow name="Gray" varName="gray" />
          <ScaleRow name="Success" varName="success" />
          <ScaleRow name="Warning" varName="warning" />
          <ScaleRow name="Danger" varName="danger" />
        </Section>

        {/* Typography */}
        <Section title="Typography" caption="Outfit for display, Inter for body">
          <div className="ds-card space-y-4 p-6">
            <div><div className="ds-caption mb-1">Heading XL · ds-h-xl</div><div className="ds-h-xl">Find your perfect space</div></div>
            <div><div className="ds-caption mb-1">Heading Large · ds-h-lg</div><div className="ds-h-lg">Verified homes across Tanzania</div></div>
            <div><div className="ds-caption mb-1">Heading Medium · ds-h-md</div><div className="ds-h-md">Recently listed properties</div></div>
            <div><div className="ds-caption mb-1">Heading Small · ds-h-sm</div><div className="ds-h-sm">This week's viewings</div></div>
            <div><div className="ds-caption mb-1">Body Large · ds-body-lg</div><div className="ds-body-lg text-muted-foreground">Comfortable reading size for long-form descriptions and marketing copy.</div></div>
            <div><div className="ds-caption mb-1">Body · ds-body</div><div className="ds-body text-muted-foreground">Default paragraph text used across the interface for everything.</div></div>
            <div><div className="ds-caption mb-1">Caption · ds-caption</div><div className="ds-caption">SECONDARY LABEL TEXT</div></div>
            <div><div className="ds-caption mb-1">Button · ds-button-text</div><div className="ds-button-text">Publish now</div></div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" caption="6 variants · 4 sizes · loading & disabled">
          <div className="ds-card space-y-6 p-6">
            <Row label="Variants">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Danger</Button>
              <Button variant="success">Success</Button>
              <Button variant="gold">Gold</Button>
              <Button variant="premium">Premium</Button>
            </Row>
            <Row label="Sizes">
              <Button size="sm">Small</Button>
              <Button>Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra large</Button>
            </Row>
            <Row label="States">
              <Button disabled>Disabled</Button>
              <Button disabled><Loader2 className="animate-spin" /> Loading…</Button>
              <Button variant="destructive"><Trash2 /> Delete</Button>
            </Row>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs" caption="Consistent rounded fields with focus rings">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrap label="Text">
              <Input placeholder="Full name" className="h-12" />
            </FieldWrap>
            <FieldWrap label="Search">
              <SearchInput value={search} onChange={setSearch} placeholder="Search listings…" />
            </FieldWrap>
            <FieldWrap label="Phone">
              <PhoneInput value={phone} onChange={setPhone} />
            </FieldWrap>
            <FieldWrap label="Price">
              <PriceInput value={price} onChange={setPrice} currency="TZS" />
            </FieldWrap>
            <FieldWrap label="Dropdown">
              <select className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary">
                <option>Rent</option><option>Sale</option>
              </select>
            </FieldWrap>
            <FieldWrap label="Textarea">
              <textarea rows={3} placeholder="Tell us more…" className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary" />
            </FieldWrap>
            <FieldWrap label="OTP" className="sm:col-span-2">
              <OtpField value={otp} onChange={setOtp} />
            </FieldWrap>
            <FieldWrap label="Validation states" className="sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input placeholder="Default" className="h-11" />
                <Input placeholder="Success" className="h-11 border-success focus-visible:ring-success" />
                <Input placeholder="Error" className="h-11 border-destructive focus-visible:ring-destructive" />
              </div>
            </FieldWrap>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Status Badges" caption="One badge system for every listing state">
          <div className="ds-card p-6">
            <div className="flex flex-wrap gap-2">
              {(["verified","premium","featured","new","live","pending","draft","sold","rented"] as StatusKind[]).map((k) => (
                <StatusBadge key={k} kind={k} />
              ))}
            </div>
            <div className="ds-caption mt-6">shadcn variants</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Danger</Badge>
              <Badge variant="gold">Gold</Badge>
              <Badge variant="muted">Muted</Badge>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" caption="Reusable surfaces across the app">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Views this week" value="12,480" delta={12} icon={Eye} tone="brand" />
            <StatCard label="Favorites" value="342" delta={-4} icon={Heart} tone="danger" />
            <StatCard label="Messages" value="58" delta={22} icon={MessageSquare} tone="success" />
            <StatCard label="Conversion" value="3.4%" delta={1} icon={TrendingUp} tone="gold" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <DashboardTile title="My Properties" description="View and manage every listing" icon={Home} />
            <DashboardTile title="Upload Property" description="Publish a new space in minutes" icon={Upload} accent="gold" />
            <DashboardTile title="Analytics" description="Performance across your portfolio" icon={BarChart3} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <NotificationCard title="New viewing request" body="Amina wants to visit your Mikocheni apartment on Saturday." time="2 min ago" unread tone="brand" />
            <NotificationCard title="Listing approved" body="Your Masaki villa is now live and visible to buyers." time="1 hour ago" icon={CheckCircle2} tone="success" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EmptyState
              title="No properties yet"
              description="Publish your first listing and start reaching buyers today."
              icon={Home}
              action={{ label: "Upload property", href: "/upload" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </Section>

        {/* Elevation / Radius / Spacing */}
        <Section title="Elevation, Radius & Spacing" caption="One system used everywhere">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="ds-card ds-shadow-sm p-6 text-center"><div className="ds-caption">Small</div><div className="ds-h-sm mt-1">shadow-sm</div></div>
            <div className="ds-card ds-shadow-md p-6 text-center"><div className="ds-caption">Medium</div><div className="ds-h-sm mt-1">shadow-md</div></div>
            <div className="ds-card ds-shadow-lg p-6 text-center"><div className="ds-caption">Large</div><div className="ds-h-sm mt-1">shadow-lg</div></div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              { r: "rounded-md",  label: "md · 6px" },
              { r: "rounded-xl",  label: "xl · 16px" },
              { r: "rounded-2xl", label: "2xl · 20px" },
              { r: "rounded-full",label: "full · pill" },
            ].map((x) => (
              <div key={x.label} className={`bg-primary/10 border border-primary/20 p-6 text-center ${x.r}`}>
                <div className="ds-caption">Radius</div>
                <div className="ds-h-sm mt-1">{x.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 ds-card p-6">
            <div className="ds-caption mb-3">Spacing scale (Tailwind default · 4px base)</div>
            <div className="flex items-end gap-2">
              {[1, 2, 3, 4, 6, 8, 12, 16, 20, 24].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div className="bg-primary" style={{ width: 24, height: n * 4 }} />
                  <div className="text-[10px] text-muted-foreground">{n}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Motion */}
        <Section title="Motion" caption="Fast, purposeful animations">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="ds-card p-6 text-center">
              <div className="ds-caption">Hover lift</div>
              <div className="ds-hover-lift mt-4 grid h-24 place-items-center rounded-xl bg-primary/10 font-semibold">Hover me</div>
            </div>
            <div className="ds-card p-6 text-center">
              <div className="ds-caption">Success pop</div>
              <div className="mt-4 grid place-items-center">
                <div className="ds-animate-pop grid h-16 w-16 place-items-center rounded-full bg-success text-success-foreground">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
            </div>
            <div className="ds-card p-6 text-center">
              <div className="ds-caption">Skeleton</div>
              <div className="mt-4 space-y-2">
                <div className="ds-skeleton h-4 w-3/4" />
                <div className="ds-skeleton h-4 w-1/2" />
                <div className="ds-skeleton h-4 w-2/3" />
              </div>
            </div>
          </div>
        </Section>

        {/* Icons */}
        <Section title="Icons" caption="One family: Lucide · 1.5 stroke · 16–24px">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-6 text-primary">
                <Home /><Eye /><Heart /><MessageSquare /><Bell />
                <TrendingUp /><BarChart3 /><Upload /><CheckCircle2 />
              </div>
              <p className="ds-body mt-4 text-muted-foreground">
                Import from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">lucide-react</code>.
                Never mix multiple icon libraries.
              </p>
            </CardContent>
          </Card>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <div className="ds-caption">{caption}</div>
        <h2 className="ds-h-lg mt-1">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="ds-caption mb-3">{label}</div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function FieldWrap({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ScaleRow({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="ds-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="ds-h-sm">{name}</div>
        <div className="ds-caption">--color-{varName}-*</div>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {BRAND_SCALE.map((step) => (
          <div key={step} className="overflow-hidden rounded-xl border border-border">
            <div className="h-14" style={{ backgroundColor: `var(--color-${varName}-${step})` }} />
            <div className="bg-card px-2 py-1 text-center text-[10px] font-semibold text-muted-foreground">{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
