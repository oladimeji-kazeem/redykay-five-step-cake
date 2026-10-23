import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSiteContent } from "@/lib/siteContent";

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
        </div>
        <div className="text-sm space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Get in touch</p>
          <p><a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors underline-offset-4 hover:underline">{contact.email}</a></p>
          <p><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors underline-offset-4 hover:underline">WhatsApp quick chat</a></p>
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

export function seo(title: string, description: string, image = "/redycakes_logo.png") {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: image },
    ],
  };
}
