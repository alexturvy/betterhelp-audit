"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STARS = [1, 2, 3, 4, 5] as const;
const ERAS = [
  "Pre-FTC",
  "FTC Settlement",
  "Post-FTC Recovery",
  "Insurance Expansion",
] as const;
const STAGES = [
  "Ongoing Sessions",
  "Matching",
  "Pricing/Payment",
  "Cancellation/Churn",
  "First Session",
  "Signup/Intake",
  "Therapist Switching",
  "General/Multiple",
] as const;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export interface FilterState {
  stars: Set<number>;
  eras: Set<string>;
  stages: Set<string>;
  keyword: string;
  sort: SortOption;
}

export const INITIAL_FILTERS: FilterState = {
  stars: new Set(),
  eras: new Set(),
  stages: new Set(),
  keyword: "",
  sort: "newest",
};

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
        active
          ? "bg-accent text-white border-accent"
          : "bg-card text-text-muted border-border hover:border-accent/40"
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const [localKeyword, setLocalKeyword] = useState(filters.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKeyword = useCallback(
    (val: string) => {
      setLocalKeyword(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, keyword: val });
      }, 300);
    },
    [filters, onChange]
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const toggleSet = <T,>(set: Set<T>, val: T): Set<T> => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  };

  const hasActiveFilters =
    filters.stars.size > 0 ||
    filters.eras.size > 0 ||
    filters.stages.size > 0 ||
    filters.keyword.length > 0;

  return (
    <div className="space-y-3">
      {/* Row 1: Stars + Search + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted font-medium mr-1">Rating</span>
          {STARS.map((s) => (
            <TogglePill
              key={s}
              label={`${s}★`}
              active={filters.stars.has(s)}
              onClick={() =>
                onChange({ ...filters, stars: toggleSet(filters.stars, s) })
              }
            />
          ))}
        </div>

        <div className="flex-1 min-w-[180px] max-w-xs relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search reviews…"
            value={localKeyword}
            onChange={(e) => handleKeyword(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card text-text-body placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ ...filters, sort: e.target.value as SortOption })
          }
          className="text-sm border border-border rounded-lg bg-card text-text-body px-2.5 py-1.5 focus:outline-none focus:border-accent"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Eras */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-muted font-medium mr-1">Era</span>
        {ERAS.map((e) => (
          <TogglePill
            key={e}
            label={e}
            active={filters.eras.has(e)}
            onClick={() =>
              onChange({ ...filters, eras: toggleSet(filters.eras, e) })
            }
          />
        ))}
      </div>

      {/* Row 3: Stages */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-muted font-medium mr-1">Stage</span>
        {STAGES.map((s) => (
          <TogglePill
            key={s}
            label={s}
            active={filters.stages.has(s)}
            onClick={() =>
              onChange({ ...filters, stages: toggleSet(filters.stages, s) })
            }
          />
        ))}
      </div>

      {/* Count + Clear */}
      <div className="flex items-center gap-3 text-xs text-text-muted pt-1">
        <span className="font-mono">
          Showing {filteredCount.toLocaleString()} of{" "}
          {totalCount.toLocaleString()} reviews
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setLocalKeyword("");
              onChange(INITIAL_FILTERS);
            }}
            className="text-accent hover:text-foreground transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
