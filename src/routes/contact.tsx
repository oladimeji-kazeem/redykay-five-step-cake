import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHero, seo } from "@/components/SiteLayout";
import { CONTACT } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact — RedyKay", "Message us, chat on WhatsApp or email. We reply within 24 hours, Monday to Saturday."),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(100),
  email: z.string().trim().email("Please check your email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(2000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Please check the form."); return; }
    setErr(""); setStatus("sending");
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setStatus(error ? "error" : "sent");
  }

  return (
    <>
      <PageHero eyebrow="Contact" title="Say hello." intro={`We reply ${CONTACT.replyPromise}.`} />
      <section className="container-page grid gap-12 md:grid-cols-[1.3fr_1fr]">
        {status === "sent" ? (
          <div className="rounded-3xl bg-secondary p-10">
            <h2 className="text-3xl">Thank you — message received.</h2>
            <p className="mt-3 text-muted-foreground">We'll reply {CONTACT.replyPromise}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input className="field" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            <input className="field" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
            <textarea className="field min-h-40" placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            {status === "error" && <p className="text-sm text-destructive">Something went wrong — please try again or message us on WhatsApp.</p>}
            <button className="btn btn-primary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send message"}</button>
          </form>
        )}
        <aside className="space-y-6">
          <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-primary w-full">Quick chat on WhatsApp</a>
          <div><p className="eyebrow">Email</p><a href={`mailto:${CONTACT.email}`} className="mt-1 block text-lg">{CONTACT.email}</a></div>
          <div><p className="eyebrow">Service area</p><p className="mt-1 text-lg">{CONTACT.serviceArea}</p></div>
        </aside>
      </section>
    </>
  );
}
