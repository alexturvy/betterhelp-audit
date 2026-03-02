"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { siteData } from "@/lib/data";
import EraMarkers, { EraLegend } from "../shared/EraMarkers";
import SourceNote from "../shared/SourceNote";

export default function OneStarTimeline() {
  const data = siteData.monthly;

  return (
    <div className="chart-container">
      <h3 className="mb-4">1-Star Review Proportion</h3>
      <div className="h-[300px]">
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
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 12 }}
              domain={[0, 0.35]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.yearMonth}</p>
                    <p className="font-mono">
                      1-star: {(d.pct1star * 100).toFixed(1)}%
                    </p>
                  </div>
                );
              }}
            />
            <EraMarkers />
            <Line
              type="monotone"
              dataKey="pct1star"
              stroke="#c44d4d"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#c44d4d", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <EraLegend />
      <SourceNote>
        Proportion of 1-star reviews per month. The 1-star rate roughly tripled from ~6% pre-FTC to ~30% in early 2026.
      </SourceNote>
    </div>
  );
}
