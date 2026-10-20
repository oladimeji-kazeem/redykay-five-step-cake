import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { gallery, type Occasion, type Style } from "@/lib/site";

export const Route = createFileRoute("/cakes")({
  head: () => seo("Cake Gallery — Redycakes", "Browse wedding, birthday, corporate and celebration cakes — each with the brief and how we solved it."),
  component: Cakes,
});

const occasions: (Occasion | "All")[] = ["All", "Wedding", "Birthday", "Corporate", "Celebration"];
const styles: (Style | "All")[] = ["All", "Sculpted", "Buttercream", "Fondant", "Dietary-Friendly"];

function Cakes() {
  const [occ, setOcc] = useState<Occasion | "All">("All");
  const [sty, setSty] = useState<Style | "All">("All");
  const items = gallery.filter((g) => (occ === "All" || g.occasion === occ) && (sty === "All" || g.style === sty));
  return (
    <>
      <PageHero eyebrow="Gallery" title="Every cake starts with a story." intro="Filter by occasion or style. Each caption shares the brief we were given and how we brought it to life." />
      <section className="container-page space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-muted-foreground w-20">Occasion</span>
          {occasions.map((o) => <button key={o} className="chip" data-active={occ === o} onClick={() => setOcc(o)}>{o}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-muted-foreground w-20">Style</span>
          {styles.map((s) => <button key={s} className="chip" data-active={sty === s} onClick={() => setSty(s)}>{s}</button>)}
        </div>
      </section>
      <section className="container-page mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <article key={g.title}>
            <img src={g.src} alt={g.title} loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-2xl object-cover" />
            <div className="mt-4 flex gap-2 text-xs"><span className="chip !py-1">{g.occasion}</span><span className="chip !py-1">{g.style}</span></div>
            <h3 className="mt-3 text-xl">{g.title}</h3>
            <p className="mt-2 text-sm"><span className="font-semibold">The brief:</span> <span className="text-muted-foreground">{g.brief}</span></p>
            <p className="mt-1 text-sm"><span className="font-semibold">Our solution:</span> <span className="text-muted-foreground">{g.solution}</span></p>
          </article>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">No cakes match that combination yet — but we'd love to make the first one.</p>}
      </section>
      <CtaBand title="Have a picture in your head?" />
    </>
  );
}
