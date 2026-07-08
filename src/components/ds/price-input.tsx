import { cn } from "@/lib/utils";

type Props = {
  value?: number;
  onChange: (v: number | undefined) => void;
  currency?: string;
  onCurrencyChange?: (c: string) => void;
  currencies?: string[];
  placeholder?: string;
  className?: string;
};

export function PriceInput({
  value, onChange, currency = "TZS", onCurrencyChange, currencies = ["TZS", "USD"], placeholder = "0", className,
}: Props) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 ds-focus-ring focus-within:border-primary",
      className,
    )}>
      {onCurrencyChange ? (
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="rounded-lg bg-muted px-2 py-1 text-sm font-semibold text-foreground/80 outline-none"
        >
          {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <span className="rounded-lg bg-muted px-2 py-1 text-sm font-semibold text-foreground/80">{currency}</span>
      )}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}
