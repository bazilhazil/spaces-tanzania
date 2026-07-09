import { Logo } from "@/components/logo";

export function AuthLoadingScreen({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center gap-3">
        <Logo className="h-10 w-10 animate-pulse" />
        <span className="font-display text-2xl font-semibold text-primary">SPACES</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        <span className="ml-2">{label}</span>
      </div>
    </div>
  );
}
