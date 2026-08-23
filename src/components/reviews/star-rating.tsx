import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function StarDisplay({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(px, i <= Math.round(value) ? "fill-[color:var(--color-gold-500,#f5b301)] text-[color:var(--color-gold-500,#f5b301)]" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  size = "lg",
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
  label?: string;
}) {
  const [hover, setHover] = useState(0);
  const px = size === "lg" ? "h-9 w-9" : "h-6 w-6";
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label ?? "Rating"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star`}
          className="rounded-md p-0.5 transition-transform active:scale-95 touch-manipulation"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={cn(
              px,
              i <= shown
                ? "fill-[color:var(--color-gold-500,#f5b301)] text-[color:var(--color-gold-500,#f5b301)]"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
