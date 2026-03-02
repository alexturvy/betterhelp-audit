"use client";

import { useMemo } from "react";
import { siteData } from "@/lib/data";
import SourceNote from "../shared/SourceNote";

export default function RDScatter() {
  const { dailyRD, rdEstimate } = siteData;

  const { width, height, margin, xScale, yScale, binned } = useMemo(() => {
    const w = 860;
    const h = 400;
    const m = { top: 30, right: 30, bottom: 45, left: 50 };
    const plotW = w - m.left - m.right;
    const plotH = h - m.top - m.bottom;

    const xMin = -365;
    const xMax = 365;
    const yMin = 1;
    const yMax = 5;

    const xs = (v: number) => m.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const ys = (v: number) => m.top + ((yMax - v) / (yMax - yMin)) * plotH;

    // Bin into 30-day windows for smoothing
    const binSize = 30;
    const bins: Record<number, { sum: number; count: number; totalN: number }> = {};
    for (const d of dailyRD) {
      const bin = Math.floor(d.daysFromFTC / binSize) * binSize;
      if (!bins[bin]) bins[bin] = { sum: 0, count: 0, totalN: 0 };
      bins[bin].sum += d.meanRating * d.n;
      bins[bin].count++;
      bins[bin].totalN += d.n;
    }
    const binnedData = Object.entries(bins)
      .map(([k, v]) => ({
        x: Number(k) + binSize / 2,
        y: v.sum / v.totalN,
        side: Number(k) + binSize / 2 >= 0 ? "post" : "pre",
      }))
      .sort((a, b) => a.x - b.x);

    return { width: w, height: h, margin: m, xScale: xs, yScale: ys, binned: binnedData };
  }, [dailyRD]);

  const preBinned = binned.filter((b) => b.side === "pre");
  const postBinned = binned.filter((b) => b.side === "post");

  function makePath(points: { x: number; y: number }[]) {
    if (points.length < 2) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScale(p.y)}`)
      .join(" ");
  }

  return (
    <div className="chart-container">
      <h3 className="mb-1">Regression Discontinuity at FTC Event</h3>
      <p className="text-sm text-text-muted mb-4">
        Each dot = one day&apos;s average rating. Size = review count.
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[860px]"
          style={{ minWidth: 500 }}
        >
          {/* Cutoff line */}
          <line
            x1={xScale(0)}
            y1={margin.top}
            x2={xScale(0)}
            y2={height - margin.bottom}
            stroke="#c44d4d"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <text
            x={xScale(0)}
            y={margin.top - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#c44d4d"
            fontFamily="var(--font-sans)"
          >
            FTC Complaint
          </text>

          {/* X axis */}
          {[-360, -240, -120, 0, 120, 240, 360].map((tick) => (
            <g key={tick}>
              <line
                x1={xScale(tick)}
                y1={height - margin.bottom}
                x2={xScale(tick)}
                y2={height - margin.bottom + 5}
                stroke="#9CA3AF"
              />
              <text
                x={xScale(tick)}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#6B7280"
              >
                {tick === 0 ? "0" : tick > 0 ? `+${tick}d` : `${tick}d`}
              </text>
            </g>
          ))}
          <text
            x={xScale(0)}
            y={height - 5}
            textAnchor="middle"
            fontSize={12}
            fill="#6B7280"
          >
            Days from FTC Complaint
          </text>

          {/* Y axis */}
          {[1, 2, 3, 4, 5].map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left - 5}
                y1={yScale(tick)}
                x2={margin.left}
                y2={yScale(tick)}
                stroke="#9CA3AF"
              />
              <line
                x1={margin.left}
                y1={yScale(tick)}
                x2={width - margin.right}
                y2={yScale(tick)}
                stroke="#E5E0D8"
                strokeWidth={0.5}
              />
              <text
                x={margin.left - 10}
                y={yScale(tick) + 4}
                textAnchor="end"
                fontSize={11}
                fill="#6B7280"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Scatter dots */}
          {dailyRD.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.daysFromFTC)}
              cy={yScale(d.meanRating)}
              r={Math.max(2, Math.sqrt(d.n) * 1.2)}
              fill={d.daysFromFTC < 0 ? "#2e7d5b" : "#c44d4d"}
              fillOpacity={0.25}
              stroke="none"
            />
          ))}

          {/* Smoothed lines */}
          <path
            d={makePath(preBinned)}
            fill="none"
            stroke="#2e7d5b"
            strokeWidth={3}
            opacity={0.8}
          />
          <path
            d={makePath(postBinned)}
            fill="none"
            stroke="#c44d4d"
            strokeWidth={3}
            opacity={0.8}
          />
        </svg>
      </div>

      {/* Estimate annotation */}
      <div className="mt-4 bg-accent-light/50 rounded-lg p-4 text-sm">
        <div className="flex flex-wrap gap-6 items-baseline">
          <div>
            <span className="text-text-muted">RD Estimate: </span>
            <span className="font-mono font-semibold text-foreground text-lg">
              {rdEstimate.estimate.toFixed(3)}
            </span>
          </div>
          <div>
            <span className="text-text-muted">95% CI: </span>
            <span className="font-mono">
              [{rdEstimate.ciLower.toFixed(3)}, {rdEstimate.ciUpper.toFixed(3)}]
            </span>
          </div>
          <div>
            <span className="text-text-muted">p = </span>
            <span className="font-mono">{rdEstimate.pValue.toFixed(4)}</span>
          </div>
        </div>
      </div>
      <SourceNote>
        rdrobust with optimal bandwidth ({rdEstimate.bandwidth.toFixed(0)} days). Circles sized by daily review count.
      </SourceNote>
    </div>
  );
}
