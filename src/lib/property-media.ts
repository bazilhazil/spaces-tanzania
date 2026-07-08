import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

let _webpSupport: boolean | null = null;
function supportsWebP(): boolean {
  if (_webpSupport !== null) return _webpSupport;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    _webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webpSupport = false; }
  return _webpSupport!;
}

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const useWebP = supportsWebP();
  const targetType = useWebP ? "image/webp" : "image/jpeg";
  const ext = useWebP ? ".webp" : ".jpg";
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      fileType: targetType,
      initialQuality: useWebP ? 0.82 : 0.85,
    });
    return new File([compressed], file.name.replace(/\.[^.]+$/, ext), {
      type: targetType,
    });
  } catch {
    return file;
  }
}

/** Rotate + crop a source image (dataURL/objectURL) and return a JPEG File. */
export async function cropRotateToFile(
  src: string,
  crop: { x: number; y: number; width: number; height: number },
  rotation: number,
  filename = "photo.jpg",
): Promise<File> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = img.width * cos + img.height * sin;
  const rotH = img.width * sin + img.height * cos;

  // Draw rotated image onto a temp canvas
  const tmp = document.createElement("canvas");
  tmp.width = rotW;
  tmp.height = rotH;
  const tctx = tmp.getContext("2d")!;
  tctx.translate(rotW / 2, rotH / 2);
  tctx.rotate(rad);
  tctx.drawImage(img, -img.width / 2, -img.height / 2);

  // Crop
  const out = document.createElement("canvas");
  out.width = crop.width;
  out.height = crop.height;
  const octx = out.getContext("2d")!;
  octx.drawImage(tmp, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const blob: Blob = await new Promise((res) =>
    out.toBlob((b) => res(b as Blob), "image/jpeg", 0.9),
  );
  return new File([blob], filename, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

const BUCKET = "property-media";

export async function uploadMediaFile(
  userId: string,
  propertyId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string }> {
  const ext = file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "jpg");
  const path = `${userId}/${propertyId}/${crypto.randomUUID()}.${ext}`;
  onProgress?.(10);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  onProgress?.(100);
  if (error) throw error;
  return { path };
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
