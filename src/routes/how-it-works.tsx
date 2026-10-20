import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { CONTACT } from "@/lib/site";

export const Route = createFileRoute("/how-it-works")({
  head: () => seo("How Ordering Works — Redycakes", "Five clear steps from enquiry to delivery, with an honest promise on how quickly we reply."),
  component: How,
});

const steps = [
  { t: "Enquire", d: "Fill in our short order form — occasion, date, budget, flavours and any inspiration photos. Takes about five minutes." },
  { t: "Your quote", d: `We reply ${CONTACT.replyPromise}, with a clear price, what's included, and whether your date is available.` },
  { t: "Design confirmation", d: "We send a sketch or written design for you to approve. Tweaks are welcome — nothing is baked until you're happy." },
  { t: "We bake", d: "Your cake is baked fresh in the days before your event, then decorated by hand." },
  { t: "Delivery or pickup", d: "Collect from our studio or we deliver and set up. You'll get a reminder with your time slot beforehand." },
];

function How() {
  return (
    <>
      <PageHero eyebrow="How it works" title="No guesswork. Just five clear steps." intro="You'll always know what happens next and when." />
      <section className="container-page">
        <ol className="relative space-y-6 border-l-2 border-primary/30 pl-8 md:pl-12">
          {steps.map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border bg-card p-7">
              <span className="absolute -left-[3.05rem] top-7 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground md:-left-[4.05rem]">{i + 1}</span>
              <h2 className="text-2xl">{s.t}</h2>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-2xl bg-secondary p-8">
          <p className="eyebrow">Our response-time promise</p>
          <p className="mt-3 font-display text-2xl">Every enquiry gets a real reply {CONTACT.replyPromise}. If we can't make your date, we'll tell you straight away.</p>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
