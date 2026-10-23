import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/cakes")({
  head: () => seo("Cake Gallery — Redycakes", "Browse wedding, birthday, corporate and celebration cakes — each with the brief and how we solved it."),
  component: Cakes,
});

function Cakes() {
  const { content } = useSiteContent();
  const [occ, setOcc] = useState<string>("All");
  const [sty, setSty] = useState<string>("All");

  const occasions = useMemo(() => ["All", ...Array.from(new Set(content.gallery.map((g) => g.occasion)))], [content.gallery]);
  const styles = useMemo(() => ["All", ...Array.from(new Set(content.gallery.map((g) => g.style)))], [content.gallery]);

  const items = content.gallery.filter((g) => (occ === "All" || g.occasion === occ) && (sty === "All" || g.style === sty));

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
          <article key={g.title} className="group">
            <img src={g.src} alt={g.title} loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-sm transition-all duration-300 group-hover:shadow-soft group-hover:-translate-y-1" />
            <div className="mt-4 flex gap-2 text-xs"><span className="chip !py-0.5 !px-2.5 !text-xs font-medium">{g.occasion}</span><span className="chip !py-0.5 !px-2.5 !text-xs font-medium">{g.style}</span></div>
            <h3 className="mt-3 text-xl font-semibold">{g.title}</h3>
            <p className="mt-2 text-sm leading-relaxed"><span className="font-semibold text-foreground">The brief:</span> <span className="text-muted-foreground">{g.brief}</span></p>
            <p className="mt-1 text-sm leading-relaxed"><span className="font-semibold text-foreground">Our solution:</span> <span className="text-muted-foreground">{g.solution}</span></p>
          </article>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">No cakes match that combination yet — but we'd love to make the first one.</p>}
      </section>
      <CtaBand title="Have a picture in your head?" />
    </>
  );
}
