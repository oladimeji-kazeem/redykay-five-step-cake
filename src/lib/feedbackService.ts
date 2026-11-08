import { supabase } from "@/integrations/supabase/client";
import { sendEmailViaHostingerSmtp } from "@/lib/emailService";

export type FeedbackStatus = "pending" | "approved" | "featured" | "archived";

export type ExperienceOccasion =
  | "Wedding"
  | "Birthday"
  | "Celebration"
  | "Tasting Box"
  | "Dietary-Friendly"
  | "Corporate"
  | "Other"
  | (string & {});

export interface CustomerReview {
  id: string;
  created_at: string;
  name: string;
  email: string;
  location?: string;
  rating: number; // 1 - 5
  occasion: ExperienceOccasion;
  flavour?: string;
  review_text: string;
  recommend: boolean;
  status: FeedbackStatus;
  admin_reply?: string;
  admin_replied_at?: string;
  verified_buyer?: boolean;
}

const STORAGE_REVIEWS_KEY = "redycakes_customer_reviews";
const BROADCAST_REVIEWS_CHANNEL = "redycakes_reviews_broadcast";
export const REDYCAKES_CONTACT_EMAIL = "hello@redycakes.org";

// Curated initial seed reviews for luxury cake studio social proof
export const INITIAL_SEED_REVIEWS: CustomerReview[] = [
  {
    id: "review-seed-1",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    name: "Sarah & Tom Montgomery",
    email: "sarah.m@example.com",
    location: "Richmond, Surrey",
    rating: 5,
    occasion: "Wedding",
    flavour: "Madagascan Vanilla Bean & Elderflower Curd with Pressed Petals",
    review_text:
      "Our three-tier botanical wedding cake at Highfield Manor was nothing short of a masterpiece. The edible viola petals matched my meadow bouquet perfectly, and the sponge was so delicate and fragrant. Weeks later, our guests are still asking where we ordered it!",
    recommend: true,
    status: "featured",
    verified_buyer: true,
    admin_reply: "Thank you so much Sarah & Tom! It was an absolute delight crafting your botanical tiers and styling them on-site at Highfield Manor.",
    admin_replied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "review-seed-2",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    name: "Liam Davies",
    email: "liam.davies@example.com",
    location: "Kensington, London",
    rating: 5,
    occasion: "Dietary-Friendly",
    flavour: "70% Valrhona Dark Chocolate & Whipped Ganache (Vegan)",
    review_text:
      "Finding a 100% vegan birthday cake that doesn't compromise on luxury richness is usually impossible. Redycakes knocked this out of the park. The cocoa depth and silky ganache were sensational. Nobody could believe it was plant-based!",
    recommend: true,
    status: "featured",
    verified_buyer: true,
    admin_reply: "Delighted to hear this Liam! Perfecting our dairy-free and vegan recipes took months of testing so they taste every bit as luxurious as traditional bakes.",
    admin_replied_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "review-seed-3",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    name: "Charlotte & Dominic",
    email: "charlotte.w@example.com",
    location: "Guildford, Surrey",
    rating: 5,
    occasion: "Tasting Box",
    flavour: "6-Flavour Seasonal Tasting Collection",
    review_text:
      "We ordered a tasting box before committing to our 2026 wedding cake. It arrived chilled and presented like luxury jewellery on Saturday morning. The Pistachio Raspberry was an instant winner. Booking our wedding tiers right away!",
    recommend: true,
    status: "featured",
    verified_buyer: true,
  },
  {
    id: "review-seed-4",
    created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    name: "Amina Al-Mansoor",
    email: "amina.events@example.com",
    location: "Mayfair, Central London",
    rating: 5,
    occasion: "Corporate",
    flavour: "Salted Caramel Espresso & Sharp Fondant Architecture",
    review_text:
      "Flawless corporate event catering for our gallery gala in Mayfair. On-time delivery, pristine architectural edges, and prompt invoicing through the online payment portal. Exceptionally professional team.",
    recommend: true,
    status: "approved",
    verified_buyer: true,
  },
];

function generateReviewId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "rev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
}

function broadcastReviewsUpdate() {
  if (typeof window === "undefined") return;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(BROADCAST_REVIEWS_CHANNEL);
      channel.postMessage({ type: "reviews_updated", timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // Ignore
  }

  try {
    window.dispatchEvent(new CustomEvent("redycakes_reviews_event", { detail: { timestamp: Date.now() } }));
  } catch {
    // Ignore
  }
}

/**
 * Retrieve local reviews
 */
export function getLocalReviews(): CustomerReview[] {
  if (typeof window === "undefined") return INITIAL_SEED_REVIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(INITIAL_SEED_REVIEWS));
      return INITIAL_SEED_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SEED_REVIEWS;
  } catch {
    return INITIAL_SEED_REVIEWS;
  }
}

/**
 * Save reviews to localStorage
 */
function saveLocalReviews(reviews: CustomerReview[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.debug("[Reviews] Local save note:", err);
  }
}

/**
 * Fetch all reviews (Supabase with local fallback)
 */
export async function fetchAllReviews(): Promise<CustomerReview[]> {
  try {
    const { data, error } = await supabase
      .from("customer_reviews" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: CustomerReview[] = data.map((r: any) => ({
        id: r.id,
        created_at: r.created_at || new Date().toISOString(),
        name: r.name,
        email: r.email,
        location: r.location || "",
        rating: Number(r.rating) || 5,
        occasion: (r.occasion || "Celebration") as ExperienceOccasion,
        flavour: r.flavour || "",
        review_text: r.review_text || r.review || "",
        recommend: r.recommend !== false,
        status: (r.status || "approved") as FeedbackStatus,
        admin_reply: r.admin_reply || undefined,
        admin_replied_at: r.admin_replied_at || undefined,
        verified_buyer: !!r.verified_buyer,
      }));

      saveLocalReviews(mapped);
      return mapped;
    }
  } catch (err) {
    console.debug("[Reviews] Supabase fetch note:", err);
  }

  return getLocalReviews();
}

/**
 * Fetch approved/featured reviews for public storefront display
 */
export async function fetchPublicReviews(): Promise<CustomerReview[]> {
  const all = await fetchAllReviews();
  return all.filter((r) => r.status === "approved" || r.status === "featured");
}

/**
 * Submit new customer feedback / review (strictly text-only, no images)
 */
export async function submitCustomerReview(params: {
  name: string;
  email: string;
  location?: string;
  rating: number;
  occasion: ExperienceOccasion;
  flavour?: string;
  review_text: string;
  recommend: boolean;
}): Promise<CustomerReview> {
  const id = generateReviewId();
  const now = new Date().toISOString();

  const newReview: CustomerReview = {
    id,
    created_at: now,
    name: params.name.trim(),
    email: params.email.trim(),
    location: params.location?.trim() || "",
    rating: Math.max(1, Math.min(5, Math.round(params.rating))),
    occasion: params.occasion,
    flavour: params.flavour?.trim() || "",
    review_text: params.review_text.trim(),
    recommend: params.recommend,
    status: "approved", // Auto-approved for instant visibility; can be moderated in CMS
    verified_buyer: true,
  };

  // 1. Local-first persistence
  const existing = getLocalReviews();
  const updated = [newReview, ...existing.filter((r) => r.id !== id)];
  saveLocalReviews(updated);

  // 2. Persist to Supabase if configured
  try {
    await supabase.from("customer_reviews" as any).upsert({
      id: newReview.id,
      name: newReview.name,
      email: newReview.email,
      location: newReview.location,
      rating: newReview.rating,
      occasion: newReview.occasion,
      flavour: newReview.flavour,
      review_text: newReview.review_text,
      recommend: newReview.recommend,
      status: newReview.status,
      created_at: newReview.created_at,
      verified_buyer: true,
    });
  } catch (err) {
    console.debug("[Reviews] Supabase upsert note:", err);
  }

  // 3. Dispatch notification via Hostinger SMTP (smtp.hostinger.com:465) copying sender
  try {
    const starString = "★".repeat(newReview.rating) + "☆".repeat(5 - newReview.rating);
    await sendEmailViaHostingerSmtp({
      to: REDYCAKES_CONTACT_EMAIL,
      cc: newReview.email, // Copies the reviewer
      replyTo: newReview.email,
      subject: `[New Customer Review] ${starString} (${newReview.rating}/5) from ${newReview.name}`,
      message: [
        `New customer review submitted for Redycakes!`,
        ``,
        `Rating: ${newReview.rating} / 5 stars`,
        `Reviewer: ${newReview.name} (${newReview.email})`,
        `Location: ${newReview.location || "N/A"}`,
        `Occasion: ${newReview.occasion}`,
        `Flavour/Style: ${newReview.flavour || "Bespoke"}`,
        `Would Recommend: ${newReview.recommend ? "Yes" : "No"}`,
        ``,
        `Review:`,
        `"${newReview.review_text}"`,
        ``,
        `Manage reviews in CMS: https://www.redycakes.org/cms`,
      ].join("\n"),
      visitorName: newReview.name,
      visitorEmail: newReview.email,
    });
  } catch (emailErr) {
    console.debug("[Reviews Email] Dispatch notice:", emailErr);
  }

  broadcastReviewsUpdate();
  return newReview;
}

/**
 * Update review status in CMS (approved, featured, archived, pending)
 */
export async function updateReviewStatus(
  reviewId: string,
  status: FeedbackStatus
): Promise<boolean> {
  const existing = getLocalReviews();
  const updated = existing.map((r) => (r.id === reviewId ? { ...r, status } : r));
  saveLocalReviews(updated);

  try {
    await supabase.from("customer_reviews" as any).update({ status }).eq("id", reviewId);
  } catch (err) {
    console.debug("[Reviews] Supabase status update note:", err);
  }

  broadcastReviewsUpdate();
  return true;
}

/**
 * Add or update Studio public reply to a review
 */
export async function addReviewStudioReply(
  reviewId: string,
  replyText: string
): Promise<boolean> {
  const existing = getLocalReviews();
  const now = new Date().toISOString();
  const updated = existing.map((r) =>
    r.id === reviewId
      ? { ...r, admin_reply: replyText.trim(), admin_replied_at: now }
      : r
  );
  saveLocalReviews(updated);

  try {
    await supabase
      .from("customer_reviews" as any)
      .update({
        admin_reply: replyText.trim(),
        admin_replied_at: now,
      })
      .eq("id", reviewId);
  } catch (err) {
    console.debug("[Reviews] Supabase studio reply note:", err);
  }

  broadcastReviewsUpdate();
  return true;
}

/**
 * Delete a review
 */
export async function deleteCustomerReview(reviewId: string): Promise<boolean> {
  const existing = getLocalReviews();
  const updated = existing.filter((r) => r.id !== reviewId);
  saveLocalReviews(updated);

  try {
    await supabase.from("customer_reviews" as any).delete().eq("id", reviewId);
  } catch (err) {
    console.debug("[Reviews] Supabase delete note:", err);
  }

  broadcastReviewsUpdate();
  return true;
}

/**
 * Compute aggregate statistics for ratings
 */
export function calculateReviewStats(reviews: CustomerReview[]) {
  const total = reviews.length;
  if (total === 0) {
    return {
      average: 5.0,
      totalCount: 0,
      recommendPercentage: 100,
      ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Number((sum / total).toFixed(2));
  const recommendCount = reviews.filter((r) => r.recommend).length;
  const recommendPercentage = Math.round((recommendCount / total) * 100);

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const val = Math.max(1, Math.min(5, Math.round(r.rating)));
    ratingCounts[val] = (ratingCounts[val] || 0) + 1;
  }

  return {
    average,
    totalCount: total,
    recommendPercentage,
    ratingCounts,
  };
}
