import { createFileRoute, Link } from "@tanstack/react-router";
import { CtaBand, seo } from "@/components/SiteLayout";
import { CONTACT, gallery, images } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => seo(
    "RedyKay — Bespoke Cakes, Ordered the Easy Way",
    "Beautiful bespoke cakes with clear answers, honest timelines and flavours people rave about. Weddings, birthdays, corporate and dietary-friendly.",
  ),
  component: Home,
});

const trust = [
  { title: `Replies ${CONTACT.replyPromise.split(",")[0]}`, text: "A real person answers with a clear quote — no chasing, no guessing." },
  { title: "Honest timelines", text: "We tell you upfront if your date works, and exactly what happens when." },
  { title: "Dietary needs, done properly", text: "Vegan, gluten-free, dairy-free and egg-free cakes that taste like the real thing." },
];

const quotes = [
  { q: "Guests were asking for the baker's name before we'd even cut the second tier.", who: "Amara & Tom, wedding" },
  { q: "The first gluten-free cake my daughter has ever gone back to for seconds.", who: "Helen, 8th birthday" },
  { q: "On time, exactly on brand, and the office devoured it by 3pm.", who: "Priya, product launch" },
];

function Home() {
  return (
    <>
      <section className="container-page grid items-center gap-12 pt-12 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-20">
        <div>
          <p className="eyebrow">Bespoke cake studio · UK</p>
          <h1 className="mt-5 text-5xl leading-[1.02] md:text-7xl">
            Beautiful bespoke cakes, <em className="text-primary">ordered the easy way.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Clear answers, honest timelines, and flavours people rave about — so you feel looked after before we've even spoken.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/order" className="btn btn-primary">Start your order</Link>
            <Link to="/how-it-works" className="btn btn-outline">See how it works</Link>
          </div>
        </div>
        <div className="relative">
          <img src={images.hero} alt="Three-tier buttercream wedding cake with pressed flowers" width={1600} height={1104}
            className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-soft md:aspect-[4/4.6]" />
          <div className="absolute -bottom-6 -left-4 rounded-2xl bg-card px-5 py-4 shadow-soft md:-left-10">
            <p className="font-display text-2xl">24h</p>
            <p className="text-xs text-muted-foreground">quote turnaround, Mon–Sat</p>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 grid gap-6 md:grid-cols-3">
        {trust.map((t, i) => (
          <div key={t.title} className="rounded-2xl border bg-card p-7">
            <p className="font-display text-4xl text-primary/40">0{i + 1}</p>
            <h3 className="mt-3 text-xl">{t.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <div className="container-page flex items-end justify-between gap-4">
          <h2 className="text-3xl md:text-5xl">Recent bakes</h2>
          <Link to="/cakes" className="text-sm font-semibold text-primary">View the gallery →</Link>
        </div>
        <div className="container-page mt-8 flex gap-5 overflow-x-auto pb-4">
          {gallery.map((g) => (
            <figure key={g.title} className="w-64 shrink-0 md:w-72">
              <img src={g.src} alt={g.title} loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-2xl object-cover" />
              <figcaption className="mt-3 text-sm"><span className="font-semibold">{g.title}</span> · <span className="text-muted-foreground">{g.occasion}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-24 bg-cocoa py-20 text-cocoa-foreground">
        <div className="container-page">
          <p className="eyebrow !text-blush">The taste test</p>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {quotes.map((q) => (
              <blockquote key={q.who}>
                <p className="font-display text-2xl leading-snug">“{q.q}”</p>
                <footer className="mt-4 text-sm opacity-70">— {q.who}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
