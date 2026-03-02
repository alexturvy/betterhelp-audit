import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import QuoteDrawer from "../shared/QuoteDrawer";
import ThreeBillingTypes from "../charts/ThreeBillingTypes";

export default function ThreeBillingProblems() {
  return (
    <SectionWrapper wide id="decomposition">
      <ScrollReveal>
        <h2>Three Types of Billing Problem</h2>
        <p>
          A finding like &ldquo;pricing reviews average 2.6 stars&rdquo; is useful but not yet actionable. &ldquo;Billing is a problem&rdquo; could mean fifty different things, and a product team that tries to fix all of them at once will fix none of them. The researcher&apos;s job at this point is decomposition &mdash; breaking a large, vague problem into smaller, specific ones that different people can own.
        </p>
        <p>
          I ran a second topic model within just the Pricing/Payment reviews &mdash; same method, narrower scope. Instead of asking &ldquo;what do all 9,064 reviews talk about,&rdquo; this asks &ldquo;within the reviews that mention pricing, what specifically are the distinct complaint patterns?&rdquo; Three emerged with clear separation.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-8">
          <ThreeBillingTypes />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <p className="mt-8">
          The most concerning pattern is unauthorized charges &mdash; reviewers describing credit card charges they did not consent to, failed attempts to get refunds, and continued billing after cancellation. This is the pattern most consistent with the FTC&apos;s original complaint about deceptive business practices.
        </p>
        <QuoteDrawer drawerId="billing-unauthorized" linkText="see unauthorized charge reviews" />
      </ScrollReveal>
    </SectionWrapper>
  );
}
