import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { CreditCard, Building2, CheckCircle2, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";
import { saveOrder, type OrderItem } from "@/lib/databaseSchema";
import { usePaymentSettings, formatMoney } from "@/lib/paymentSettings";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/order")({
  validateSearch: (s: Record<string, unknown>): { occasion?: string } =>
    typeof s["occasion"] === "string" ? { occasion: s["occasion"] } : {},
  head: () => seo("Start Your Order — Redycakes", "Tell us about your cake in a few simple steps. We reply within 24 hours, Monday to Saturday."),
  component: Order,
});

const DEFAULT_BUDGETS = ["Under £100", "£100–£200", "£200–£400", "£400–£700", "£700+", "Not sure yet"];
const STEPS = ["Occasion", "Date & budget", "Flavours", "Inspiration", "Your details"];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(100),
  email: z.string().trim().email("Please check your email").max(255),
  phone: z.string().trim().max(40).optional(),
});

function Order() {
  const { content } = useSiteContent();
  const { settings: paymentSettings } = usePaymentSettings();
  const search = Route.useSearch();
  const [step, setStep] = useState(0);
  const [submittedOrder, setSubmittedOrder] = useState<OrderItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const contact = content.contact;
  const occasionsList = useMemo(() => {
    const list = Array.from(new Set([
      ...content.gallery.map((g) => g.occasion),
      "Wedding", "Birthday", "Corporate", "Celebration", "Baby shower", "Tasting box"
    ]));
    return list;
  }, [content.gallery]);

  const flavoursList = content.dietary.flavours && content.dietary.flavours.length > 0
    ? content.dietary.flavours
    : ["Vanilla bean", "Dark chocolate", "Lemon & elderflower", "Salted caramel", "Red velvet", "Pistachio & rose"];

  const dietaryList = content.dietary.categories && content.dietary.categories.length > 0
    ? content.dietary.categories.map((c) => c.name)
    : ["Vegan", "Gluten-free", "Dairy-free", "Egg-free", "Nut-free"];

  const [d, setD] = useState({
    occasion: search.occasion && occasionsList.includes(search.occasion) ? search.occasion : (search.occasion || ""),
    event_date: "", guests: "", budget: "", flavours: [] as string[], dietary: [] as string[],
    fulfilment: "Collection", notes: "", name: "", email: "", phone: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  const toggle = (k: "flavours" | "dietary", v: string) =>
    setD({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] });

  function validate(): string {
    if (step === 0 && !d.occasion) return "Please choose an occasion.";
    if (step === 1) {
      if (!d.event_date) return "Please pick your event date.";
      if (new Date(d.event_date) < new Date(new Date().toDateString())) return "That date has already passed.";
      if (!d.budget) return "Please choose a budget range.";
    }
    if (step === 4) { const r = contactSchema.safeParse(d); if (!r.success) return r.error.issues[0]?.message ?? "Please check your details."; }
    return "";
  }

  async function next() {
    const e = validate(); setErr(e); if (e) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      trackEvent("order_step_completed", { step: step + 1, occasion: d.occasion });
      return;
    }
    setStatus("sending");
    try {
      const fileNames: string[] = [];
      for (const f of files) {
        const cleanName = `${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        try {
          await supabase.storage.from("inspiration").upload(cleanName, f);
          fileNames.push(cleanName);
        } catch {
          fileNames.push(f.name);
        }
      }

      const created = await saveOrder({
        name: d.name.trim(),
        email: d.email.trim(),
        phone: d.phone.trim() || null,
        occasion: d.occasion,
        event_date: d.event_date,
        guests: d.guests || null,
        budget: d.budget,
        flavours: d.flavours,
        dietary: d.dietary,
        fulfilment: d.fulfilment,
        notes: d.notes.trim() || null,
        inspiration_paths: fileNames,
        quote_amount: d.occasion === "Tasting box" ? paymentSettings.depositRules.tastingBoxPrice : null,
        deposit_amount: d.occasion === "Tasting box" ? paymentSettings.depositRules.tastingBoxPrice : null,
      });

      setSubmittedOrder(created);

      trackEvent("order_submitted", {
        occasion: d.occasion,
        budget: d.budget,
        guests: d.guests,
      });

      setStatus("done");
    } catch (error) {
      console.error("Error submitting order request:", error);
      setStatus("idle");
      setErr("Something went wrong sending your request — please try again.");
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (status === "done") {
    const orderRef = submittedOrder?.id
      ? `${paymentSettings.bankTransfer.referencePrefix}${submittedOrder.id.slice(0, 8).toUpperCase()}`
      : `${paymentSettings.bankTransfer.referencePrefix}ORDER`;

    return (
      <section className="container-page max-w-2xl py-16 sm:py-24 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 mb-3">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="eyebrow">Request received</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display font-bold">Thank you, {d.name.split(" ")[0]}!</h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          Your cake request is with our baking studio. Expect a personal reply with your custom quote {contact.replyPromise}, sent to <strong className="text-foreground">{d.email}</strong>.
        </p>

        {/* Live Payment & Date Reservation Card */}
        {paymentSettings.enabled && (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card p-6 sm:p-8 text-left shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/80">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {d.occasion === "Tasting box" ? "Complete Your Tasting Box Order" : "Fast-Track Booking & Date Reservation"}
                </span>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {d.occasion === "Tasting box"
                    ? `Tasting Box Fee: ${formatMoney(paymentSettings.depositRules.tastingBoxPrice, paymentSettings.currency)}`
                    : `Securing your date: ${paymentSettings.depositRules.depositPercentage}% deposit required`}
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-secondary text-foreground self-start sm:self-auto">
                Ref: {orderRef}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {d.occasion === "Tasting box"
                ? "Tasting boxes are prepared and dispatched once payment is confirmed. You can pay now with debit/credit card or bank transfer."
                : "Want to reserve your celebration date right away? You can make an advance deposit or wait for our personal design quote."}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                to="/pay"
                search={{
                  order: submittedOrder?.id,
                  type: d.occasion === "Tasting box" ? "tasting-box" : "deposit",
                  amount: d.occasion === "Tasting box" ? String(paymentSettings.depositRules.tastingBoxPrice) : undefined,
                  name: d.name,
                  email: d.email,
                }}
                className="w-full sm:w-auto btn btn-primary flex items-center justify-center gap-2 !py-3 !px-6 text-xs font-bold"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {d.occasion === "Tasting box"
                    ? `Pay ${formatMoney(paymentSettings.depositRules.tastingBoxPrice, paymentSettings.currency)} Online Now`
                    : "Make Online Deposit"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              {paymentSettings.bankTransfer.enabled && (
                <div className="text-xs text-muted-foreground">
                  or via UK Faster Payments (Sort: <strong className="text-foreground font-mono">{paymentSettings.bankTransfer.sortCode}</strong>)
                </div>
              )}
            </div>

            {/* Quick Bank Details accordion snippet */}
            {paymentSettings.bankTransfer.enabled && (
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bank Transfer Details: {paymentSettings.bankTransfer.bankName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(orderRef, "Order Reference")}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    {copiedKey === "Order Reference" ? "Copied!" : "Copy Ref"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-foreground">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-sans">Sort Code:</span>
                    {paymentSettings.bankTransfer.sortCode}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-sans">Account No:</span>
                    {paymentSettings.bankTransfer.accountNumber}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[10px] font-sans">Reference:</span>
                    <strong className="text-primary">{orderRef}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition underline-offset-4 hover:underline">
            ← Return to storefront
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page max-w-3xl py-16">
      <p className="eyebrow">Start your order</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Tell us about your cake.</h1>
      <p className="mt-3 text-muted-foreground">About five minutes. We reply {contact.replyPromise}.</p>

      <div className="mt-10">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          {STEPS.map((s, i) => <span key={s} className={i <= step ? "font-semibold text-primary" : ""}>{s}</span>)}
        </div>
        <div className="mt-2.5 h-2.5 rounded-full bg-muted/80 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#8B5CF6] transition-all duration-300 shadow-sm" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-border/80 bg-card p-6 md:p-10 shadow-soft">
        {step === 0 && (
          <Group label="What's the occasion?">
            <div className="flex flex-wrap gap-2">{occasionsList.map((o) => <button key={o} type="button" className="chip" data-active={d.occasion === o} onClick={() => setD({ ...d, occasion: o })}>{o}</button>)}</div>
          </Group>
        )}
        {step === 1 && (
          <div className="space-y-6">
            <Group label="Event date"><input type="date" className="field" value={d.event_date} onChange={(e) => setD({ ...d, event_date: e.target.value })} /></Group>
            <Group label="Roughly how many guests? (optional)"><input className="field" maxLength={30} value={d.guests} onChange={(e) => setD({ ...d, guests: e.target.value })} placeholder="e.g. 40" /></Group>
            <Group label="Budget">
              <div className="flex flex-wrap gap-2">{DEFAULT_BUDGETS.map((b) => <button key={b} type="button" className="chip" data-active={d.budget === b} onClick={() => setD({ ...d, budget: b })}>{b}</button>)}</div>
            </Group>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <Group label="Flavours you love (pick any)">
              <div className="flex flex-wrap gap-2">{flavoursList.map((f) => <button key={f} type="button" className="chip" data-active={d.flavours.includes(f)} onClick={() => toggle("flavours", f)}>{f}</button>)}</div>
            </Group>
            <Group label="Dietary needs">
              <div className="flex flex-wrap gap-2">{dietaryList.map((f) => <button key={f} type="button" className="chip" data-active={d.dietary.includes(f)} onClick={() => toggle("dietary", f)}>{f}</button>)}</div>
            </Group>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <Group label="Inspiration images (optional, up to 5)">
              <input type="file" accept="image/*" multiple className="field" onChange={(e) => {
                const list = Array.from(e.target.files ?? []).filter((f) => f.size <= 10 * 1024 * 1024).slice(0, 5);
                setFiles(list);
              }} />
              {files.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{files.length} image{files.length > 1 ? "s" : ""} selected</p>}
            </Group>
            <Group label="Anything else? Colours, theme, wording…">
              <textarea className="field min-h-32" maxLength={2000} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
            </Group>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <Group label="Collection or delivery?">
              <div className="flex gap-2">{["Collection", "Delivery"].map((f) => <button key={f} type="button" className="chip" data-active={d.fulfilment === f} onClick={() => setD({ ...d, fulfilment: f })}>{f}</button>)}</div>
            </Group>
            <input className="field" placeholder="Your name" maxLength={100} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
            <input className="field" type="email" placeholder="Email" maxLength={255} value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
            <input className="field" placeholder="Phone (optional)" maxLength={40} value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} />
          </div>
        )}

        {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
        <div className="mt-8 flex justify-between">
          <button type="button" className="btn btn-outline" disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }}>Back</button>
          <button type="button" className="btn btn-primary" disabled={status === "sending"} onClick={next}>
            {step === STEPS.length - 1 ? (status === "sending" ? "Sending…" : "Send my request") : "Continue"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-3 font-display text-xl">{label}</p>{children}</div>;
}
