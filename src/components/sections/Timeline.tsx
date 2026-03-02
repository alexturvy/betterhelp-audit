import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import QuoteDrawer from "../shared/QuoteDrawer";
import RatingTimeline from "../charts/RatingTimeline";
import OneStarTimeline from "../charts/OneStarTimeline";

export default function Timeline() {
  return (
    <SectionWrapper wide id="timeline">
      <ScrollReveal>
        <h2>The Decline</h2>
        <p>
          An overall average is a summary statistic &mdash; it compresses thousands of data points into a single number. That&apos;s useful for benchmarking, but it erases trajectory. A product with a 4.5-star average could be stable at 4.5 for seven years, or it could have been 4.8 for five years and fallen to 3.5 in the last two. Those are completely different stories hiding behind the same number. So the first analytical move is always: plot it over time.
        </p>
        <p>
          The average rating has been falling since the FTC complaint in March 2023. What was once a steady 4.6-star platform has dropped below 4.0 in recent months. The decline is not a blip &mdash; it&apos;s a sustained, accelerating trend.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-8">
          <RatingTimeline />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <p className="mt-8">
          The 1-star proportion tells the story more starkly. Before the FTC complaint, about 6% of monthly reviews were 1-star. By early 2026, that figure has crossed 30% &mdash; roughly one in three new reviews is the lowest possible rating.
        </p>
        <QuoteDrawer drawerId="timeline-one-star" linkText="see recent 1-star reviews" />
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="mt-6">
          <OneStarTimeline />
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
