import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  countryCode?: string;
};

export function PhoneInput({ value, onChange, placeholder = "700 000 000", className, countryCode = "+255" }: Props) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-xl border border-input bg-background px-3 h-12 ds-focus-ring focus-within:border-primary",
      className,
    )}>
      <Phone className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground/80">{countryCode}</span>
      <input
        type="tel"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
