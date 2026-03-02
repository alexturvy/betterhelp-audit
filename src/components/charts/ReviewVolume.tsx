"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { siteData } from "@/lib/data";
import EraMarkers, { EraLegend } from "../shared/EraMarkers";
import SourceNote from "../shared/SourceNote";

export default function ReviewVolume() {
  const data = siteData.monthly;

  return (
    <div className="chart-container">
      <h3 className="mb-4">Monthly Review Volume</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a7a6d" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1a7a6d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return m === "01" ? y : "";
              }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.yearMonth}</p>
                    <p className="font-mono">{d.nReviews} reviews</p>
                  </div>
                );
              }}
            />
            <EraMarkers />
            <Area
              type="monotone"
              dataKey="nReviews"
              stroke="#1a7a6d"
              fill="url(#volumeGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <EraLegend />
      <SourceNote>Monthly review counts from Trustpilot</SourceNote>
    </div>
  );
}
