import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PageHero, seo } from "@/components/SiteLayout";
import { images } from "@/lib/site";
import { useSiteContent } from "@/lib/siteContent";
import { usePaymentSettings, formatMoney } from "@/lib/paymentSettings";

export const Route = createFileRoute("/tasting-boxes")({
  head: () => seo("Wedding Tasting Boxes — Redycakes", "Try six of our signature flavours at home before choosing your wedding cake. A relaxed, low-pressure first step."),
  component: Tasting,
});

function Tasting() {
  const { content } = useSiteContent();
  const { settings: paymentSettings } = usePaymentSettings();

  const priceFormatted = formatMoney(
    paymentSettings.depositRules.tastingBoxPrice || 25,
    paymentSettings.currency
  );

  return (
    <>
      <PageHero eyebrow={content.tasting.eyebrow} title={content.tasting.title} intro={content.tasting.intro} />
      <section className="container-page grid items-center gap-12 md:grid-cols-2">
        <img src={images.tasting} alt="Tasting box with six labelled cake slices" loading="lazy" width={1200} height={912} className="w-full rounded-3xl object-cover shadow-soft" />
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold md:text-4xl">What's inside</h2>
            <span className="px-3 py-1 rounded-full bg-primary/15 text-primary font-bold text-sm">
              {priceFormatted} box
            </span>
          </div>
          <ul className="mt-6 space-y-3">
            {content.tasting.inside.map((i) => <li key={i} className="flex gap-3"><span className="text-primary font-bold">✦</span>{i}</li>)}
          </ul>
          <p className="mt-6 text-muted-foreground leading-relaxed">{content.tasting.note}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/order" search={{ occasion: "Tasting box" }} className="btn btn-primary">
              Order a tasting box ({priceFormatted})
            </Link>
            <Link
              to="/pay"
              search={{ type: "tasting-box", amount: String(paymentSettings.depositRules.tastingBoxPrice || 25) }}
              className="btn btn-outline flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Instant Card / Bank Pay</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
