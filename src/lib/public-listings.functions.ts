import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicListing, listPublicListings } from "./public-listings.server";
import { locationSlug } from "./seo";

export const getListingSeo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => await getPublicListing(data.id));

export const getLocationSeo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const all = await listPublicListings(500);
    const matches = all.filter((p) =>
      [p.ward, p.district, p.city].some((v) => v && locationSlug(v) === data.slug),
    );
    if (!matches.length) return null;
    const first = matches[0]!;
    const name =
      [first.ward, first.district, first.city].find((v) => v && locationSlug(v) === data.slug) ?? data.slug;
    const prices = matches.map((p) => p.price).filter((n) => n > 0);
    const typeCounts = new Map<string, number>();
    for (const m of matches) typeCounts.set(m.category, (typeCounts.get(m.category) ?? 0) + 1);
    // Region/district context lets the page describe the area accurately.
    const parent = first.ward && locationSlug(first.ward) === data.slug ? first.district : first.city;
    return {
      name,
      parent: parent && parent !== name ? parent : null,
      count: matches.length,
      forRent: matches.filter((p) => p.listingType === "rent").length,
      forSale: matches.filter((p) => p.listingType === "sale").length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      currency: first.currency,
      types: [...typeCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
