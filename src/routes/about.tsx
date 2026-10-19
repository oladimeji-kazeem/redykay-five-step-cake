import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => seo("Our Story — RedyKay", "A small bespoke cake studio built on one idea: ordering a cake should feel as good as eating it."),
  component: About,
});

function About() {
  return (
    <>
      <PageHero eyebrow="Our story" title="Made by hand. Run with care." />
      <section className="container-page grid gap-12 md:grid-cols-2">
        <div className="space-y-5 text-lg text-muted-foreground">
          <p>RedyKay started in a home kitchen, baking for friends who kept saying the same thing: “I wish ordering a cake was this easy everywhere.”</p>
          <p>So that became the point. Beautiful cakes, yes — but also quick replies, clear prices, and real care for people whose dietary needs usually get a sigh instead of a solution.</p>
          <p>Today we're still small on purpose. Every cake is designed with you, baked fresh, and finished by hand.</p>
        </div>
        <img src={images.buttercream} alt="Peach buttercream rosette cake" loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-3xl object-cover" />
      </section>
      <CtaBand title="We'd love to bake for you." />
    </>
  );
}
