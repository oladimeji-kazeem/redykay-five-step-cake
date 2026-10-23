import { createFileRoute, Link } from "@tanstack/react-router";
import { CtaBand, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/")({
  head: () => seo(
    "Redycakes — Bespoke Cakes, Ordered the Easy Way",
    "Beautiful bespoke cakes with clear answers, honest timelines and flavours people rave about. Weddings, birthdays, corporate and dietary-friendly.",
  ),
  component: Home,
});

function Home() {
  const { content } = useSiteContent();

  return (
    <>
      <section className="container-page grid items-center gap-12 pt-12 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-20">
        <div>
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1 className="mt-5 text-5xl leading-[1.02] md:text-7xl font-semibold">
            {content.hero.titleLead} <em className="text-primary not-italic font-semibold">{content.hero.titleHighlight}</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed">
            {content.hero.intro}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/order" className="btn btn-primary">Start your order</Link>
            <Link to="/how-it-works" className="btn btn-outline">See how it works</Link>
          </div>
        </div>
        <div className="relative">
          <img src={images.hero} alt="Three-tier buttercream wedding cake with pressed flowers" width={1600} height={1104}
            className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-soft md:aspect-[4/4.6]" />
          <div className="absolute -bottom-6 -left-4 rounded-2xl border border-border/80 bg-card/95 px-6 py-4 shadow-soft backdrop-blur-md md:-left-10">
            <p className="font-display text-2xl font-bold text-primary">{content.hero.badgeValue}</p>
            <p className="text-xs font-medium text-muted-foreground">{content.hero.badgeText}</p>
          </div>
        </div>
      </section>

      <section className="container-page mt-12 grid gap-6 md:grid-cols-3">
        {content.trust.map((t, i) => (
          <div key={t.title} className="group relative rounded-2xl border border-border/80 bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft">
            <p className="font-display text-4xl font-semibold text-primary/50 transition duration-300 group-hover:text-primary">0{i + 1}</p>
            <h3 className="mt-3 text-xl font-semibold">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <div className="container-page flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold md:text-5xl">Recent bakes</h2>
          <Link to="/cakes" className="text-sm font-semibold text-primary hover:underline underline-offset-4">View the gallery →</Link>
        </div>
        <div className="container-page mt-8 flex gap-5 overflow-x-auto pb-4">
          {content.gallery.map((g) => (
            <figure key={g.title} className="w-64 shrink-0 md:w-72">
              <img src={g.src} alt={g.title} loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-sm transition-all duration-300 hover:shadow-soft hover:-translate-y-1" />
              <figcaption className="mt-3 text-sm"><span className="font-semibold text-foreground">{g.title}</span> · <span className="text-muted-foreground">{g.occasion}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-24 border-y border-border/70 bg-gradient-to-b from-secondary/40 via-accent/30 to-background py-20">
        <div className="container-page">
          <div className="text-center">
            <p className="eyebrow">The taste test</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Words from happy celebrations</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {content.quotes.map((q) => (
              <blockquote key={q.who} className="relative rounded-2xl border border-border/80 bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <span className="font-display text-5xl leading-none text-primary/20 select-none absolute top-4 right-5">“</span>
                <p className="font-display text-xl leading-relaxed text-foreground relative z-10">“{q.q}”</p>
                <footer className="mt-5 text-sm font-semibold text-primary">— {q.who}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
