import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Ten years — the bucket is private, so the stored URL is a long-lived signed URL. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type.toLowerCase())) return "invalidType";
  if (file.size > AVATAR_MAX_BYTES) return "tooLarge";
  return null;
}

/** Uploads the photo under the user's own folder and returns a displayable URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not prepare the photo");
  return data.signedUrl;
}
