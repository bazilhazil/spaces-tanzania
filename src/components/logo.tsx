import markAsset from "@/assets/spaces-logo-mark.png.asset.json";
import brandAsset from "@/assets/spaces-logo-brand.png.asset.json";

interface LogoProps {
  className?: string;
  /** When true, shows only the SPACES mark. When false, shows the full wordmark. */
  markOnly?: boolean;
}

/** SPACES brand logo — deep blue and gold mark/wordmark from the CDN. */
export function Logo({ className, markOnly = true }: LogoProps) {
  return (
    <img
      src={markOnly ? markAsset.url : brandAsset.url}
      alt="SPACES"
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
