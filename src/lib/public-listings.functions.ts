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
    const first = matches[0];
    const name =
      [first.ward, first.district, first.city].find((v) => v && locationSlug(v) === data.slug) ?? data.slug;
    return {
      name,
      count: matches.length,
      forRent: matches.filter((p) => p.listingType === "rent").length,
      forSale: matches.filter((p) => p.listingType === "sale").length,
      minPrice: Math.min(...matches.map((p) => p.price).filter((n) => n > 0)),
      currency: first.currency,
    };
  });
