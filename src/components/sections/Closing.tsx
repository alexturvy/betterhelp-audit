import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";

export default function Closing() {
  return (
    <SectionWrapper id="closing">
      <ScrollReveal>
        <div className="border-t border-border pt-10">
          <h2>Conclusion</h2>
          <p>
            BetterHelp&apos;s core product &mdash; connecting people with therapists online &mdash; continues to receive excellent reviews. People who describe their ongoing therapeutic relationships rate the service 4.82 out of 5 stars. That signal has not meaningfully changed.
          </p>
          <p>
            What has changed is everything around the therapy. Billing practices, cancellation friction, and perceived value have become the dominant themes in negative reviews. The FTC complaint appears to have been both a catalyst for attention and a marker of genuine operational problems that have since deepened.
          </p>
          <p>
            The 1-star proportion has risen from <strong>6% to 30%</strong> in three years. That trajectory, if it continues, represents a serious threat to BetterHelp&apos;s reputation and market position &mdash; not because the therapy doesn&apos;t work, but because <strong>the business practices surrounding it are eroding trust</strong>.
          </p>
          <p>
            The patterns in 9,064 reviews are a map. The three studies above are the next steps. The question is whether someone walks the path.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-10 pt-8 border-t border-border">
          <h3 className="text-base mb-3">Methodology</h3>
          <p className="text-sm text-text-muted">
            9,064 Trustpilot reviews scraped and analyzed using R and Python. Causal analysis via interrupted time series (multi-intervention) and regression discontinuity (rdrobust). Topic modeling via Structural Topic Model (K=20). Lexical analysis via frequency-weighted log-odds ratios. Journey stage classification via multi-pass keyword + LLM hybrid pipeline.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <div className="mt-8 pb-16 text-sm text-text-muted">
          <p className="mb-1">
            <span className="font-medium text-foreground">Alex Turvy, PhD</span> &middot;{" "}
            <a href="https://alexturvy.com" className="text-accent">
              alexturvy.com
            </a>
          </p>
          <p className="mb-0 text-xs">
            This is an independent analysis. I have no affiliation with BetterHelp, Teladoc Health, or the FTC.
          </p>
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
