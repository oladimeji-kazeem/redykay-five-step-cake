import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CONTACT } from "@/lib/site";

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
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
          Redy<span className="text-primary italic">cakes</span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground font-semibold" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/order" className="btn btn-primary hidden sm:inline-flex !py-2.5">Start your order</Link>
          <button className="lg:hidden rounded-full border px-4 py-2 text-sm" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open && (
        <nav className="container-page flex flex-col gap-3 pb-5 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-base">{n.label}</Link>
          ))}
          <Link to="/order" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Start your order</Link>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 bg-cocoa text-cocoa-foreground">
      <div className="container-page grid gap-10 py-16 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">Redy<span className="italic text-blush">cakes</span></p>
          <p className="mt-3 max-w-xs text-sm opacity-80">Bespoke cakes, ordered the easy way. Clear answers, honest timelines, flavours people rave about.</p>
        </div>
        <div className="text-sm space-y-2 opacity-90">
          <p className="font-semibold">Get in touch</p>
          <p><a href={`mailto:${CONTACT.email}`} className="underline-offset-4 hover:underline">{CONTACT.email}</a></p>
          <p><a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">WhatsApp quick chat</a></p>
          <p className="opacity-80">{CONTACT.serviceArea}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {nav.map((n) => <Link key={n.to} to={n.to} className="opacity-80 hover:opacity-100">{n.label}</Link>)}
          <Link to="/order" className="opacity-80 hover:opacity-100">Order form</Link>
        </div>
      </div>
      <p className="container-page pb-8 text-xs opacity-60">© {new Date().getFullYear()} Redycakes Cake Studio</p>
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

export function CtaBand({ title = "Ready when you are.", text = `Tell us about your celebration — we reply ${CONTACT.replyPromise}.` }: { title?: string; text?: string }) {
  return (
    <section className="container-page mt-24">
      <div className="rounded-3xl bg-accent px-8 py-14 text-center md:px-16">
        <h2 className="text-3xl md:text-5xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-accent-foreground">{text}</p>
        <Link to="/order" className="btn btn-primary mt-8">Start your order</Link>
      </div>
    </section>
  );
}

export function seo(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
