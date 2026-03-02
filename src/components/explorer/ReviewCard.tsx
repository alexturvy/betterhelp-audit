"use client";

import { useState } from "react";
import type { ExplorerReview } from "@/lib/data";

const RATING_COLORS: Record<number, string> = {
  1: "bg-negative text-white",
  2: "bg-negative/70 text-white",
  3: "bg-text-muted/30 text-foreground",
  4: "bg-positive/70 text-white",
  5: "bg-positive text-white",
};

const ERA_BORDER: Record<string, string> = {
  "Pre-FTC": "border-l-accent",
  "FTC Settlement": "border-l-amber-400",
  "Post-FTC Recovery": "border-l-blue-400",
  "Insurance Expansion": "border-l-purple-400",
};

const TRUNCATE_LEN = 200;

export default function ReviewCard({ review }: { review: ExplorerReview }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = review.text.length > TRUNCATE_LEN;
  const displayText =
    expanded || !needsTruncation
      ? review.text
      : review.text.slice(0, review.text.lastIndexOf(" ", TRUNCATE_LEN)) + "…";

  return (
    <div
      className={`review-card border-l-2 ${ERA_BORDER[review.era] || "border-l-border"} bg-card rounded-r-lg p-4 border border-border border-l-0`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${RATING_COLORS[review.rating] || ""}`}
        >
          {review.rating}★
        </span>
        <span className="text-xs font-mono text-text-muted">{review.date}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-background text-text-muted">
          {review.stage}
        </span>
      </div>
      <p className="text-sm text-text-body leading-relaxed mb-0">
        {displayText}
        {needsTruncation && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-accent text-sm hover:text-foreground transition-colors cursor-pointer"
          >
            {expanded ? "show less" : "read more"}
          </button>
        )}
      </p>
    </div>
  );
}
