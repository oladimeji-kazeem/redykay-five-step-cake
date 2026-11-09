import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import appCss from "../styles.css?url";
import { Header, Footer } from "@/components/SiteLayout";
import { LiveChatWidget } from "@/components/LiveChatWidget";
import { AnalyticsTracker } from "@/lib/analytics";
import { Toaster } from "@/components/ui/sonner";
import { applyThemeToDom, getLocalTheme, fetchActiveTheme } from "@/lib/themeService";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Application error boundary caught:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Something went wrong on our end. You can try refreshing or head back home."}
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
  head: () => {
    const siteUrl = "https://www.redycakes.org";
    const title = "Redycakes — Bespoke Celebration & Wedding Cakes";
    const description = "Artisanal celebration, wedding and dietary-friendly cakes handcrafted in the UK. Order online with our 5-step custom cake builder, tasting boxes & instant quotes.";
    const ogImageUrl = `${siteUrl}/og-image.jpg`;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: description },

        // Open Graph / WhatsApp / Facebook / LinkedIn / iMessage
        { property: "og:site_name", content: "Redycakes" },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${siteUrl}/` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:locale", content: "en_GB" },
        { property: "og:image", content: ogImageUrl },
        { property: "og:image:secure_url", content: ogImageUrl },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "675" },
        { property: "og:image:alt", content: "Redycakes luxury bespoke celebration and wedding cakes studio" },

        // Twitter / X
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@redycakes" },
        { name: "twitter:creator", content: "@redycakes" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImageUrl },
        { name: "twitter:image:alt", content: "Redycakes bespoke celebration cakes" },
      ],
      links: [
        { rel: "canonical", href: `${siteUrl}/` },
        { rel: "image_src", href: ogImageUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Figtree:wght@400;500;600&display=swap" },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
        { rel: "icon", href: "/redycakes_logo.png", type: "image/png" },
        { rel: "apple-touch-icon", href: "/og-square.jpg" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": "https://www.redycakes.org/#bakery",
    name: "Redycakes",
    alternateName: "Redy Cakes Studio",
    url: "https://www.redycakes.org",
    logo: "https://www.redycakes.org/redycakes_logo.png",
    image: "https://www.redycakes.org/og-image.jpg",
    description: "Artisanal celebration, wedding and dietary-friendly cakes handcrafted in the UK. Order online with our 5-step custom cake builder, tasting boxes & instant quotes.",
    telephone: "+447000000000",
    email: "hello@redycakes.org",
    priceRange: "£££",
    address: {
      "@type": "PostalAddress",
      addressLocality: "London & Home Counties",
      addressCountry: "GB",
    },
    sameAs: [
      "https://www.instagram.com/redycakes",
      "https://www.tiktok.com/@redycakes",
      "https://www.facebook.com/redycakes",
      "https://www.pinterest.com/redycakes",
    ],
  };

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isCms = pathname.startsWith("/cms");

  useEffect(() => {
    // 1. Apply local theme immediately
    const local = getLocalTheme();
    applyThemeToDom(local);

    // 2. Fetch remote theme if configured
    fetchActiveTheme().catch(console.debug);

    // 3. Listen to local broadcast and window events
    const handleThemeEvent = (e: any) => {
      if (e?.detail?.theme) {
        applyThemeToDom(e.detail.theme);
      }
    };
    window.addEventListener("redycakes_theme_event", handleThemeEvent);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("redycakes_theme_broadcast");
        channel.onmessage = (event) => {
          if (event.data?.theme) {
            applyThemeToDom(event.data.theme);
          }
        };
      }
    } catch {
      // Ignore
    }

    return () => {
      window.removeEventListener("redycakes_theme_event", handleThemeEvent);
      if (channel) channel.close();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsTracker />
      <Toaster position="top-right" richColors closeButton />
      {!isCms && <Header />}
      <main>
        <Outlet />
      </main>
      {!isCms && <Footer />}
      {!isCms && <LiveChatWidget />}
    </QueryClientProvider>
  );
}
