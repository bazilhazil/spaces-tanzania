import { BrandMark } from "@/components/brand";

interface LogoProps {
  className?: string;
  /**
   * Kept for backwards compatibility. The unified brand system always renders
   * the mark; use <Brand /> when you need the mark + wordmark together.
   */
  markOnly?: boolean;
}

/**
 * @deprecated Prefer `<Brand />` from "@/components/brand". Retained so older
 * call sites keep working — internally it now renders the same unified mark.
 */
export function Logo({ className }: LogoProps) {
  return <BrandMark className={className} />;
}
