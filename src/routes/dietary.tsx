import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";

export const Route = createFileRoute("/dietary")({
  head: () => seo("Dietary-Friendly Cakes — RedyKay", "Vegan, gluten-free, dairy-free and egg-free bespoke cakes made with care — never an afterthought."),
  component: Dietary,
});

const menu = [
  { name: "Vegan", how: "Aquafaba and plant butters give a tender, springy crumb. Our ganache uses coconut cream for the same glossy finish — nobody misses a thing." },
  { name: "Gluten-free", how: "A house blend of rice, almond and tapioca flours, rested overnight so the sponge is moist rather than crumbly." },
  { name: "Dairy-free", how: "Cultured plant butter and oat milk keep the buttercream silky and the sponge rich, with all the vanilla depth you'd expect." },
  { name: "Egg-free", how: "Carefully balanced raising agents and fruit purées give structure for tall, stacked tiers — even sculpted designs." },
];

const flavours = ["Dark chocolate & raspberry", "Lemon & elderflower", "Pistachio & rose", "Salted caramel", "Vanilla bean & strawberry", "Coconut & lime"];

function Dietary() {
  return (
    <>
      <PageHero eyebrow="Dietary-friendly menu" title="The cake everyone at the table can enjoy." intro="Dietary needs are a starting point for us, not a compromise. Here's how we get texture and flavour right." />
      <section className="container-page grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <img src={images.vegan} alt="Vegan gluten-free chocolate raspberry cake" loading="lazy" width={912} height={1104} className="aspect-[4/5] w-full rounded-3xl object-cover" />
        <div className="space-y-8">
          {menu.map((m) => (
            <div key={m.name} className="border-b pb-6">
              <h2 className="text-3xl">{m.name}</h2>
              <p className="mt-3 text-muted-foreground">{m.how}</p>
            </div>
          ))}
          <div className="rounded-2xl bg-secondary p-6">
            <h3 className="text-xl">Available in every dietary version</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">{flavours.map((f) => <li key={f}>· {f}</li>)}</ul>
          </div>
          <p className="text-sm text-muted-foreground">
            A note on allergens: we bake in a kitchen that also handles nuts, gluten, dairy and eggs. We take careful steps to avoid cross-contact and will talk you through them honestly — please tell us about any severe allergy when you enquire.
          </p>
        </div>
      </section>
      <CtaBand title="Tell us what you need." />
    </>
  );
}
