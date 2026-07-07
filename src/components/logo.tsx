import logoAsset from "@/assets/spaces-logo.jpeg.asset.json";

interface LogoProps {
  className?: string;
  /** When true, shows only the mark (crops out the "Spaces" wordmark below). */
  markOnly?: boolean;
}

/** SPACES brand logo — uses the uploaded brand image from the CDN. */
export function Logo({ className, markOnly = true }: LogoProps) {
  if (markOnly) {
    // Crop to the top mark area of the square logo image.
    return (
      <span
        className={className}
        role="img"
        aria-label="SPACES"
        style={{
          display: "inline-block",
          backgroundImage: `url(${logoAsset.url})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 22%",
          backgroundSize: "170% auto",
        }}
      />
    );
  }
  return (
    <img
      src={logoAsset.url}
      alt="SPACES"
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
