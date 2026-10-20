import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { seo } from "@/components/SiteLayout";
import { CONTACT } from "@/lib/site";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/order")({
  validateSearch: (s: Record<string, unknown>): { occasion?: string } =>
    typeof s["occasion"] === "string" ? { occasion: s["occasion"] } : {},
  head: () => seo("Start Your Order — Redycakes", "Tell us about your cake in a few simple steps. We reply within 24 hours, Monday to Saturday."),
  component: Order,
});

const OCCASIONS = ["Wedding", "Birthday", "Corporate", "Celebration", "Baby shower", "Tasting box"];
const BUDGETS = ["Under £100", "£100–£200", "£200–£400", "£400–£700", "£700+", "Not sure yet"];
const FLAVOURS = ["Vanilla bean", "Dark chocolate", "Lemon & elderflower", "Salted caramel", "Red velvet", "Pistachio & rose", "Raspberry", "Coconut & lime"];
const DIETARY = ["Vegan", "Gluten-free", "Dairy-free", "Egg-free", "Nut-free"];
const STEPS = ["Occasion", "Date & budget", "Flavours", "Inspiration", "Your details"];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(100),
  email: z.string().trim().email("Please check your email").max(255),
  phone: z.string().trim().max(40).optional(),
});

function Order() {
  const search = Route.useSearch();
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    occasion: search.occasion && OCCASIONS.includes(search.occasion) ? search.occasion : "",
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
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setStatus("sending");
    try {
      const inspirationList: { name: string; url?: string; dataUrl?: string }[] = [];
      for (const f of files) {
        const cleanName = `${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        try {
          const storageRef = ref(storage, `inspiration/${cleanName}`);
          const uploadRes = await uploadBytes(storageRef, f);
          const downloadUrl = await getDownloadURL(uploadRes.ref);
          inspirationList.push({ name: f.name, url: downloadUrl });
        } catch {
          // If storage bucket is not provisioned or storage access fails, store base64 dataUrl (up to 500KB)
          if (f.size <= 500 * 1024) {
            const dataUrl = await fileToDataUrl(f);
            inspirationList.push({ name: f.name, dataUrl });
          } else {
            inspirationList.push({ name: f.name });
          }
        }
      }

      await addDoc(collection(db, "order_requests"), {
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
        inspiration: inspirationList,
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (error) {
      console.error("Error submitting order request:", error);
      setStatus("idle");
      setErr("Something went wrong sending your request — please try again.");
    }
  }

  if (status === "done") {
    return (
      <section className="container-page max-w-2xl py-24 text-center">
        <p className="eyebrow">Request received</p>
        <h1 className="mt-4 text-5xl">Thank you, {d.name.split(" ")[0]}!</h1>
        <p className="mt-6 text-lg text-muted-foreground">Your cake request is with us. Expect a personal reply with your quote {CONTACT.replyPromise}, sent to <strong className="text-foreground">{d.email}</strong>.</p>
      </section>
    );
  }

  return (
    <section className="container-page max-w-3xl py-16">
      <p className="eyebrow">Start your order</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Tell us about your cake.</h1>
      <p className="mt-3 text-muted-foreground">About five minutes. We reply {CONTACT.replyPromise}.</p>

      <div className="mt-10">
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEPS.map((s, i) => <span key={s} className={i <= step ? "font-semibold text-foreground" : ""}>{s}</span>)}
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="mt-10 rounded-3xl border bg-card p-6 md:p-10">
        {step === 0 && (
          <Group label="What's the occasion?">
            <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <button key={o} type="button" className="chip" data-active={d.occasion === o} onClick={() => setD({ ...d, occasion: o })}>{o}</button>)}</div>
          </Group>
        )}
        {step === 1 && (
          <div className="space-y-6">
            <Group label="Event date"><input type="date" className="field" value={d.event_date} onChange={(e) => setD({ ...d, event_date: e.target.value })} /></Group>
            <Group label="Roughly how many guests? (optional)"><input className="field" maxLength={30} value={d.guests} onChange={(e) => setD({ ...d, guests: e.target.value })} placeholder="e.g. 40" /></Group>
            <Group label="Budget">
              <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => <button key={b} type="button" className="chip" data-active={d.budget === b} onClick={() => setD({ ...d, budget: b })}>{b}</button>)}</div>
            </Group>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <Group label="Flavours you love (pick any)">
              <div className="flex flex-wrap gap-2">{FLAVOURS.map((f) => <button key={f} type="button" className="chip" data-active={d.flavours.includes(f)} onClick={() => toggle("flavours", f)}>{f}</button>)}</div>
            </Group>
            <Group label="Dietary needs">
              <div className="flex flex-wrap gap-2">{DIETARY.map((f) => <button key={f} type="button" className="chip" data-active={d.dietary.includes(f)} onClick={() => toggle("dietary", f)}>{f}</button>)}</div>
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
