import { ReferenceLine } from "recharts";

const EVENTS = [
  { x: "2023-03", label: "FTC Complaint", color: "#c44d4d" },
  { x: "2023-08", label: "Settlement", color: "#9CA3AF" },
  { x: "2024-03", label: "Insurance Exp.", color: "#2e7d5b" },
];

export default function EraMarkers() {
  return (
    <>
      {EVENTS.map((e) => (
        <ReferenceLine
          key={e.x}
          x={e.x}
          stroke={e.color}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
      ))}
    </>
  );
}

export function EraLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
      {EVENTS.map((e) => (
        <div key={e.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 border-t-[1.5px] border-dashed"
            style={{ borderColor: e.color }}
          />
          <span>{e.label}</span>
        </div>
      ))}
    </div>
  );
}
