import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublicListings } from "@/lib/public-listings.server";
import { locationSlug, propertySlug, SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

type Entry = { path: string; changefreq: string; priority: string; lastmod?: string };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let listings: Awaited<ReturnType<typeof listPublicListings>> = [];
        try {
          listings = await listPublicListings(1000);
        } catch {
          listings = [];
        }

        const locations = new Map<string, string>();
        for (const p of listings) {
          for (const v of [p.ward, p.district, p.city]) {
            if (v) locations.set(locationSlug(v), v);
          }
        }

        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/properties", changefreq: "daily", priority: "0.9" },
          { path: "/agents", changefreq: "weekly", priority: "0.6" },
          ...[...locations.keys()].filter(Boolean).map((slug) => ({
            path: `/spaces/${slug}`,
            changefreq: "daily",
            priority: "0.8",
          })),
          ...listings.map((p) => ({
            path: `/properties/${propertySlug({
              id: p.id,
              title: p.title,
              category: p.category,
              listingType: p.listingType,
              bedrooms: p.bedrooms,
              ward: p.ward,
              district: p.district,
              city: p.city,
            })}`,
            changefreq: "weekly",
            priority: "0.7",
            lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined,
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
