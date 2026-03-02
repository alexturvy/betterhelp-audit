"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { siteData } from "@/lib/data";
import SourceNote from "../shared/SourceNote";

export default function LexicalShiftBars() {
  const { increased, decreased } = siteData.lexicalShifts;

  // Combine and sort for diverging bar
  const data = [
    ...increased.slice(0, 10).map((d) => ({ ...d, category: "increased" })),
    ...decreased.slice(0, 10).map((d) => ({ ...d, category: "decreased" })),
  ].sort((a, b) => b.shift - a.shift);

  return (
    <div className="chart-container">
      <h3 className="mb-1">Lexical Shifts: Pre-FTC vs. Insurance Era</h3>
      <p className="text-sm text-text-muted mb-4">
        Words whose frequency changed most between pre-FTC and insurance expansion periods.
      </p>
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 90 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v > 0 ? `+${(v * 1000).toFixed(1)}` : `${(v * 1000).toFixed(1)}`
              }
            />
            <YAxis
              type="category"
              dataKey="word"
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="recharts-tooltip">
                    <p className="font-medium">&ldquo;{d.word}&rdquo;</p>
                    <p className="text-sm">
                      Pre: <span className="font-mono">{(d.freqPre * 100).toFixed(3)}%</span>
                    </p>
                    <p className="text-sm">
                      Post: <span className="font-mono">{(d.freqPost * 100).toFixed(3)}%</span>
                    </p>
                    <p className="text-sm font-mono">
                      Log ratio: {d.logRatio > 0 ? "+" : ""}{d.logRatio.toFixed(2)}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#9CA3AF" />
            <Bar dataKey="shift" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.shift > 0 ? "#2e7d5b" : "#c44d4d"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SourceNote>
        Shift = frequency difference (post &minus; pre). Values &times;1000 for readability.
      </SourceNote>
    </div>
  );
}
