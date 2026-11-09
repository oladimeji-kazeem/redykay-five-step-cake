import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSiteContent } from "@/lib/siteContent";
import { trackEvent } from "@/lib/analytics";

const nav = [
  { to: "/cakes", label: "Cakes" },
  { to: "/dietary", label: "Dietary-Friendly" },
  { to: "/tasting-boxes", label: "Tasting Boxes" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "Our Story" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight transition hover:opacity-90" aria-label="Redycakes Home">
          <img src="/redycakes_logo.png" alt="Redycakes" className="h-8 sm:h-9 w-auto object-contain" />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              activeProps={{ className: "text-sm text-primary font-semibold" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/order" className="btn btn-primary hidden sm:inline-flex !py-2.5">Start your order</Link>
          <button className="lg:hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary transition-colors" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open && (
        <nav className="container-page flex flex-col gap-3 pb-5 lg:hidden animate-in fade-in slide-in-from-top-2">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-base font-medium hover:text-primary transition-colors"
              activeProps={{ className: "text-primary font-semibold" }}>
              {n.label}
            </Link>
          ))}
          <Link to="/order" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Start your order</Link>
        </nav>
      )}
    </header>
  );
}

export function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function TikTokIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.8 4.49 6.27 6.27 0 0 0 1.88-4.49V8.58a8.28 8.28 0 0 0 4.84 1.56V6.69h-.07z" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function PinterestIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.07-.98-.13-2.49.03-3.56.14-.97.94-6.44.94-6.44s-.24-.48-.24-1.2c0-1.12.65-1.96 1.46-1.96.69 0 1.02.52 1.02 1.14 0 .7-.44 1.74-.67 2.7-.19.82.41 1.48 1.21 1.48 1.45 0 2.57-1.53 2.57-3.74 0-1.96-1.4-3.32-3.42-3.32-2.33 0-3.7 1.75-3.7 3.56 0 .7.27 1.46.61 1.87.07.08.08.15.06.23-.06.26-.2.83-.23.94-.04.15-.12.18-.28.11-1.04-.49-1.69-2.01-1.69-3.24 0-2.63 1.91-5.05 5.51-5.05 2.89 0 5.14 2.06 5.14 4.82 0 2.88-1.81 5.19-4.33 5.19-.85 0-1.64-.44-1.91-.96l-.52 1.98c-.19.73-.7 1.64-1.04 2.19A12 12 0 1 0 12 0z" />
    </svg>
  );
}

export function Footer() {
  const { content } = useSiteContent();
  const contact = content.contact;

  return (
    <footer className="mt-24 border-t border-border/80 bg-card/75 text-foreground backdrop-blur-sm">
      <div className="container-page grid gap-10 py-16 md:grid-cols-3">
        <div>
          <Link to="/" className="inline-block transition hover:opacity-90" aria-label="Redycakes Home">
            <img src="/redycakes_logo.png" alt="Redycakes" className="h-9 w-auto object-contain" />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
            Bespoke cakes, ordered the easy way. Clear answers, honest timelines, flavours people rave about.
          </p>
          {/* Social Media Links */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Follow our bakes</p>
            <div className="flex items-center gap-2">
              {contact.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="p-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground transition-all"
                  title="Follow us on Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {contact.tiktok && (
                <a
                  href={contact.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="p-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground transition-all"
                  title="Follow us on TikTok"
                >
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
              {contact.facebook && (
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="p-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground transition-all"
                  title="Follow us on Facebook"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
              {contact.pinterest && (
                <a
                  href={contact.pinterest}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Pinterest"
                  className="p-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground transition-all"
                  title="Inspiration on Pinterest"
                >
                  <PinterestIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="text-sm space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Get in touch</p>
          <p><a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors underline-offset-4 hover:underline">{contact.email}</a></p>
          <p><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" onClick={() => trackEvent("whatsapp_clicked", { source: "footer" })} className="hover:text-primary transition-colors underline-offset-4 hover:underline">WhatsApp quick chat</a></p>
          <p className="text-muted-foreground/80">{contact.serviceArea}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-primary transition-colors">
              {n.label}
            </Link>
          ))}
          <Link to="/order" className="font-semibold text-primary hover:underline underline-offset-4">
            Order form →
          </Link>
          <Link to="/#reviews" className="font-semibold text-foreground hover:text-primary transition-colors">
            Reviews & Stories ★ →
          </Link>
          <Link to="/cms" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors col-span-2 pt-2 flex items-center gap-1">
            <span>🔒 Staff CMS Portal</span>
          </Link>
        </div>
      </div>
      <div className="container-page border-t border-border/60 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} Redycakes Cake Studio. All rights reserved.</p>
        <p>Handcrafted celebration cakes · London & Home Counties</p>
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="container-page pt-16 pb-10 md:pt-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] md:text-6xl">{title}</h1>
      {intro && <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{intro}</p>}
    </section>
  );
}

export function CtaBand({ title, text }: { title?: string; text?: string }) {
  const { content } = useSiteContent();
  const cta = content.cta;
  const displayTitle = title || cta.title || "Ready when you are.";
  const displayText = text || cta.text || `Tell us about your celebration — we reply ${content.contact.replyPromise}.`;

  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-secondary/80 via-accent/50 to-blush/25 px-8 py-14 text-center shadow-soft md:px-16">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-blush/25 blur-3xl" />
        <h2 className="relative text-3xl font-semibold md:text-5xl">{displayTitle}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-foreground/85">{displayText}</p>
        <Link to="/order" className="btn btn-primary relative mt-8">{cta.buttonText || "Start your order"}</Link>
      </div>
    </section>
  );
}

export const SITE_URL = "https://www.redycakes.org";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export interface SeoOptions {
  type?: "website" | "article" | "product";
  noIndex?: boolean;
}

export function seo(
  title: string,
  description: string,
  image = DEFAULT_OG_IMAGE,
  path = "/",
  options: SeoOptions = {}
) {
  const fullUrl = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const fullImageUrl = image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`;
  const pageType = options.type || "website";

  const metaList: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },

    // Open Graph / WhatsApp / Facebook / LinkedIn / iMessage
    { property: "og:site_name", content: "Redycakes" },
    { property: "og:type", content: pageType },
    { property: "og:url", content: fullUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:locale", content: "en_GB" },
    { property: "og:image", content: fullImageUrl },
    { property: "og:image:secure_url", content: fullImageUrl },
    { property: "og:image:type", content: fullImageUrl.endsWith(".png") ? "image/png" : "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "675" },
    { property: "og:image:alt", content: title },

    // Twitter / X
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@redycakes" },
    { name: "twitter:creator", content: "@redycakes" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: fullImageUrl },
    { name: "twitter:image:alt", content: title },
  ];

  if (options.noIndex) {
    metaList.push({ name: "robots", content: "noindex, nofollow" });
  }

  return {
    meta: metaList,
    links: [
      { rel: "canonical", href: fullUrl },
      { rel: "image_src", href: fullImageUrl },
    ],
  };
}

