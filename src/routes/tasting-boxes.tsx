import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";

export const Route = createFileRoute("/tasting-boxes")({
  head: () => seo("Wedding Tasting Boxes — RedyKay", "Try six of our signature flavours at home before choosing your wedding cake. A relaxed, low-pressure first step."),
  component: Tasting,
});

const inside = ["Six generous slices of our signature flavours", "Dietary-friendly versions on request", "Flavour notes and pairing ideas", "A no-pressure follow-up chat if you'd like one"];

function Tasting() {
  return (
    <>
      <PageHero eyebrow="Tasting boxes" title="Taste first. Decide together, at home." intro="The easiest first step for wedding couples — no appointment, no sales pitch. Just cake, a sofa and an honest conversation about what you love." />
      <section className="container-page grid items-center gap-12 md:grid-cols-2">
        <img src={images.tasting} alt="Tasting box with six labelled cake slices" loading="lazy" width={1200} height={912} className="w-full rounded-3xl object-cover shadow-soft" />
        <div>
          <h2 className="text-3xl md:text-4xl">What's inside</h2>
          <ul className="mt-6 space-y-3">
            {inside.map((i) => <li key={i} className="flex gap-3"><span className="text-primary">✦</span>{i}</li>)}
          </ul>
          <p className="mt-6 text-muted-foreground">Choose from our flavour list or ask for your own favourites. Delivered or collected, ready to share.</p>
          <Link to="/order" search={{ occasion: "Tasting box" }} className="btn btn-primary mt-8">Request a tasting box</Link>
        </div>
      </section>
    </>
  );
}
