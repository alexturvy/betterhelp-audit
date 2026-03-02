"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { siteData, type QuoteReview } from "@/lib/data";

const RATING_COLORS: Record<number, string> = {
  1: "bg-negative text-white",
  2: "bg-negative/70 text-white",
  3: "bg-text-muted/30 text-foreground",
  4: "bg-positive/70 text-white",
  5: "bg-positive text-white",
};

const ERA_COLORS: Record<string, string> = {
  "Pre-FTC": "bg-accent-light text-accent",
  "FTC Settlement": "bg-amber-100 text-amber-800",
  "Post-FTC Recovery": "bg-blue-50 text-blue-700",
  "Insurance Expansion": "bg-purple-50 text-purple-700",
};

function ReviewMiniCard({ review }: { review: QuoteReview }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${RATING_COLORS[review.rating] || ""}`}
        >
          {review.rating}★
        </span>
        <span className="text-xs font-mono text-text-muted">{review.date}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${ERA_COLORS[review.era] || "bg-gray-100 text-gray-600"}`}
        >
          {review.era}
        </span>
      </div>
      <p className="text-sm text-text-body leading-relaxed mb-0">
        {review.text}
      </p>
    </div>
  );
}

function ContrastLayout({
  reviews,
  contrastReviews,
}: {
  reviews: QuoteReview[];
  contrastReviews: QuoteReview[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-semibold text-positive mb-3">
          Ongoing Sessions (5★)
        </h4>
        <div className="divide-y divide-border">
          {reviews.map((r, i) => (
            <ReviewMiniCard key={i} review={r} />
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-negative mb-3">
          Cancellation/Churn (1★)
        </h4>
        <div className="divide-y divide-border">
          {contrastReviews.map((r, i) => (
            <ReviewMiniCard key={i} review={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function QuoteDrawer({
  drawerId,
  linkText = "see the reviews",
}: {
  drawerId: string;
  linkText?: string;
}) {
  const [open, setOpen] = useState(false);
  const drawer = siteData.quoteDrawers[drawerId];

  if (!drawer) return null;

  const isContrast = drawerId === "twostargap-contrast";

  return (
    <div className="border-l-2 border-accent/20 pl-4 my-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-accent hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 group"
        aria-expanded={open}
      >
        <span>{linkText}</span>
        <span
          className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          →
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {isContrast && drawer.contrastReviews ? (
                <ContrastLayout
                  reviews={drawer.reviews}
                  contrastReviews={drawer.contrastReviews}
                />
              ) : (
                <div className="divide-y divide-border">
                  {drawer.reviews.map((r, i) => (
                    <ReviewMiniCard key={i} review={r} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
