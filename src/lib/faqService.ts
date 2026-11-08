import { supabase } from "@/integrations/supabase/client";
import {
  getCachedContent,
  saveCachedContent,
  persistContentToSupabase,
  type SiteContent,
} from "./siteContent";

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  category: string;
  isActive: boolean;
  order?: number;
  updatedAt?: string;
}

export type FaqCategory =
  | "Ordering & Timelines"
  | "Delivery & Pickup"
  | "Dietary & Allergens"
  | "Weddings & Tastings"
  | "Pricing & Deposits"
  | "Care & Storage"
  | "General";

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Ordering & Timelines",
  "Delivery & Pickup",
  "Dietary & Allergens",
  "Weddings & Tastings",
  "Pricing & Deposits",
  "Care & Storage",
  "General",
];

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: "faq_1",
    q: "How far ahead should I order?",
    a: "For celebration cakes, two to three weeks is comfortable. Weddings are usually booked a few months ahead. Short notice? Ask anyway — we'll tell you honestly whether we can help.",
    category: "Ordering & Timelines",
    isActive: true,
    order: 1,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "faq_2",
    q: "Do you take a deposit?",
    a: "Yes, a deposit secures your date in our diary. We'll explain the amount and when the balance is due in your quote, so there are no surprises.",
    category: "Pricing & Deposits",
    isActive: true,
    order: 2,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "faq_3",
    q: "What if I need to change something?",
    a: "Plans change — that's normal. Let us know as early as you can and we'll do our best to adjust the design, size or date.",
    category: "Ordering & Timelines",
    isActive: true,
    order: 3,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "faq_4",
    q: "Do you deliver?",
    a: "We deliver and set up across London & the Home Counties, or you're welcome to collect from our studio. Delivery cost is included in your quote.",
    category: "Delivery & Pickup",
    isActive: true,
    order: 4,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "faq_5",
    q: "How do you handle allergens?",
    a: "We bake in a kitchen that handles nuts, gluten, dairy and eggs. We take careful steps to prevent cross-contact and will always be upfront about what that means for severe allergies.",
    category: "Dietary & Allergens",
    isActive: true,
    order: 5,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "faq_6",
    q: "How quickly will you reply?",
    a: "Every enquiry gets a real reply within 24 hours, Monday to Saturday.",
    category: "Ordering & Timelines",
    isActive: true,
    order: 6,
    updatedAt: "2026-10-27T10:00:00.000Z",
  },
];

export const FAQ_BROADCAST_EVENT = "redycakes_faq_updated";

/**
 * Normalizes an array of raw FAQ objects into typed, stable FaqItems.
 */
export function normalizeFaqList(rawList: any[]): FaqItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_FAQS;
  }
  return rawList.map((item, idx) => ({
    id: String(item.id || `faq_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`),
    q: String(item.q || item.question || "").trim(),
    a: String(item.a || item.answer || "").trim(),
    category: String(item.category || "General"),
    isActive: item.isActive !== false,
    order: typeof item.order === "number" ? item.order : idx + 1,
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));
}

/**
 * Returns the currently active FAQ list from site content cache.
 */
export function getActiveFaqs(): FaqItem[] {
  const content = getCachedContent();
  return normalizeFaqList(content.faq);
}

/**
 * Broadcasts an update across tabs and windows.
 */
function broadcastFaqUpdate(faqs: FaqItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(FAQ_BROADCAST_EVENT, { detail: { faqs } }));
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("redycakes_faqs_channel");
      bc.postMessage({ type: "FAQ_UPDATED", faqs, timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore broadcast errors
  }
}

/**
 * Persists an FAQ list to siteContent cache and Supabase.
 */
export async function persistFaqs(faqs: FaqItem[]): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  const currentContent = getCachedContent();
  const updatedContent: SiteContent = {
    ...currentContent,
    faq: faqs as any,
  };

  saveCachedContent(updatedContent);
  broadcastFaqUpdate(faqs);

  // Sync to site_content in Supabase
  const result = await persistContentToSupabase(updatedContent);

  // Also best-effort upsert to standalone public.faqs table if available
  try {
    const records = faqs.map((f, i) => ({
      id: f.id,
      question: f.q,
      answer: f.a,
      category: f.category,
      display_order: f.order ?? i + 1,
      is_active: f.isActive,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("faqs" as any).upsert(records);
  } catch {
    // Standalone table is optional
  }

  return result;
}

/**
 * Adds a new FAQ.
 */
export async function addFaq(item: {
  q: string;
  a: string;
  category?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; faq: FaqItem; allFaqs: FaqItem[] }> {
  const current = getActiveFaqs();
  const newFaq: FaqItem = {
    id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    q: item.q.trim(),
    a: item.a.trim(),
    category: (item.category && item.category.trim()) || "General",
    isActive: item.isActive !== false,
    order: current.length + 1,
    updatedAt: new Date().toISOString(),
  };

  const updated = [...current, newFaq];
  await persistFaqs(updated);
  return { success: true, faq: newFaq, allFaqs: updated };
}

/**
 * Updates an existing FAQ by ID.
 */
export async function updateFaq(
  id: string,
  updates: Partial<Omit<FaqItem, "id">>
): Promise<{ success: boolean; allFaqs: FaqItem[] }> {
  const current = getActiveFaqs();
  const updated = current.map((f) => {
    if (f.id === id) {
      return {
        ...f,
        ...updates,
        q: updates.q !== undefined ? updates.q.trim() : f.q,
        a: updates.a !== undefined ? updates.a.trim() : f.a,
        category: updates.category !== undefined ? updates.category.trim() : f.category,
        updatedAt: new Date().toISOString(),
      };
    }
    return f;
  });

  await persistFaqs(updated);
  return { success: true, allFaqs: updated };
}

/**
 * Deletes an FAQ by ID.
 */
export async function deleteFaq(id: string): Promise<{ success: boolean; allFaqs: FaqItem[] }> {
  const current = getActiveFaqs();
  const updated = current.filter((f) => f.id !== id);
  // Re-index display order
  const reindexed = updated.map((f, idx) => ({ ...f, order: idx + 1 }));

  await persistFaqs(reindexed);

  // Best-effort delete from standalone table
  try {
    await supabase.from("faqs" as any).delete().eq("id", id);
  } catch {
    // Standalone table is optional
  }

  return { success: true, allFaqs: reindexed };
}

/**
 * Reorders FAQs.
 */
export async function reorderFaqs(newOrderFaqs: FaqItem[]): Promise<{ success: boolean; allFaqs: FaqItem[] }> {
  const indexed = newOrderFaqs.map((f, idx) => ({
    ...f,
    order: idx + 1,
  }));
  await persistFaqs(indexed);
  return { success: true, allFaqs: indexed };
}

/**
 * Resets FAQs to the original default bakery set.
 */
export async function resetFaqsToDefault(): Promise<{ success: boolean; allFaqs: FaqItem[] }> {
  await persistFaqs(DEFAULT_FAQS);
  return { success: true, allFaqs: DEFAULT_FAQS };
}
