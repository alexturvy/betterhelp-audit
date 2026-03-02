"use client";

import { siteData } from "@/lib/data";
import SourceNote from "../shared/SourceNote";

const SELECTED_TOPICS = [2, 15, 1, 7, 17, 8, 13, 5];

export default function TopicDumbbell() {
  const topics = siteData.topics
    .filter((t) => SELECTED_TOPICS.includes(t.id))
    .sort((a, b) => {
      const shiftA = a.prevalence.insurance - a.prevalence.preFTC;
      const shiftB = b.prevalence.insurance - b.prevalence.preFTC;
      return shiftB - shiftA;
    });

  const maxPrev = Math.max(
    ...topics.flatMap((t) => [t.prevalence.preFTC, t.prevalence.insurance])
  );
  const scale = (v: number) => (v / (maxPrev * 1.15)) * 100;

  return (
    <div className="chart-container">
      <h3 className="mb-1">Topic Prevalence Shift: Pre-FTC vs. Insurance Era</h3>
      <p className="text-sm text-text-muted mb-4">
        Comparing topic prevalence before and after the FTC complaint.
      </p>

      <div className="flex gap-4 text-xs text-text-muted mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#1a7a6d]" />
          Pre-FTC
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#c44d4d]" />
          Insurance Era
        </div>
      </div>

      <div className="space-y-5">
        {topics.map((t) => {
          const shift = t.prevalence.insurance - t.prevalence.preFTC;
          const pctChange = ((shift / t.prevalence.preFTC) * 100).toFixed(0);
          const isIncrease = shift > 0;

          return (
            <div key={t.id} className="group">
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-sm font-medium text-foreground">
                  {t.label}
                </div>
                <div
                  className={`text-xs font-mono ${isIncrease ? "text-negative" : "text-positive"}`}
                >
                  {isIncrease ? "+" : ""}
                  {pctChange}%
                </div>
              </div>
              <div className="text-xs text-text-muted mb-2">
                {t.frex.slice(0, 4).join(", ")}
              </div>
              <div className="relative h-5">
                {/* Track */}
                <div className="absolute top-1/2 -translate-y-1/2 h-[2px] bg-border w-full rounded" />
                {/* Connection line */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded"
                  style={{
                    left: `${Math.min(scale(t.prevalence.preFTC), scale(t.prevalence.insurance))}%`,
                    width: `${Math.abs(scale(t.prevalence.insurance) - scale(t.prevalence.preFTC))}%`,
                    background: isIncrease
                      ? "linear-gradient(90deg, #1a7a6d, #c44d4d)"
                      : "linear-gradient(90deg, #c44d4d, #1a7a6d)",
                  }}
                />
                {/* Pre dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#1a7a6d] border-2 border-white"
                  style={{ left: `${scale(t.prevalence.preFTC)}%` }}
                />
                {/* Post dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#c44d4d] border-2 border-white"
                  style={{ left: `${scale(t.prevalence.insurance)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <SourceNote>
        Structural Topic Model (K=20). Prevalence = proportion of corpus assigned to topic.
      </SourceNote>
    </div>
  );
}
