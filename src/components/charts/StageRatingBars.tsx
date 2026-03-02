"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { siteData } from "@/lib/data";
import SourceNote from "../shared/SourceNote";

function ratingColor(r: number) {
  if (r >= 4.5) return "#3d8b5e";
  if (r >= 4.0) return "#6dab8e";
  if (r >= 3.5) return "#9CA3AF";
  if (r >= 3.0) return "#d4816b";
  return "#c44d4d";
}

export default function StageRatingBars() {
  const data = [...siteData.stageRatings].sort(
    (a, b) => a.meanRating - b.meanRating
  );

  return (
    <div className="chart-container">
      <h3 className="mb-1">Average Rating by Customer Journey Stage</h3>
      <p className="text-sm text-text-muted mb-4">
        Reviews classified into 8 stages of the customer journey.
      </p>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 50, bottom: 5, left: 130 }}
          >
            <XAxis
              type="number"
              domain={[1, 5]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="stage"
              tick={{ fontSize: 12 }}
              width={120}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.stage}</p>
                    <p className="font-mono">
                      {d.meanRating.toFixed(2)} avg ({d.n.toLocaleString()} reviews)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="meanRating" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={ratingColor(entry.meanRating)} />
              ))}
              <LabelList
                dataKey="meanRating"
                position="right"
                formatter={(v) => Number(v).toFixed(2)}
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  fill: "#374151",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SourceNote>
        Cancellation/Churn (2.69) vs. Ongoing Sessions (4.82) &mdash; a 2.13-star gap between the worst and best stages.
      </SourceNote>
    </div>
  );
}
