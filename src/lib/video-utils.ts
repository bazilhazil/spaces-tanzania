// Extract duration + a thumbnail (JPEG File) from a user-selected video.

export type VideoMeta = { duration: number; width: number; height: number };

export function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.muted = true;
    v.onloadedmetadata = () => {
      const meta = { duration: v.duration || 0, width: v.videoWidth, height: v.videoHeight };
      URL.revokeObjectURL(url);
      res(meta);
    };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Cannot read video")); };
  });
}

export function generateVideoThumbnail(file: File, atSecond = 1): Promise<File> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = url;

    const finish = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 640;
        canvas.height = v.videoHeight || 360;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          if (!b) return rej(new Error("thumb failed"));
          res(new File([b], "video-thumb.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      } catch (e) { URL.revokeObjectURL(url); rej(e); }
    };

    v.onloadedmetadata = () => { v.currentTime = Math.min(atSecond, (v.duration || 1) * 0.25); };
    v.onseeked = finish;
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error("video error")); };
  });
}
