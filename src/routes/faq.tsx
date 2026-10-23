import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/faq")({
  head: () => seo("FAQ — Redycakes", "Lead times, deposits, changes, delivery and allergens — answered warmly and upfront."),
  component: Faq,
});

function Faq() {
  const { content } = useSiteContent();
  const faqs = content.faq;

  return (
    <>
      <PageHero eyebrow="FAQ" title="Helpful answers, upfront." intro="Anything else? Just ask — there are no silly questions about cake." />
      <section className="container-page max-w-3xl divide-y divide-border/80 border-y border-border/80">
        {faqs.map((f) => (
          <details key={f.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl transition-colors hover:text-primary">
              <span className="font-medium">{f.q}</span>
              <span className="text-2xl font-semibold text-primary transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </section>
      <CtaBand />
    </>
  );
}
