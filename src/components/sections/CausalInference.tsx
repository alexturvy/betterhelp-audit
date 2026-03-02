import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import ITSFittedLine from "../charts/ITSFittedLine";
import RDScatter from "../charts/RDScatter";

export default function CausalInference() {
  return (
    <SectionWrapper wide id="causation">
      <ScrollReveal>
        <h2>Was the FTC Complaint the Cause?</h2>
        <p>
          The timeline shows a clear decline starting around March 2023. It&apos;s tempting to point at the FTC complaint and call it the cause. But correlation on a timeline is one of the most common analytical traps &mdash; things happen at the same time for all kinds of reasons. Maybe BetterHelp&apos;s advertising changed. Maybe a competitor launched. Maybe Trustpilot&apos;s algorithm shifted which reviews get surfaced. To claim the FTC complaint actually caused the decline, I needed methods designed specifically to test that kind of claim.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-6">
          <h3 className="mb-3">Regression Discontinuity</h3>
          <p>
            Regression discontinuity looks at a narrow window around a single date and asks: is there a sharp, discontinuous change at exactly that point? If ratings were drifting down gradually, you wouldn&apos;t see a discontinuity &mdash; you&apos;d see a smooth slope. A sharp break at the exact date of the FTC complaint is harder to explain away as coincidence. The rdrobust estimate &mdash; using R&apos;s standard package for sharp RD designs &mdash; shows a drop of 0.19 points at exactly that date, statistically significant (p&nbsp;=&nbsp;0.019).
          </p>
          <RDScatter />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <div className="mt-12">
          <h3 className="mb-3">Interrupted Time Series</h3>
          <p>
            Interrupted time series does something different &mdash; it models the entire trajectory before and after the event, accounting for any pre-existing trend. This matters because if ratings were already declining before the FTC complaint, the apparent drop might just be a continuation of an existing trend, not a new shock. The model shows: ratings were actually stable or slightly increasing before March 2023. The decline is new.
          </p>
          <p>
            The multi-event version of this model reveals something the single-event analysis misses. The chart below shows four distinct segments: a flat pre-FTC baseline, a sharp drop and steep decline after the FTC complaint, a partial recovery at the settlement (both a level jump and a slope reversal &mdash; ratings briefly stabilized), and then the insurance expansion in 2024 triggered a new downward slope of -0.048 points per month that&apos;s still steepening.
          </p>
          <ITSFittedLine />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="mt-8 p-5 bg-accent-light/30 rounded-xl border border-accent/10">
          <h4 className="text-foreground mb-2">A caveat I&apos;d include in any internal report</h4>
          <p className="text-sm text-text-body mb-0">
            Both methods detect a real shift in the observable data. But the FTC complaint generated massive media coverage, which likely brought people to Trustpilot who wouldn&apos;t normally leave reviews. These methods can&apos;t fully separate the business impact from the media-driven selection effect. That distinction would require internal data &mdash; specifically, whether the post-FTC reviewers were existing users or people who&apos;d never used the platform. I&apos;ll return to this in the limitations.
          </p>
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
