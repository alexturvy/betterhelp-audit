"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import SectionWrapper from "../shared/SectionWrapper";
import ScrollReveal from "../shared/ScrollReveal";
import ReviewCard from "../explorer/ReviewCard";
import FilterBar, {
  type FilterState,
  INITIAL_FILTERS,
} from "../explorer/FilterBar";
import { BASE_PATH, type ExplorerReview } from "@/lib/data";

const PAGE_SIZE = 50;

function SkeletonCard() {
  return (
    <div className="border-l-2 border-border bg-card rounded-r-lg p-4 border border-l-0 animate-pulse">
      <div className="flex gap-2 mb-2">
        <div className="h-5 w-8 bg-border rounded" />
        <div className="h-5 w-16 bg-border rounded" />
        <div className="h-5 w-24 bg-border rounded" />
      </div>
      <div className="h-4 w-full bg-border rounded mb-1.5" />
      <div className="h-4 w-3/4 bg-border rounded" />
    </div>
  );
}

export default function DataExplorer() {
  const [reviews, setReviews] = useState<ExplorerReview[] | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Lazy-load reviews when section enters viewport
  useEffect(() => {
    if (fetchedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchedRef.current = true;
          observer.disconnect();
          fetch(`${BASE_PATH}/data/reviews.json`)
            .then((r) => r.json())
            .then((data: ExplorerReview[]) => setReviews(data))
            .catch(() => setError(true));
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset visible count when filters change
  const handleFilterChange = useCallback((f: FilterState) => {
    setFilters(f);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    if (!reviews) return [];
    let result = reviews;

    if (filters.stars.size > 0)
      result = result.filter((r) => filters.stars.has(r.rating));
    if (filters.eras.size > 0)
      result = result.filter((r) => filters.eras.has(r.era));
    if (filters.stages.size > 0)
      result = result.filter((r) => filters.stages.has(r.stage));
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter((r) => r.text.toLowerCase().includes(kw));
    }

    // Sort — reviews.json is ordered newest-first from pipeline
    switch (filters.sort) {
      case "oldest":
        result = [...result].reverse();
        break;
      case "highest":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        result = [...result].sort((a, b) => a.rating - b.rating);
        break;
      // "newest" is default order
    }

    return result;
  }, [reviews, filters]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div id="explorer" ref={sentinelRef}>
      <SectionWrapper wide>
        <ScrollReveal>
          <div className="border-t border-border pt-10">
            <h2>Explore the Data</h2>
            <p>
              Every claim above is grounded in {reviews?.length?.toLocaleString() || "9,064"} real reviews. Browse, filter, and search the full dataset.
            </p>
          </div>
        </ScrollReveal>

        {error && (
          <div className="text-center py-12 text-text-muted">
            <p>Failed to load review data. Try refreshing the page.</p>
          </div>
        )}

        {!reviews && !error && (
          <div className="space-y-3 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {reviews && (
          <>
            <div className="mt-6 mb-6">
              <FilterBar
                filters={filters}
                onChange={handleFilterChange}
                totalCount={reviews.length}
                filteredCount={filtered.length}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <p className="mb-2">No reviews match your filters.</p>
                <button
                  onClick={() => handleFilterChange(INITIAL_FILTERS)}
                  className="text-accent hover:text-foreground transition-colors cursor-pointer text-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {visible.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() =>
                        setVisibleCount((c) => c + PAGE_SIZE)
                      }
                      className="px-5 py-2 text-sm border border-border rounded-lg bg-card text-accent hover:border-accent transition-colors cursor-pointer"
                    >
                      Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)}{" "}
                      more
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </SectionWrapper>
    </div>
  );
}
