import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchInput({ value, onChange, placeholder = "Search…", className }: Props) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-full border border-input bg-background px-4 h-11 ds-focus-ring focus-within:border-primary",
      className,
    )}>
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
