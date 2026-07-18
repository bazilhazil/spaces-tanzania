import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { useI18n } from "@/hooks/use-i18n";
import { Sparkles, Mail, Phone } from "lucide-react";

export function AuthGateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();

  async function google() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-white/10 bg-[#05070d] p-0 text-white">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-sky-500/70 p-6 text-primary-foreground">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="relative">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-2xl text-primary-foreground">
                {t("auth.gate.title")}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/85">
                {t("auth.gate.sub")}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>
        <div className="space-y-3 p-6">
          <Button
            onClick={google}
            variant="outline"
            className="h-11 w-full gap-2 rounded-xl border-white/15 bg-white text-slate-900 hover:bg-white/90 hover:text-slate-900"
          >
            <GoogleIcon /> Continue with Google
          </Button>
          <Link to="/auth" search={{ mode: "signin" }} onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="h-11 w-full gap-2 rounded-xl border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
              <Mail className="h-4 w-4" /> Continue with email
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signin" }} onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="h-11 w-full gap-2 rounded-xl border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
              <Phone className="h-4 w-4" /> Continue with phone
            </Button>
          </Link>
          <p className="pt-2 text-center text-sm text-white/60">
            New to SPACES?{" "}
            <Link to="/auth" search={{ mode: "signup" }} onClick={() => onOpenChange(false)} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.06 2.6-2.25 3.4v2.8h3.63c2.13-1.96 3.36-4.86 3.36-8.44Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.63-2.8c-1 .68-2.28 1.08-4.31 1.08-3.32 0-6.13-2.24-7.13-5.26H1.16v2.87A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M4.87 14.12A7.19 7.19 0 0 1 4.5 12c0-.74.13-1.45.36-2.12V7.01H1.16A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.16 5.39l3.71-3.27Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.22-3.22C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.16 6.61l3.71 2.87C5.87 6.99 8.68 4.75 12 4.75Z" />
    </svg>
  );
}
