import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";

export default function ResearchDirections() {
  return (
    <SectionWrapper id="limits">
      <ScrollReveal>
        <h2>What This Doesn&apos;t Tell Us</h2>
        <p>
          Everything I&apos;ve shown so far comes from one data source: public Trustpilot reviews. That source has real strengths &mdash; it&apos;s large, it&apos;s longitudinal, it&apos;s unfiltered, and it&apos;s independently verifiable. But it also has structural limitations that no analytical method can overcome.
        </p>
        <p>
          Trustpilot reviewers are self-selected. People who leave reviews tend to have extreme experiences &mdash; very positive or very negative. The 81% positive skew I noted at the start means the satisfied majority is overrepresented, but the dissatisfied minority may be writing longer, more detailed reviews that dominate the topic models. I can characterize the signal in this data, but I can&apos;t claim it&apos;s representative of all BetterHelp users.
        </p>
        <p>
          More importantly, public reviews have no behavioral metadata. I can&apos;t link a review to a user&apos;s payment path (insurance vs. cash-pay), their tenure on the platform, their session frequency, or their therapist&apos;s satisfaction score. Every research direction below exists because the public data surfaced a question that only internal data can answer.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="space-y-4 mt-4">
          <div className="p-4 border border-border rounded-lg">
            <h4 className="text-foreground mb-1">Selection bias</h4>
            <p className="text-sm text-text-body mb-0">
              Post-FTC media coverage may have attracted a different type of reviewer &mdash; people who were already dissatisfied, or who found BetterHelp through negative press rather than personal use. The causal methods detect a real shift, but they can&apos;t fully separate the business impact from the media-driven selection effect.
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h4 className="text-foreground mb-1">Platform effects</h4>
            <p className="text-sm text-text-body mb-0">
              Trustpilot&apos;s own algorithm changes, review moderation policies, and visibility on search engines can all affect who reviews and when.
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h4 className="text-foreground mb-1">Missing behavioral data</h4>
            <p className="text-sm text-text-body mb-0">
              The insurance-era decline might be driven by a specific user segment (new insurance-referred users with different expectations) or it might reflect platform-wide operational changes. Without internal data on payment paths and user cohorts, the public data can identify the pattern but not the mechanism.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <p className="mt-6">
          The ITS and RD results are best interpreted as strong suggestive evidence that the FTC complaint coincided with &mdash; and likely contributed to &mdash; a measurable shift in public sentiment. But the most valuable thing this analysis does isn&apos;t answer questions. It&apos;s generate the right ones.
        </p>
      </ScrollReveal>
    </SectionWrapper>
  );
}
