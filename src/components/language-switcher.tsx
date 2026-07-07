import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Lang } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "sw", flag: "🇹🇿", label: "Kiswahili" },
];

interface Props {
  variant?: "full" | "icon";
  className?: string;
}

export function LanguageSwitcher({ variant = "full", className }: Props) {
  const { lang, setLang } = useI18n();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change language"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/30 hover:text-primary",
            variant === "icon" && "px-2",
            className,
          )}
        >
          {variant === "full" ? (
            <>
              <span className="text-base leading-none">{current.flag}</span>
              <span className="hidden sm:inline">{current.label}</span>
              <span className="text-muted-foreground">▼</span>
            </>
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.label}</span>
            </span>
            {lang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
