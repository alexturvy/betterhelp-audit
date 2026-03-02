import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";

const studies = [
  {
    question: "Segment the Decline",
    gap: "The insurance-era billing crisis is visible in aggregate, but public reviews don\u2019t reveal whether it\u2019s concentrated among insurance-path users, cash-pay users, or both. If insurance users drive the decline, the problem is onboarding expectations. If cash-pay users are declining too, something systemic changed.",
    study: "Link internal billing tickets to payment path (insurance vs. cash-pay vs. hybrid). Run a targeted churn survey segmented by payment method, asking departing users to rate each journey stage independently.",
    unlocks: "Whether the insurance transition is causing the billing crisis or merely coinciding with it \u2014 and whether the fix is segment-specific or platform-wide.",
  },
  {
    question: "Track the Lifecycle",
    gap: "Ongoing Sessions averages 4.82 stars. Cancellation/Churn averages 2.69. But the public data can\u2019t tell us whether that\u2019s segmentation (different people at each stage) or lifecycle (the same people whose satisfaction erodes as billing friction accumulates).",
    study: "A 60-day diary study tracking users at five journey touchpoints \u2014 signup, first session, week four, month two, and cancellation or renewal. Measure when billing friction begins to erode therapeutic satisfaction, and whether the two ever decouple entirely.",
    unlocks: "Whether product experience can outrun business model friction \u2014 or whether every satisfied therapy user eventually becomes a dissatisfied billing user.",
  },
  {
    question: "Hear the Other Side",
    gap: "Every analysis here reflects the patient perspective. The therapist experience of the insurance transition \u2014 reimbursement rates, caseload changes, administrative burden \u2014 is invisible in the public data. If therapist experience is degrading, session quality (the one healthy metric) may be at risk.",
    study: "Provider interviews (n=15\u201320) stratified by tenure, caseload, and specialty, followed by a quantitative survey to the broader provider panel. Focus on how insurance acceptance has changed their daily practice, session preparation time, and intent to stay on the platform.",
    unlocks: "Whether the 4.82-star session rating is stable or whether it\u2019s a lagging indicator that hasn\u2019t caught up to provider-side changes yet.",
  },
];

export default function ResearchStudies() {
  return (
    <SectionWrapper id="studies">
      <ScrollReveal>
        <h2>Three Studies Worth Running</h2>
      </ScrollReveal>

      <div className="space-y-6 mt-6">
        {studies.map((s, i) => (
          <ScrollReveal key={i} delay={0.1 * (i + 1)}>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-accent-light/30 px-6 py-4">
                <h3 className="font-serif text-lg mb-0">{s.question}</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">The gap</p>
                  <p className="text-sm text-text-body mb-0">{s.gap}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">The study</p>
                  <p className="text-sm text-text-body mb-0">{s.study}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">What it unlocks</p>
                  <p className="text-sm text-text-body mb-0">{s.unlocks}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </SectionWrapper>
  );
}
