"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { siteData } from "@/lib/data";
import EraMarkers, { EraLegend } from "../shared/EraMarkers";
import SourceNote from "../shared/SourceNote";

export default function RatingTimeline() {
  const data = siteData.monthly;

  return (
    <div className="chart-container">
      <h3 className="mb-4">Average Rating Over Time</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 25, right: 20, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return m === "01" ? y : "";
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[3.0, 5.0]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.yearMonth}</p>
                    <p className="font-mono">
                      Avg: {d.meanRating.toFixed(2)} ({d.nReviews} reviews)
                    </p>
                  </div>
                );
              }}
            />
            <EraMarkers />
            <Line
              type="monotone"
              dataKey="meanRating"
              stroke="#1a7a6d"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <Dot
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.era === "Pre-FTC" ? "#1a7a6d" : "#c44d4d"}
                    stroke="none"
                  />
                );
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <EraLegend />
      <SourceNote>
        Monthly mean star rating. Each dot = one month. Color shift marks post-FTC period.
      </SourceNote>
    </div>
  );
}
