import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, Heart, MapPin, Share2, ShieldCheck, Trash2, Home as HomeIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PropertyShareDialog } from "@/components/property-share-dialog";
import { useFavorites } from "@/hooks/use-favorites";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { cn } from "@/lib/utils";
import { canonicalPropertyUrl } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "My Saved Spaces — SPACES" },
      { name: "description", content: "Spaces you've saved on SPACES." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type FavRow = {
  id: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  region: string | null;
  district: string | null;
  property_type: string | null;
  listing_type: string | null;
  verified: boolean | null;
  image?: string | null;
};

function formatPrice(price: number | null, currency: string | null) {
  if (!price) return "—";
  const cur = currency || "TZS";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${cur} ${price.toLocaleString()}`;
  }
}


function FavoritesPage() {
  const { t, lang } = useI18n();
  const { favorites, removeFavorite } = useFavorites();
  const [rows, setRows] = useState<Record<string, FavRow>>({});
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<FavRow | null>(null);

  const ids = useMemo(
    () => favorites.map((f) => f.propertyId).filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    [favorites],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!ids.length) { setRows({}); setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("properties")
        .select("id,title,price,currency,region,district,property_type,listing_type,verified")
        .in("id", ids);
      const { data: media } = await supabase
        .from("property_media")
        .select("property_id,storage_path,is_cover,position")
        .in("property_id", ids)
        .order("position", { ascending: true });
      const coverByProp: Record<string, string> = {};
      for (const m of (media ?? []) as any[]) {
        if (!coverByProp[m.property_id] || m.is_cover) coverByProp[m.property_id] = m.storage_path;
      }
      const urlEntries = await Promise.all(
        Object.entries(coverByProp).map(async ([pid, path]) => [pid, await signedUrl(path)] as const),
      );
      const urls = Object.fromEntries(urlEntries);
      if (!alive) return;
      const map: Record<string, FavRow> = {};
      for (const r of (data ?? []) as any[]) {
        map[r.id] = { ...r, image: urls[r.id] ?? null };
      }
      setRows(map);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [ids.join(",")]);

  const items = favorites
    .map((f) => ({ fav: f, row: rows[f.propertyId] }))
    .filter((x): x is { fav: typeof favorites[number]; row: FavRow } => Boolean(x.row));

  const dateFmt = new Intl.DateTimeFormat(lang === "sw" ? "sw-TZ" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  const shareUrl = share ? canonicalPropertyUrl(share.id) : "";


  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {t("favoritesPage.back")}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("favoritesPage.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("favoritesPage.subtitle")}</p>
        </header>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ fav, row }) => (
              <article
                key={fav.propertyId}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link
                  to="/property/$id"
                  params={{ id: fav.propertyId }}
                  className="relative block aspect-[4/3] overflow-hidden bg-muted"
                >
                  {row.image ? (
                    <img src={row.image} alt={row.title ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <HomeIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {row.property_type && (
                      <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium capitalize text-foreground shadow-sm backdrop-blur">
                        {row.property_type}
                      </span>
                    )}
                    {row.listing_type && (
                      <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                        {row.listing_type === "rent" ? t("card.forRent") : t("card.forSale")}
                      </span>
                    )}
                    {row.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                        <ShieldCheck className="h-3 w-3" /> {t("saved.verified")}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <Link to="/property/$id" params={{ id: fav.propertyId }} className="line-clamp-1 font-display text-base font-semibold text-foreground hover:text-primary">
                      {row.title ?? "Untitled"}
                    </Link>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{[row.district, row.region].filter(Boolean).join(", ") || "—"}</span>
                    </p>
                  </div>
                  <p className="font-display text-lg font-bold text-primary">
                    {formatPrice(row.price, row.currency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("favoritesPage.savedOn", { date: dateFmt.format(new Date(fav.savedAt)) })}
                  </p>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <Button asChild size="sm" className="gap-1.5 rounded-xl">
                      <Link to="/properties/$slug" params={{ slug: fav.propertyId }}>{t("saved.viewSpace")}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
                      <Link to="/properties/$slug" params={{ slug: fav.propertyId }} hash="viewing">
                        <CalendarPlus className="h-3.5 w-3.5" /> {t("saved.requestViewing")}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setShare(row)}>
                      <Share2 className="h-3.5 w-3.5" /> {t("saved.share")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => { removeFavorite(fav.propertyId); toast.success(t("favoritesPage.removed")); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("favoritesPage.remove")}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <PropertyShareDialog
        open={!!share}
        onOpenChange={(o) => !o && setShare(null)}
        title={share?.title ?? "SPACES"}
        url={shareUrl}
      />
    </DashboardShell>
  );
}


function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Heart className="h-6 w-6" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{t("favoritesPage.emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("favoritesPage.emptyBody")}</p>
      </div>
      <Link
        to="/"
        className={cn(
          "inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground",
          "shadow-[var(--shadow-soft)] transition hover:bg-primary/90",
        )}
      >
        {t("favoritesPage.browse")}
      </Link>
    </div>
  );
}
