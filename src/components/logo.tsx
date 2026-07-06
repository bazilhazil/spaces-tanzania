interface LogoProps {
  className?: string;
}

/** SPACES mark — deep blue circle with gold roofline notch. */
export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="spaces-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.42 0.11 250)" />
          <stop offset="100%" stopColor="oklch(0.55 0.14 250)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#spaces-grad)" />
      <path
        d="M11 27 L20 17 L29 27 Z"
        fill="oklch(0.74 0.12 82)"
      />
      <circle cx="20" cy="20" r="18" fill="none" stroke="oklch(1 0 0 / 0.15)" />
    </svg>
  );
}
