import { useState, useMemo } from "react";
import { Star, X, CheckCircle2, MessageSquareHeart, Sparkles, Send, ShieldCheck, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import {
  submitCustomerReview,
  type CustomerReview,
  type ExperienceOccasion,
} from "@/lib/feedbackService";
import { useOccasionsAndStyles } from "@/lib/occasionStyleService";
import { trackEvent } from "@/lib/analytics";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (review: CustomerReview) => void;
  defaultOccasion?: ExperienceOccasion;
}

const OCCASIONS: ExperienceOccasion[] = [
  "Wedding",
  "Birthday",
  "Celebration",
  "Tasting Box",
  "Dietary-Friendly",
  "Corporate",
  "Other",
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Disappointing",
  2: "Could be improved",
  3: "Good experience",
  4: "Wonderful cake",
  5: "Exceptional / 5-Star Experience",
};

export function ReviewModal({
  isOpen,
  onClose,
  onSuccess,
  defaultOccasion = "Celebration",
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [occasion, setOccasion] = useState<ExperienceOccasion>(defaultOccasion);
  const [flavour, setFlavour] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [recommend, setRecommend] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<CustomerReview | null>(null);

  const { activeOccasions } = useOccasionsAndStyles();
  const occasionOptions = useMemo(() => {
    const names = activeOccasions.map((o) => o.name);
    return Array.from(new Set([...names, ...OCCASIONS]));
  }, [activeOccasions]);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      toast.error("Please write at least a sentence (min 10 characters) about your experience.");
      return;
    }

    setIsSubmitting(true);
    try {
      const review = await submitCustomerReview({
        name,
        email,
        location: location.trim() || undefined,
        rating,
        occasion,
        flavour: flavour.trim() || undefined,
        review_text: reviewText,
        recommend,
      });

      trackEvent("review_submitted", { rating, occasion });

      setIsSubmitted(true);
      setSubmittedReview(review);
      if (onSuccess) onSuccess(review);
      toast.success("Thank you for your review!", {
        description: "Your review has been recorded and a copy was sent to your email.",
      });
    } catch (err) {
      console.error("[ReviewModal] Submit error:", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setName("");
    setEmail("");
    setLocation("");
    setFlavour("");
    setReviewText("");
    setRating(5);
    setRecommend(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-soft overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute right-5 top-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-10"
          aria-label="Close review dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {isSubmitted ? (
          /* Success Screen */
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-4 my-auto animate-in zoom-in-95 duration-200">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2 max-w-md">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Verified Customer Feedback
              </span>
              <h2 id="review-modal-title" className="font-display text-2xl md:text-3xl font-semibold text-foreground">
                Thank you, {submittedReview?.name || name}!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your feedback means the world to our studio. Your review is now live and a confirmation copy has been sent to <span className="font-semibold text-foreground">{submittedReview?.email || email}</span> via Hostinger SMTP.
              </p>
            </div>

            <div className="w-full max-w-md p-4 rounded-2xl bg-secondary/30 border border-border/60 text-left space-y-2 mt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Your Rating:</span>
                <span className="text-amber-500 font-bold">
                  {"★".repeat(submittedReview?.rating || rating)} ({(submittedReview?.rating || rating)}/5)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Occasion:</span>
                <span className="text-muted-foreground">{submittedReview?.occasion || occasion}</span>
              </div>
              {submittedReview?.flavour && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Flavour/Style:</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">{submittedReview.flavour}</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="btn btn-primary w-full py-3"
              >
                Close & Return to Gallery
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <>
            <div className="pb-4 border-b border-border/70 pr-8">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="review-modal-title" className="font-display text-xl md:text-2xl font-semibold text-foreground">
                    Rate Your Experience
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Share your story with fellow celebration hosts across London & Surrey.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Star Rating Selector */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 text-center space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overall Rating <span className="text-rose-500">*</span>
                </label>
                <div
                  className="flex items-center justify-center gap-2 py-1"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const active = starVal <= currentDisplayRating;
                    return (
                      <button
                        type="button"
                        key={starVal}
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                        aria-label={`Rate ${starVal} out of 5 stars`}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                              : "text-muted-foreground/30 fill-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-semibold text-primary transition-all">
                  {RATING_DESCRIPTIONS[currentDisplayRating]} ({currentDisplayRating}/5)
                </p>
              </div>

              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah & Tom M."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Never shown publicly; confirmation sent here.
                  </span>
                </div>
              </div>

              {/* Occasion & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Occasion / Experience
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value as ExperienceOccasion)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {occasionOptions.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Location / Borough <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Richmond, Surrey or London"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Flavour / Style */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Cake Flavour or Design Style <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={flavour}
                  onChange={(e) => setFlavour(e.target.value)}
                  placeholder="e.g. Madagascan Vanilla & Elderflower, Valrhona Chocolate, Botanical Tiers"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Written Review (Text-Only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Written Review <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {reviewText.trim().length} chars
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about the flavour, presentation, guest reactions, and delivery experience..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Text-only review format (no image uploads required)
                  </span>
                  <span>Minimum 10 characters</span>
                </div>
              </div>

              {/* Would you recommend */}
              <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    Would you recommend Redycakes to friends or family?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecommend(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      recommend
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes, definitely!
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecommend(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      !recommend
                        ? "bg-muted-foreground text-background shadow-soft"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  disabled={isSubmitting}
                  className="btn btn-secondary px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary px-6 py-2.5 text-sm flex items-center gap-2 shadow-soft hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
