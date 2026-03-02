export default function StatCallout({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: "accent" | "negative" | "positive";
}) {
  const colorClass =
    color === "negative"
      ? "text-negative"
      : color === "positive"
        ? "text-positive"
        : "text-accent";

  return (
    <div className="text-center">
      <div className={`stat-number text-3xl sm:text-4xl ${colorClass}`}>
        {value}
      </div>
      <div className="text-sm text-text-muted mt-1">{label}</div>
    </div>
  );
}
