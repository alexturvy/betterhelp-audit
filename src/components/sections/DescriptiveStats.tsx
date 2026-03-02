import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import QuoteDrawer from "../shared/QuoteDrawer";
import RatingDistribution from "../charts/RatingDistribution";
import ReviewVolume from "../charts/ReviewVolume";

export default function DescriptiveStats() {
  return (
    <SectionWrapper wide id="baseline">
      <ScrollReveal>
        <h2>The Surface Story</h2>
        <p>
          At first glance, BetterHelp&apos;s review profile looks overwhelmingly positive. <strong>81% of all reviews are 4 or 5 stars.</strong> The platform has accumulated thousands of glowing testimonials from people whose therapists changed their lives.
        </p>
        <QuoteDrawer drawerId="descriptive-glowing" linkText="see the glowing reviews" />
        <p>
          But <strong>aggregates hide trajectories</strong>. When you spread these reviews across time, a different pattern emerges.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <RatingDistribution />
          <ReviewVolume />
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
