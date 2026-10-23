import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/about")({
  head: () => seo("Our Story — Redycakes", "A small bespoke cake studio built on one idea: ordering a cake should feel as good as eating it."),
  component: About,
});

function About() {
  const { content } = useSiteContent();
  const about = content.about;

  return (
    <>
      <PageHero eyebrow="Our story" title={about.title} />
      <section className="container-page grid gap-12 md:grid-cols-2">
        <div className="space-y-5 text-lg text-muted-foreground">
          {about.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
        <img
          src={about.image}
          alt="Peach buttercream rosette cake"
          loading="lazy"
          width={912}
          height={1104}
          className="aspect-[4/5] w-full rounded-3xl object-cover shadow-soft"
        />
      </section>
      <CtaBand title="We'd love to bake for you." />
    </>
  );
}
