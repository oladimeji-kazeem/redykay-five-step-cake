import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHero, seo, InstagramIcon, TikTokIcon, FacebookIcon, PinterestIcon } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";
import { saveContactMessage } from "@/lib/databaseSchema";
import { trackEvent } from "@/lib/analytics";
import { sendEmailViaHostingerSmtp } from "@/lib/emailService";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo(
      "Contact & Bespoke Studio Enquiries — Redycakes",
      "Message us, chat on WhatsApp or send an email enquiry. We reply within 24 hours, Monday to Saturday.",
      "/og-image.jpg",
      "/contact"
    ),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(100),
  email: z.string().trim().email("Please check your email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(2000),
});

function Contact() {
  const { content } = useSiteContent();
  const contact = content.contact;
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Please check the form."); return; }
    setErr(""); setStatus("sending");
    try {
      await saveContactMessage({
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
      });

      // Dispatch via Hostinger SMTP (smtp.hostinger.com:465) copying sender and admin backup
      sendEmailViaHostingerSmtp({
        to: "hello@redycakes.org",
        cc: ["redycakesinfo@gmail.com", parsed.data.email].filter(Boolean).join(", "),
        subject: `[Contact Form] New Inquiry from ${parsed.data.name}`,
        message: parsed.data.message,
        visitorName: parsed.data.name,
        visitorEmail: parsed.data.email,
      }).catch((e) => console.debug("[Contact Email] SMTP notice:", e));

      trackEvent("contact_submitted", { email: parsed.data.email });
      setStatus("sent");
    } catch (error) {
      console.error("Error saving contact message:", error);
      setStatus("error");
    }
  }

  return (
    <>
      <PageHero eyebrow="Contact" title="Say hello." intro={`We reply ${contact.replyPromise}.`} />
      <section className="container-page grid gap-12 md:grid-cols-[1.3fr_1fr]">
        {status === "sent" ? (
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-secondary/80 to-accent/40 p-10 shadow-soft">
            <h2 className="text-3xl font-semibold">Thank you — message received.</h2>
            <p className="mt-3 text-muted-foreground">We'll reply {contact.replyPromise}.</p>
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
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-primary w-full">Quick chat on WhatsApp</a>
          <div><p className="eyebrow">Email</p><a href={`mailto:${contact.email}`} className="mt-1 block text-lg font-medium hover:text-primary transition-colors">{contact.email}</a></div>
          <div><p className="eyebrow">Service area</p><p className="mt-1 text-lg font-medium">{contact.serviceArea}</p></div>

          {/* Social Media Channels */}
          {(contact.instagram || contact.tiktok || contact.facebook || contact.pinterest) && (
            <div className="pt-6 border-t border-border/80 space-y-3">
              <div>
                <p className="eyebrow">Follow our bakes</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  See recent wedding & celebration cakes, piping tutorials, and behind-the-scenes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {contact.instagram && (
                  <a
                    href={contact.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground text-xs font-semibold transition-all"
                  >
                    <InstagramIcon className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                )}
                {contact.tiktok && (
                  <a
                    href={contact.tiktok}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground text-xs font-semibold transition-all"
                  >
                    <TikTokIcon className="h-4 w-4" />
                    <span>TikTok</span>
                  </a>
                )}
                {contact.facebook && (
                  <a
                    href={contact.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground text-xs font-semibold transition-all"
                  >
                    <FacebookIcon className="h-4 w-4" />
                    <span>Facebook</span>
                  </a>
                )}
                {contact.pinterest && (
                  <a
                    href={contact.pinterest}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/40 border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground text-xs font-semibold transition-all"
                  >
                    <PinterestIcon className="h-4 w-4" />
                    <span>Pinterest</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
