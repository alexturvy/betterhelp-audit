export default function SectionWrapper({
  children,
  wide,
  className,
  id,
}: {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`section-gap ${wide ? "max-w-[960px]" : "max-w-[720px]"} mx-auto px-6 ${className ?? ""}`}
    >
      {children}
    </section>
  );
}
