import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import QuoteDrawer from "../shared/QuoteDrawer";
import StageRatingBars from "../charts/StageRatingBars";
import StageDivergence from "../charts/StageDivergence";

export default function TwoStarGap() {
  return (
    <SectionWrapper wide id="journey">
      <ScrollReveal>
        <h2>The Two-Star Gap</h2>
        <p>
          Topic modeling tells you what people talk about. It doesn&apos;t tell you where in the experience they&apos;re talking about. A complaint about &ldquo;charges&rdquo; could come from someone surprised by the initial price, someone whose subscription auto-renewed unexpectedly, or someone who couldn&apos;t get a refund after canceling. Those are three different product moments requiring three different interventions.
        </p>
        <p>
          So I classified every review by which part of the user journey it primarily describes &mdash; signup, pricing, matching, ongoing sessions, cancellation, therapist switching. The classification uses keyword dictionaries (transparent, auditable, reproducible) validated against the topic model&apos;s output to make sure the categories produce genuinely distinct language profiles. This is the move that turns a text analysis into a product research artifact. Topics are academic. Journey stages are something a product team can act on.
        </p>
        <p>
          Not all parts of the BetterHelp experience are declining equally. A striking gap emerged: people love their therapy sessions but loathe the business operations around them.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-8">
          <StageRatingBars />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <p className="mt-8">
          Ongoing Sessions averages 4.82 stars &mdash; nearly perfect. Cancellation/Churn sits at 2.69. That&apos;s a 2.13-star gap within the same platform.
        </p>
        <p>
          Yes, you&apos;d expect cancellation reviews to skew negative &mdash; people who leave aren&apos;t happy. But the chart shows more than a selection effect. Every therapy-facing stage (Matching, Ongoing Sessions, First Session) scores above 4.3. Every operations-facing stage scores lower. And as the next chart shows, the gap is widening. This isn&apos;t &ldquo;unhappy people leave bad reviews.&rdquo; It&apos;s a product that works therapeutically and fails operationally &mdash; and the operational failure is accelerating.
        </p>
        <QuoteDrawer drawerId="twostargap-contrast" linkText="see the contrast side by side" />
        <p>
          The last 24 months make the trajectory clear:
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="mt-6">
          <StageDivergence />
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
