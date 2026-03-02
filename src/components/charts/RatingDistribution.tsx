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

const COLORS: Record<number, string> = {
  1: "#c44d4d",
  2: "#d4816b",
  3: "#9CA3AF",
  4: "#6dab8e",
  5: "#3d8b5e",
};

export default function RatingDistribution() {
  const data = siteData.ratingDistribution;

  return (
    <div className="chart-container">
      <h3 className="mb-4">Rating Distribution</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="star"
              tickFormatter={(v) => `${v}★`}
              tick={{ fontSize: 13 }}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 12 }}
              domain={[0, 0.7]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.star}-star</p>
                    <p className="font-mono">
                      {d.count.toLocaleString()} reviews ({(d.pct * 100).toFixed(1)}%)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.star} fill={COLORS[entry.star]} />
              ))}
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                style={{ fontSize: 12, fontFamily: "var(--font-mono)", fill: "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SourceNote>
        n = {data.reduce((a, b) => a + b.count, 0).toLocaleString()} Trustpilot reviews, March 2018 &ndash; February 2026
      </SourceNote>
    </div>
  );
}
