import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { gallery as defaultGallery, CONTACT as defaultContact, images } from "@/lib/site";

export interface TrustItem {
  title: string;
  text: string;
}

export interface QuoteItem {
  q: string;
  who: string;
}

export interface CakeItem {
  id?: string;
  src: string;
  title: string;
  occasion: "Wedding" | "Birthday" | "Corporate" | "Celebration";
  style: "Sculpted" | "Buttercream" | "Fondant" | "Dietary-Friendly";
  brief: string;
  solution: string;
}

export interface StepItem {
  t: string;
  d: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface DietaryCategory {
  name: string;
  how: string;
}

export interface SiteContent {
  contact: {
    email: string;
    whatsapp: string;
    serviceArea: string;
    replyPromise: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string;
    badgeValue: string;
    badgeText: string;
  };
  trust: TrustItem[];
  gallery: CakeItem[];
  quotes: QuoteItem[];
  dietary: {
    categories: DietaryCategory[];
    flavours: string[];
    allergenNotice: string;
  };
  tasting: {
    eyebrow: string;
    title: string;
    intro: string;
    inside: string[];
    note: string;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: StepItem[];
    promiseNotice: string;
  };
  faq: FaqItem[];
  about: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  cta: {
    title: string;
    text: string;
  };
}

export type SiteContentData = SiteContent;

export const DEFAULT_SITE_CONTENT: SiteContent = {
  contact: {
    email: defaultContact.email,
    whatsapp: defaultContact.whatsapp,
    serviceArea: defaultContact.serviceArea,
    replyPromise: defaultContact.replyPromise,
  },
  hero: {
    eyebrow: "Bespoke cake studio · UK",
    titleLead: "Beautiful bespoke cakes,",
    titleHighlight: "ordered the easy way.",
    intro: "Clear answers, honest timelines, and flavours people rave about — so you feel looked after before we've even spoken.",
    badgeValue: "24h",
    badgeText: "quote turnaround, Mon–Sat",
  },
  trust: [
    { title: "Replies within 24 hours", text: "A real person answers with a clear quote — no chasing, no guessing." },
    { title: "Honest timelines", text: "We tell you upfront if your date works, and exactly what happens when." },
    { title: "Dietary needs, done properly", text: "Vegan, gluten-free, dairy-free and egg-free cakes that taste like the real thing." },
  ],
  gallery: defaultGallery.map((g, idx) => ({ ...g, id: `cake_${idx}` })),
  quotes: [
    { q: "Guests were asking for the baker's name before we'd even cut the second tier.", who: "Amara & Tom, wedding" },
    { q: "The first gluten-free cake my daughter has ever gone back to for seconds.", who: "Helen, 8th birthday" },
    { q: "On time, exactly on brand, and the office devoured it by 3pm.", who: "Priya, product launch" },
  ],
  dietary: {
    categories: [
      { name: "Vegan", how: "Aquafaba and plant butters give a tender, springy crumb. Our ganache uses coconut cream for the same glossy finish — nobody misses a thing." },
      { name: "Gluten-free", how: "A house blend of rice, almond and tapioca flours, rested overnight so the sponge is moist rather than crumbly." },
      { name: "Dairy-free", how: "Cultured plant butter and oat milk keep the buttercream silky and the sponge rich, with all the vanilla depth you'd expect." },
      { name: "Egg-free", how: "Carefully balanced raising agents and fruit purées give structure for tall, stacked tiers — even sculpted designs." },
    ],
    flavours: ["Dark chocolate & raspberry", "Lemon & elderflower", "Pistachio & rose", "Salted caramel", "Vanilla bean & strawberry", "Coconut & lime"],
    allergenNotice: "A note on allergens: we bake in a kitchen that also handles nuts, gluten, dairy and eggs. We take careful steps to avoid cross-contact and will talk you through them honestly — please tell us about any severe allergy when you enquire.",
  },
  tasting: {
    eyebrow: "Tasting boxes",
    title: "Taste first. Decide together, at home.",
    intro: "The easiest first step for wedding couples — no appointment, no sales pitch. Just cake, a sofa and an honest conversation about what you love.",
    inside: [
      "Six generous slices of our signature flavours",
      "Dietary-friendly versions on request",
      "Flavour notes and pairing ideas",
      "A no-pressure follow-up chat if you'd like one",
    ],
    note: "Choose from our flavour list or ask for your own favourites. Delivered or collected, ready to share.",
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "No guesswork. Just five clear steps.",
    intro: "You'll always know what happens next and when.",
    steps: [
      { t: "Enquire", d: "Fill in our short order form — occasion, date, budget, flavours and any inspiration photos. Takes about five minutes." },
      { t: "Your quote", d: "We reply within 24 hours, Monday to Saturday, with a clear price, what's included, and whether your date is available." },
      { t: "Design confirmation", d: "We send a sketch or written design for you to approve. Tweaks are welcome — nothing is baked until you're happy." },
      { t: "We bake", d: "Your cake is baked fresh in the days before your event, then decorated by hand." },
      { t: "Delivery or pickup", d: "Collect from our studio or we deliver and set up. You'll get a reminder with your time slot beforehand." },
    ],
    promiseNotice: "Every enquiry gets a real reply within 24 hours, Monday to Saturday. If we can't make your date, we'll tell you straight away.",
  },
  faq: [
    { q: "How far ahead should I order?", a: "For celebration cakes, two to three weeks is comfortable. Weddings are usually booked a few months ahead. Short notice? Ask anyway — we'll tell you honestly whether we can help." },
    { q: "Do you take a deposit?", a: "Yes, a deposit secures your date in our diary. We'll explain the amount and when the balance is due in your quote, so there are no surprises." },
    { q: "What if I need to change something?", a: "Plans change — that's normal. Let us know as early as you can and we'll do our best to adjust the design, size or date." },
    { q: "Do you deliver?", a: "We deliver and set up across London & the Home Counties, or you're welcome to collect from our studio. Delivery cost is included in your quote." },
    { q: "How do you handle allergens?", a: "We bake in a kitchen that handles nuts, gluten, dairy and eggs. We take careful steps to prevent cross-contact and will always be upfront about what that means for severe allergies." },
    { q: "How quickly will you reply?", a: "Every enquiry gets a real reply within 24 hours, Monday to Saturday." },
  ],
  about: {
    eyebrow: "Our story",
    title: "Made by hand. Run with care.",
    paragraphs: [
      "Redycakes started in a home kitchen, baking for friends who kept saying the same thing: “I wish ordering a cake was this easy everywhere.”",
      "So that became the point. Beautiful cakes, yes — but also quick replies, clear prices, and real care for people whose dietary needs usually get a sigh instead of a solution.",
      "Today we're still small on purpose. Every cake is designed with you, baked fresh, and finished by hand.",
    ],
  },
  cta: {
    title: "Ready when you are.",
    text: "Tell us about your celebration — we reply within 24 hours, Monday to Saturday.",
  },
};

export const defaultSiteContent = DEFAULT_SITE_CONTENT;

const CONTENT_STORAGE_KEY = "redycakes_site_content_cache";
const CONTENT_UPDATE_EVENT = "redycakes_content_updated";

export function getCachedContent(): SiteContent {
  if (typeof window === "undefined") return DEFAULT_SITE_CONTENT;
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONTENT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SITE_CONTENT,
      ...parsed,
      contact: { ...DEFAULT_SITE_CONTENT.contact, ...(parsed.contact || {}) },
      hero: { ...DEFAULT_SITE_CONTENT.hero, ...(parsed.hero || {}) },
      dietary: { ...DEFAULT_SITE_CONTENT.dietary, ...(parsed.dietary || {}) },
      tasting: { ...DEFAULT_SITE_CONTENT.tasting, ...(parsed.tasting || {}) },
      howItWorks: { ...DEFAULT_SITE_CONTENT.howItWorks, ...(parsed.howItWorks || {}) },
      about: { ...DEFAULT_SITE_CONTENT.about, ...(parsed.about || {}) },
      cta: { ...DEFAULT_SITE_CONTENT.cta, ...(parsed.cta || {}) },
    };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function saveCachedContent(content: SiteContent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent(CONTENT_UPDATE_EVENT, { detail: content }));
  } catch (e) {
    console.error("Failed to save content to localStorage", e);
  }
}

export async function fetchContentFromSupabase(): Promise<SiteContent | null> {
  try {
    const { data, error } = await supabase
      .from("site_content" as any)
      .select("content")
      .eq("id", "current_content")
      .single();

    if (error) {
      if (error.code !== "PGRST205") {
        console.debug("[SiteContent] Supabase note:", error.message);
      }
      return null;
    }
    if (data && (data as any).content) {
      return (data as any).content as SiteContent;
    }
  } catch {
    // Supabase table not created yet; fallback to local storage
  }
  return null;
}

export async function persistContentToSupabase(content: SiteContent): Promise<boolean> {
  // Always update local cache immediately so edits are instantly visible
  saveCachedContent(content);

  try {
    const { error } = await supabase
      .from("site_content" as any)
      .upsert({
        id: "current_content",
        content,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.debug("[SiteContent] Supabase upsert note:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(getCachedContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check Supabase in background for any updates
    fetchContentFromSupabase().then((remote) => {
      if (remote) {
        setContent(remote);
        saveCachedContent(remote);
      }
    });

    const handler = (e: Event) => {
      const custom = e as CustomEvent<SiteContent>;
      if (custom.detail) {
        setContent(custom.detail);
      }
    };
    window.addEventListener(CONTENT_UPDATE_EVENT, handler);
    return () => window.removeEventListener(CONTENT_UPDATE_EVENT, handler);
  }, []);

  const updateContent = useCallback(async (newContent: SiteContent | ((prev: SiteContent) => SiteContent)) => {
    setIsSaving(true);
    const resolved = typeof newContent === "function" ? newContent(content) : newContent;
    setContent(resolved);
    const synced = await persistContentToSupabase(resolved);
    setIsSaving(false);
    return synced;
  }, [content]);

  const resetDefaults = useCallback(async () => {
    return updateContent(DEFAULT_SITE_CONTENT);
  }, [updateContent]);

  return {
    content,
    updateContent,
    isSaving,
    resetDefaults,
  };
}
