import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getCoverPath } from "@/lib/public-listings.server";

/**
 * Stable share-preview image URL for a public listing.
 * Media lives in a private bucket, so we mint a short-lived signed URL on each
 * crawl and redirect to it. Only the cover photo of a publicly visible listing
 * is ever exposed here.
 */
export const Route = createFileRoute("/api/public/og/property/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const path = await getCoverPath(params.id);
          if (!path) return new Response("Not found", { status: 404 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.storage
            .from("property-media")
            .createSignedUrl(path, 60 * 60 * 24);
          if (!data?.signedUrl) return new Response("Not found", { status: 404 });
          return new Response(null, {
            status: 302,
            headers: { Location: data.signedUrl, "Cache-Control": "public, max-age=3600" },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
