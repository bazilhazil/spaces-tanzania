import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import brandAsset from "@/assets/spaces-logo-brand.png.asset.json";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { ModeProvider } from "@/hooks/use-mode";
import { I18nProvider } from "@/hooks/use-i18n";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { LanguageWelcome } from "@/components/language-welcome";
import { CompareTray } from "@/components/favorites/compare-tray";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return <NotFoundView />;
}

function NotFoundView() {
  // Not using useI18n here — root can render outside providers during boundaries.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-primary">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The space you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SPACES — Discover Your Next Space" },
      {
        name: "description",
        content:
          "Discover verified homes, apartments, offices, and commercial spaces across Tanzania. SPACES helps you find, list, and manage properties with confidence.",
      },
      { name: "author", content: "SPACES Group Ltd" },
      { name: "theme-color", content: "#0F4C81" },
      { property: "og:title", content: "SPACES — Discover Your Next Space" },
      {
        property: "og:description",
        content:
          "Discover verified homes, apartments, offices, and commercial spaces across Tanzania. SPACES helps you find, list, and manage properties with confidence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SPACES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SPACES — Discover Your Next Space" },
      {
        name: "twitter:description",
        content:
          "Discover verified homes, apartments, offices, and commercial spaces across Tanzania. SPACES helps you find, list, and manage properties with confidence.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3rnUSvcYHVdmouULFBFBxI17P882/social-images/social-1783630803247-Spaces_Logo.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3rnUSvcYHVdmouULFBFBxI17P882/social-images/social-1783630803247-Spaces_Logo.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: brandAsset.url, type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ModeProvider>
            <FavoritesProvider>
              <Outlet />
              <LanguageWelcome />
              <CompareTray />
              {/* Bottom placement keeps confirmations clear of the public navigation. */}
              <Toaster
                richColors
                position="bottom-right"
                duration={2000}
                visibleToasts={3}
                toastOptions={{ className: "pointer-events-auto" }}
              />

            </FavoritesProvider>
          </ModeProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
