import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/dietary")({
  head: () => seo("Dietary-Friendly Cakes — Redycakes", "Vegan, gluten-free, dairy-free and egg-free bespoke cakes made with care — never an afterthought."),
  component: Dietary,
});

function Dietary() {
  const { content } = useSiteContent();

  return (
    <>
      <PageHero eyebrow="Dietary-friendly menu" title="The cake everyone at the table can enjoy." intro="Dietary needs are a starting point for us, not a compromise. Here's how we get texture and flavour right." />
      <section className="container-page grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <img src={images.vegan} alt="Vegan gluten-free chocolate raspberry cake" loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-soft" />
        <div className="space-y-8">
          {content.dietary.categories.map((m) => (
            <div key={m.name} className="border-b border-border/80 pb-6">
              <h2 className="text-3xl font-semibold">{m.name}</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">{m.how}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-secondary/80 to-accent/40 p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Available in every dietary version</h3>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {content.dietary.flavours.map((f) => (
                <li key={f} className="flex items-center gap-2"><span className="text-primary font-bold">✦</span>{f}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            {content.dietary.allergenNotice}
          </p>
        </div>
      </section>
      <CtaBand title="Tell us what you need." />
    </>
  );
}
