import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { CONTACT } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () => seo("FAQ — Redycakes", "Lead times, deposits, changes, delivery and allergens — answered warmly and upfront."),
  component: Faq,
});

const faqs = [
  { q: "How far ahead should I order?", a: "For celebration cakes, two to three weeks is comfortable. Weddings are usually booked a few months ahead. Short notice? Ask anyway — we'll tell you honestly whether we can help." },
  { q: "Do you take a deposit?", a: "Yes, a deposit secures your date in our diary. We'll explain the amount and when the balance is due in your quote, so there are no surprises." },
  { q: "What if I need to change something?", a: "Plans change — that's normal. Let us know as early as you can and we'll do our best to adjust the design, size or date." },
  { q: "Do you deliver?", a: `We deliver and set up across ${CONTACT.serviceArea.split(" (")[0]}, or you're welcome to collect from our studio. Delivery cost is included in your quote.` },
  { q: "How do you handle allergens?", a: "We bake in a kitchen that handles nuts, gluten, dairy and eggs. We take careful steps to prevent cross-contact and will always be upfront about what that means for severe allergies." },
  { q: "How quickly will you reply?", a: `Every enquiry gets a real reply ${CONTACT.replyPromise}.` },
];

function Faq() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Helpful answers, upfront." intro="Anything else? Just ask — there are no silly questions about cake." />
      <section className="container-page max-w-3xl divide-y border-y">
        {faqs.map((f) => (
          <details key={f.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">
              {f.q}<span className="text-primary transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </section>
      <CtaBand />
    </>
  );
}
