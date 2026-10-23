import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/how-it-works")({
  head: () => seo("How Ordering Works — Redycakes", "Five clear steps from enquiry to delivery, with an honest promise on how quickly we reply."),
  component: How,
});

function How() {
  const { content } = useSiteContent();

  return (
    <>
      <PageHero eyebrow={content.howItWorks.eyebrow} title={content.howItWorks.title} intro={content.howItWorks.intro} />
      <section className="container-page">
        <ol className="relative space-y-6 border-l-2 border-primary/30 pl-8 md:pl-12">
          {content.howItWorks.steps.map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border border-border/80 bg-card p-7 shadow-sm transition-all duration-300 hover:shadow-soft hover:border-primary/40">
              <span className="absolute -left-[3.05rem] top-7 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8B5CF6] text-sm font-semibold text-primary-foreground shadow-sm md:-left-[4.05rem]">{i + 1}</span>
              <h2 className="text-2xl font-semibold">{s.t}</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-secondary/90 via-accent/40 to-background p-8 shadow-soft">
          <p className="eyebrow">Our response-time promise</p>
          <p className="mt-3 font-display text-2xl font-semibold">{content.howItWorks.promiseNotice}</p>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
