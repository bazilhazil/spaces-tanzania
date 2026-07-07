import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { useI18n } from "@/hooks/use-i18n";
import { Sparkles } from "lucide-react";

export function AuthGateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();

  async function google() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border/60 p-0">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-display text-2xl text-primary-foreground">
              Create your free account
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85">
              Upload your property and reach thousands of buyers across Tanzania.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 p-6">
          <Button onClick={google} variant="outline" className="h-11 w-full gap-2 rounded-xl">
            <GoogleIcon /> Continue with Google
          </Button>
          <Link to="/register" onClick={() => onOpenChange(false)}>
            <Button className="h-11 w-full rounded-xl">Register with Email</Button>
          </Link>
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" onClick={() => onOpenChange(false)} className="font-medium text-primary hover:underline">
              Login
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
