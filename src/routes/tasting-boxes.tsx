import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/tasting-boxes")({
  head: () => seo("Wedding Tasting Boxes — Redycakes", "Try six of our signature flavours at home before choosing your wedding cake. A relaxed, low-pressure first step."),
  component: Tasting,
});

function Tasting() {
  const { content } = useSiteContent();

  return (
    <>
      <PageHero eyebrow={content.tasting.eyebrow} title={content.tasting.title} intro={content.tasting.intro} />
      <section className="container-page grid items-center gap-12 md:grid-cols-2">
        <img src={images.tasting} alt="Tasting box with six labelled cake slices" loading="lazy" width={1200} height={912} className="w-full rounded-3xl object-cover shadow-soft" />
        <div>
          <h2 className="text-3xl font-semibold md:text-4xl">What's inside</h2>
          <ul className="mt-6 space-y-3">
            {content.tasting.inside.map((i) => <li key={i} className="flex gap-3"><span className="text-primary font-bold">✦</span>{i}</li>)}
          </ul>
          <p className="mt-6 text-muted-foreground leading-relaxed">{content.tasting.note}</p>
          <Link to="/order" search={{ occasion: "Tasting box" }} className="btn btn-primary mt-8">Request a tasting box</Link>
        </div>
      </section>
    </>
  );
}
