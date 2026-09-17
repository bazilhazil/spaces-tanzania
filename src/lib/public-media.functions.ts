import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PUBLIC_STATUSES = ["live", "sold", "rented"];

/**
 * Mints short-lived signed URLs for listing photos/videos that belong to a
 * publicly visible listing. Storage itself stays private: the caller can only
 * receive a URL for a path that is registered as media of a live/sold/rented
 * listing, never for arbitrary files in the bucket.
 */
export const signPublicMediaFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        paths: z.array(z.string().min(1).max(500)).min(1).max(100),
        expiresIn: z.number().int().min(60).max(86400).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiresIn = data.expiresIn ?? 3600;

    const { data: rows } = await supabaseAdmin
      .from("property_media")
      .select("storage_path, properties!inner(status, deleted_at)")
      .in("storage_path", data.paths);

    const allowed = ((rows ?? []) as unknown as {
      storage_path: string;
      properties: { status: string; deleted_at: string | null } | null;
    }[])
      .filter(
        (r) =>
          r.properties &&
          PUBLIC_STATUSES.includes(r.properties.status) &&
          !r.properties.deleted_at,
      )
      .map((r) => r.storage_path);

    const out: Record<string, string> = {};
    await Promise.all(
      allowed.map(async (path) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("property-media")
          .createSignedUrl(path, expiresIn);
        if (signed?.signedUrl) out[path] = signed.signedUrl;
      }),
    );
    return out;
  });
