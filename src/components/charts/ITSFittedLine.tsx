"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { siteData } from "@/lib/data";
import EraMarkers, { EraLegend } from "../shared/EraMarkers";
import SourceNote from "../shared/SourceNote";

const ERA_KEYS = [
  { era: "Pre-FTC", key: "fittedPre" },
  { era: "FTC Settlement", key: "fittedFTC" },
  { era: "Post-FTC Recovery", key: "fittedRecovery" },
  { era: "Insurance Expansion", key: "fittedInsurance" },
] as const;

export default function ITSFittedLine() {
  const data = siteData.monthlyFitted;

  // Split fitted line into per-era segments so structural breaks are visible
  const processedData = useMemo(() => {
    return data.map((d) => {
      const row: Record<string, unknown> = { ...d };
      for (const { era, key } of ERA_KEYS) {
        row[key] = d.era === era ? d.fittedRating : null;
      }
      return row;
    });
  }, [data]);

  return (
    <div className="chart-container">
      <h3 className="mb-1">Interrupted Time Series: Fitted vs. Actual</h3>
      <p className="text-sm text-text-muted mb-4">
        Dots = observed monthly rating. Line segments = piecewise ITS model prediction. Breaks at each structural intervention.
      </p>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 25, right: 20, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => {
                const [y, m] = v.split("-");
                return m === "01" ? y : "";
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[3.4, 5.0]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">{d.yearMonth}</p>
                    <p className="text-sm">
                      Observed:{" "}
                      <span className="font-mono">{d.meanRating.toFixed(2)}</span>
                    </p>
                    <p className="text-sm">
                      Fitted:{" "}
                      <span className="font-mono">{d.fittedRating.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-text-muted">{d.era}</p>
                  </div>
                );
              }}
            />
            <EraMarkers />
            {ERA_KEYS.map(({ key }) => (
              <Line
                key={key}
                type="linear"
                dataKey={key}
                stroke="#2e7d5b"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            <Scatter
              dataKey="meanRating"
              fill="#374151"
              fillOpacity={0.5}
              r={3}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-accent-light/50 rounded-lg p-3">
          <div className="font-mono font-semibold text-foreground">-0.203</div>
          <div className="text-text-muted text-xs">FTC level shift (p&nbsp;=&nbsp;0.002)</div>
        </div>
        <div className="bg-accent-light/50 rounded-lg p-3">
          <div className="font-mono font-semibold text-foreground">+0.240</div>
          <div className="text-text-muted text-xs">Settlement recovery (p&nbsp;=&nbsp;0.006)</div>
        </div>
        <div className="bg-accent-light/50 rounded-lg p-3">
          <div className="font-mono font-semibold text-foreground">-0.048/mo</div>
          <div className="text-text-muted text-xs">Post-insurance slope (p&nbsp;=&nbsp;0.006)</div>
        </div>
        <div className="bg-accent-light/50 rounded-lg p-3">
          <div className="font-mono font-semibold text-foreground">0.76</div>
          <div className="text-text-muted text-xs">Model R&sup2;</div>
        </div>
      </div>
      <EraLegend />
      <SourceNote>
        Multi-intervention ITS model. Three structural breaks: FTC complaint, settlement, insurance expansion.
      </SourceNote>
    </div>
  );
}
