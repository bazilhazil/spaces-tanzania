// Client-side image quality analysis.
// Scores brightness, sharpness (Laplacian variance), resolution, orientation, blur.
// Runs entirely in-browser on a downscaled canvas — fast, private, no network.

export type QualityMetrics = {
  score: number;              // 0–100
  brightness: number;         // 0–255
  sharpness: number;          // Laplacian variance (higher = sharper)
  width: number;
  height: number;
  megapixels: number;
  orientation: "landscape" | "portrait" | "square";
  issues: string[];           // human-readable
  tag: "excellent" | "good" | "fair" | "poor";
};

function loadBitmap(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function analyzeImage(src: string): Promise<QualityMetrics> {
  const img = await loadBitmap(src);
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  const megapixels = +((W * H) / 1_000_000).toFixed(1);

  // Downscale for fast analysis
  const target = 240;
  const scale = Math.min(1, target / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // Cross-origin taint — return safe defaults
    return {
      score: 70, brightness: 128, sharpness: 100,
      width: W, height: H, megapixels,
      orientation: W === H ? "square" : W > H ? "landscape" : "portrait",
      issues: [], tag: "good",
    };
  }

  // Luminance array
  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum[j] = l;
    sum += l;
  }
  const brightness = sum / (w * h);

  // Laplacian variance for sharpness
  let mean = 0;
  const lap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v =
        -lum[i - w] - lum[i - 1] + 4 * lum[i] - lum[i + 1] - lum[i + w];
      lap[i] = v;
      mean += v;
    }
  }
  const n = (w - 2) * (h - 2);
  mean /= n;
  let variance = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const d = lap[y * w + x] - mean;
      variance += d * d;
    }
  }
  const sharpness = variance / n;

  // Score
  const orientation: QualityMetrics["orientation"] =
    W === H ? "square" : W > H ? "landscape" : "portrait";
  const issues: string[] = [];

  // Brightness: ideal 90–180
  let brightScore = 100;
  if (brightness < 60) { brightScore = 45; issues.push("Photo looks dark — try more natural light"); }
  else if (brightness < 90) { brightScore = 75; issues.push("A bit dim — brighter light helps"); }
  else if (brightness > 220) { brightScore = 55; issues.push("Overexposed — avoid direct sunlight"); }
  else if (brightness > 195) { brightScore = 80; issues.push("Slightly overexposed"); }

  // Sharpness: >250 crisp, 100–250 ok, <100 blurry
  let sharpScore = 100;
  if (sharpness < 60) { sharpScore = 35; issues.push("Photo appears blurry — hold your phone steady"); }
  else if (sharpness < 120) { sharpScore = 70; issues.push("Slightly soft focus"); }
  else if (sharpness < 200) { sharpScore = 88; }

  // Resolution: prefer >= 1.5MP
  let resScore = 100;
  if (megapixels < 0.5) { resScore = 40; issues.push("Low resolution — use a higher-quality camera setting"); }
  else if (megapixels < 1.2) { resScore = 70; issues.push("Resolution is on the low side"); }

  // Orientation: landscape preferred for property photos
  let oriScore = 100;
  if (orientation === "portrait" && Math.max(W, H) / Math.min(W, H) > 1.6) {
    oriScore = 85;
    issues.push("Landscape orientation shows the space better");
  }

  const score = Math.round(
    brightScore * 0.28 + sharpScore * 0.42 + resScore * 0.2 + oriScore * 0.1
  );

  const tag: QualityMetrics["tag"] =
    score >= 88 ? "excellent" : score >= 72 ? "good" : score >= 55 ? "fair" : "poor";

  return {
    score, brightness: Math.round(brightness), sharpness: Math.round(sharpness),
    width: W, height: H, megapixels, orientation, issues, tag,
  };
}
