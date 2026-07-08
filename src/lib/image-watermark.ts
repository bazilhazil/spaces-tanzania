// Apply a subtle SPACES watermark to a photo (bottom-right).
// Returns a new File (JPEG) preserving dimensions.

export async function watermarkImage(file: File, label = "SPACES"): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const fontSize = Math.max(18, Math.round(Math.min(canvas.width, canvas.height) * 0.028));
    const pad = Math.round(fontSize * 0.9);
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "right";

    // Subtle dark backdrop for legibility
    const metrics = ctx.measureText(label);
    const tw = metrics.width + pad * 1.4;
    const th = fontSize * 1.6;
    const x = canvas.width - pad;
    const y = canvas.height - pad;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    // rounded rect
    const rx = x - tw, ry = y - th, r = th * 0.28;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + tw, ry, rx + tw, ry + th, r);
    ctx.arcTo(rx + tw, ry + th, rx, ry + th, r);
    ctx.arcTo(rx, ry + th, rx, ry, r);
    ctx.arcTo(rx, ry, rx + tw, ry, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fillText(label, x - pad * 0.2, y - fontSize * 0.35);

    URL.revokeObjectURL(url);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), "image/jpeg", 0.9),
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
