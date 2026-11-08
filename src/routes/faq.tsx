import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { CtaBand, PageHero, seo } from "@/components/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/faq")({
  head: () => seo("FAQ — Redycakes", "Lead times, deposits, changes, delivery and allergens — answered warmly and upfront."),
  component: Faq,
});

function Faq() {
  const { content } = useSiteContent();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Only show active FAQs
  const activeFaqs = useMemo(() => {
    const list = Array.isArray(content.faq) ? content.faq : [];
    return list.filter((f) => f.isActive !== false);
  }, [content.faq]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeFaqs.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ["All", ...Array.from(set)];
  }, [activeFaqs]);

  // Filtered FAQs based on category and search
  const filteredFaqs = useMemo(() => {
    return activeFaqs.filter((f) => {
      const matchCategory =
        selectedCategory === "All" || f.category === selectedCategory;
      const qLower = (f.q || "").toLowerCase();
      const aLower = (f.a || "").toLowerCase();
      const sLower = searchQuery.toLowerCase().trim();
      const matchSearch = !sLower || qLower.includes(sLower) || aLower.includes(sLower);
      return matchCategory && matchSearch;
    });
  }, [activeFaqs, selectedCategory, searchQuery]);

  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Helpful answers, upfront."
        intro="Anything else? Just ask — there are no silly questions about cake."
      />

      <section className="container-page max-w-3xl pb-16 space-y-8">
        {/* Search & Category Filter Toolbar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. delivery, allergies, deposit)..."
              className="w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FAQs Accordion List */}
        <div className="divide-y divide-border/80 border-y border-border/80">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((f, idx) => (
              <details key={f.id || f.q || idx} className="group py-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-xl transition-colors hover:text-primary">
                  <div className="space-y-1 text-left">
                    {f.category && f.category !== "General" && (
                      <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {f.category}
                      </span>
                    )}
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {f.q}
                    </h3>
                  </div>
                  <span className="text-2xl font-semibold text-primary transition-transform duration-200 group-open:rotate-45 shrink-0 mt-0.5">
                    +
                  </span>
                </summary>
                <div className="mt-3 text-muted-foreground leading-relaxed pl-0.5 text-base whitespace-pre-line">
                  {f.a}
                </div>
              </details>
            ))
          ) : (
            <div className="py-12 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-medium text-foreground">No questions found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Feel free to enquire or message us directly!
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="btn btn-secondary !py-1.5 !px-3 text-xs"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
