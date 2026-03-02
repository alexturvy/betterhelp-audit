import ScrollReveal from "../shared/ScrollReveal";
import StatCallout from "../shared/StatCallout";

export default function Opening() {
  return (
    <div className="max-w-[720px] mx-auto px-6 pt-20 pb-12">
      <ScrollReveal>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm uppercase tracking-widest text-accent font-sans mb-0">
            Independent Investigation
          </p>
          <p className="text-sm text-text-muted mb-0">
            <a href="https://alexturvy.com" className="font-medium text-foreground no-underline hover:text-accent">
              Alex Turvy, PhD
            </a>
            {" "}&middot; March 2026
          </p>
        </div>
        <h1 className="mb-4">
          What Happens When You Actually Analyze 9,064 BetterHelp Reviews
        </h1>
        <p className="text-lg text-text-muted leading-relaxed mb-6 font-serif italic">
          Each analysis raised a question only the next one could answer.
        </p>
        <div className="text-text-body leading-relaxed space-y-3 mb-2">
          <p className="mb-0">
            BetterHelp is the world&apos;s largest online therapy platform. In March 2023, the FTC filed a complaint alleging the company shared users&apos; health data with advertisers.
          </p>
          <p className="mb-0">
            A year later, the platform expanded insurance coverage &mdash; and the complaints changed shape.
          </p>
          <p className="font-medium text-foreground mb-0">
            A trend emerged in the data. The methods revealed what&apos;s driving it. The gaps point to what to research next.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <div className="grid grid-cols-3 gap-6 mt-10 mb-4 py-6 border-y border-border">
          <StatCallout value="9,064" label="Reviews analyzed" />
          <StatCallout value="8" label="Years of data" />
          <StatCallout value="20" label="Topics discovered" />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.25}>
        <p className="mt-6 text-sm text-text-muted">
          I scraped every review with Python, ran the analysis in R, and built this report so each finding is traceable to the source data. Each section follows from a question the previous one couldn&apos;t answer.
        </p>
        <p className="text-text-muted text-xs mt-2">
          Trustpilot reviews, March 2018 &ndash; February 2026
        </p>
      </ScrollReveal>
    </div>
  );
}
