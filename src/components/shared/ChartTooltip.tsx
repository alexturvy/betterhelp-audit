export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="recharts-tooltip">
      {label && (
        <p className="font-medium text-foreground mb-1 text-sm">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          <span className="text-text-muted">{entry.name}: </span>
          <span className="font-mono font-medium">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}
