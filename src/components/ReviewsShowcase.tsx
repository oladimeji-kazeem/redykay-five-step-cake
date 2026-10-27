import { useState, useEffect, useMemo } from "react";
import { Star, MessageSquarePlus, CheckCircle2, Sparkles, MessageCircle, Heart, Quote } from "lucide-react";
import {
  fetchPublicReviews,
  calculateReviewStats,
  type CustomerReview,
  type ExperienceOccasion,
} from "@/lib/feedbackService";
import { ReviewModal } from "@/components/ReviewModal";

interface ReviewsShowcaseProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  defaultOccasion?: ExperienceOccasion;
  showWriteButton?: boolean;
  limit?: number;
  className?: string;
}

export function ReviewsShowcase({
  title = "Words from Happy Celebrations",
  subtitle = "Every tier is baked fresh from scratch in our Surrey studio. Read authentic stories from couples, hosts, and party planners.",
  eyebrow = "Verified Experiences",
  defaultOccasion,
  showWriteButton = true,
  limit,
  className = "",
}: ReviewsShowcaseProps) {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOccasion, setSelectedOccasion] = useState<string>(defaultOccasion || "All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load reviews from local/supabase
  const loadReviews = async () => {
    try {
      const data = await fetchPublicReviews();
      setReviews(data);
    } catch (err) {
      console.debug("[ReviewsShowcase] Fetch note:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    // Listen to real-time custom event
    const handleUpdate = () => {
      loadReviews();
    };

    window.addEventListener("redycakes_reviews_event", handleUpdate);
    return () => {
      window.removeEventListener("redycakes_reviews_event", handleUpdate);
    };
  }, []);

  // Compute aggregate metrics
  const stats = useMemo(() => calculateReviewStats(reviews), [reviews]);

  // Occasions list for filters
  const occasionsList = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.occasion) set.add(r.occasion);
    });
    return ["All", ...Array.from(set)];
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (selectedOccasion !== "All") {
      list = list.filter((r) => r.occasion === selectedOccasion);
    }
    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }
    return list;
  }, [reviews, selectedOccasion, limit]);

  return (
    <section id="reviews" className={`py-20 border-y border-border/70 bg-gradient-to-b from-secondary/40 via-accent/25 to-background ${className}`}>
      <div className="container-page">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-5xl text-foreground font-display">
              {title}
            </h2>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Aggregate Rating Badge & Write Review Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-sm">
              <div className="flex flex-col items-center justify-center px-2 border-r border-border/70">
                <span className="font-display text-2xl font-bold text-foreground">
                  {stats.average > 0 ? stats.average.toFixed(1) : "5.0"}
                </span>
                <div className="flex text-amber-400 text-xs">
                  {"★★★★★".slice(0, Math.round(stats.average || 5))}
                </div>
              </div>
              <div className="text-xs space-y-0.5 pr-2">
                <p className="font-semibold text-foreground">
                  {stats.totalCount} {stats.totalCount === 1 ? "Review" : "Customer Reviews"}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-primary">{stats.recommendPercentage}%</span> recommend Redycakes
                </p>
              </div>
            </div>

            {showWriteButton && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary py-3 px-5 flex items-center gap-2 shadow-soft hover:opacity-95"
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span>Write a Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        {occasionsList.length > 2 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-semibold text-muted-foreground mr-1">
              Filter by:
            </span>
            {occasionsList.map((occ) => {
              const active = selectedOccasion === occ;
              const count =
                occ === "All"
                  ? reviews.length
                  : reviews.filter((r) => r.occasion === occ).length;
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setSelectedOccasion(occ)}
                  className={`chip transition-all text-xs py-1.5 px-3 rounded-full ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-soft"
                      : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {occ} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-3xl border border-border/60 bg-card/50 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => {
              const dateStr = new Date(review.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <article
                  key={review.id}
                  className="relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 md:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
                >
                  <div>
                    {/* Top row: Star rating + Occasion tag */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                          {review.occasion}
                        </span>
                        {review.verified_buyer && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            title="Verified Cake Customer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Flavour / Style Tag */}
                    {review.flavour && (
                      <p className="text-xs font-semibold text-primary mb-2 line-clamp-1">
                        🍰 {review.flavour}
                      </p>
                    )}

                    {/* Review text */}
                    <p className="font-display text-base leading-relaxed text-foreground relative z-10 italic">
                      “{review.review_text}”
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {review.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {review.location ? `${review.location} · ` : ""}
                          {dateStr}
                        </p>
                      </div>
                      {review.recommend && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Heart className="h-3 w-3 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                          Recommends
                        </span>
                      )}
                    </div>

                    {/* Official Studio Public Reply */}
                    {review.admin_reply && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-secondary/60 border border-primary/20 text-xs space-y-1.5 animate-in fade-in duration-300">
                        <div className="flex items-center gap-1.5 text-primary font-semibold">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Studio Response from Redycakes:</span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed italic">
                          "{review.admin_reply}"
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 text-center py-12 rounded-3xl border border-dashed border-border/80 bg-card/40 p-8">
            <Quote className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">
              No reviews in this category yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Be the first to share your experience with our bespoke {selectedOccasion.toLowerCase()} cakes!
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary mt-4 py-2.5 px-5 text-sm"
            >
              Write First Review
            </button>
          </div>
        )}
      </div>

      {/* Text-Only Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadReviews();
        }}
        defaultOccasion={
          selectedOccasion !== "All"
            ? (selectedOccasion as ExperienceOccasion)
            : defaultOccasion
        }
      />
    </section>
  );
}
