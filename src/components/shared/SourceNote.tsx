export default function SourceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-text-muted mt-3 italic">{children}</p>
  );
}
