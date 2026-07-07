import { useI18n, type Lang } from "@/hooks/use-i18n";
import { Logo } from "@/components/logo";

export function LanguageWelcome() {
  const { chosen, setLang } = useI18n();
  if (chosen) return null;

  function choose(l: Lang) {
    setLang(l);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-primary/95 via-primary/90 to-primary-glow/80 px-4 backdrop-blur-md">
      <div className="animate-fade-in w-full max-w-md rounded-3xl border border-white/15 bg-background p-8 text-center shadow-[var(--shadow-elevated)] md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <Logo className="h-16 w-16 object-contain" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-primary">Karibu SPACES</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chagua lugha unayotaka kutumia.</p>

        <div className="mt-7 grid gap-3">
          <button
            onClick={() => choose("sw")}
            className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl leading-none">🇹🇿</span>
              <span>
                <span className="block font-display text-base font-semibold text-foreground">Kiswahili</span>
                <span className="block text-xs text-muted-foreground">Endelea kwa Kiswahili</span>
              </span>
            </span>
            <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </button>
          <button
            onClick={() => choose("en")}
            className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl leading-none">🇬🇧</span>
              <span>
                <span className="block font-display text-base font-semibold text-foreground">English</span>
                <span className="block text-xs text-muted-foreground">Continue in English</span>
              </span>
            </span>
            <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Unaweza kubadilisha lugha wakati wowote kwenye Settings.
        </p>
      </div>
    </div>
  );
}
