import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";

export default function ResearchDirections() {
  return (
    <SectionWrapper id="limits">
      <ScrollReveal>
        <h2>What This Doesn&apos;t Tell Us</h2>
        <p>
          Everything above comes from one data source: public Trustpilot reviews. That source is large, longitudinal, unfiltered, and independently verifiable. But it has structural limitations no method can overcome.
        </p>
        <p>
          The most important is selection bias. The FTC complaint generated massive media coverage, which likely brought people to Trustpilot who wouldn&apos;t normally leave reviews &mdash; people already dissatisfied, or who found BetterHelp through negative press rather than personal use. The causal methods detect a real shift, but they can&apos;t fully separate the business impact from the media-driven selection effect. Trustpilot&apos;s own algorithm changes and review moderation policies add another layer of noise.
        </p>
        <p>
          The deeper limitation is missing behavioral metadata. I can&apos;t link a review to a user&apos;s payment path (insurance vs. cash-pay), their tenure on the platform, their session frequency, or their therapist&apos;s caseload. Every research direction that follows exists because the public data surfaced a question that only internal data can answer.
        </p>
        <p className="mt-4 font-serif italic text-text-body">
          But the most valuable thing this analysis does isn&apos;t answer questions. It&apos;s generate the right ones.
        </p>
      </ScrollReveal>
    </SectionWrapper>
  );
}
