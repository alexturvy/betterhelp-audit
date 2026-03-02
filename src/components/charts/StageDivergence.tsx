"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { siteData } from "@/lib/data";
import SourceNote from "../shared/SourceNote";

export default function StageDivergence() {
  // Pivot: merge Pricing and Ongoing into same rows by yearMonth
  const byMonth: Record<string, any> = {};
  for (const row of siteData.stageMonthly) {
    if (!byMonth[row.yearMonth]) byMonth[row.yearMonth] = { yearMonth: row.yearMonth };
    if (row.stage === "Pricing/Payment") {
      byMonth[row.yearMonth].pricing = row.meanRating;
      byMonth[row.yearMonth].pricingN = row.nReviews;
    } else if (row.stage === "Ongoing Sessions") {
      byMonth[row.yearMonth].ongoing = row.meanRating;
      byMonth[row.yearMonth].ongoingN = row.nReviews;
    }
  }

  const data = Object.values(byMonth)
    .filter((d: any) => d.pricing != null && d.ongoing != null)
    .sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth));

  return (
    <div className="chart-container">
      <h3 className="mb-1">Stage Divergence: Pricing vs. Ongoing Sessions</h3>
      <p className="text-sm text-text-muted mb-4">
        Monthly ratings for the two largest journey stages, last 24 months.
      </p>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const parts = v.split("-");
                return `${parts[1]}/${parts[0].slice(2)}`;
              }}
            />
            <YAxis
              domain={[2.5, 5.2]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d?.yearMonth}</p>
                    {d?.ongoing != null && (
                      <p className="text-sm" style={{ color: "#2e7d5b" }}>
                        Ongoing: <span className="font-mono">{d.ongoing.toFixed(2)}</span>{" "}
                        <span className="text-text-muted">(n={d.ongoingN})</span>
                      </p>
                    )}
                    {d?.pricing != null && (
                      <p className="text-sm" style={{ color: "#c44d4d" }}>
                        Pricing: <span className="font-mono">{d.pricing.toFixed(2)}</span>{" "}
                        <span className="text-text-muted">(n={d.pricingN})</span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={30}
              formatter={(value: string) =>
                value === "ongoing" ? "Ongoing Sessions" : "Pricing/Payment"
              }
            />
            <Line
              type="monotone"
              dataKey="ongoing"
              stroke="#2e7d5b"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: "#2e7d5b" }}
              name="ongoing"
            />
            <Line
              type="monotone"
              dataKey="pricing"
              stroke="#c44d4d"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: "#c44d4d" }}
              name="pricing"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SourceNote>
        Filtered to months with &ge;3 reviews per stage.
      </SourceNote>
    </div>
  );
}
