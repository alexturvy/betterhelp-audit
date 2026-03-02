import ScrollReveal from "../shared/ScrollReveal";
import SectionWrapper from "../shared/SectionWrapper";
import QuoteDrawer from "../shared/QuoteDrawer";
import TopicDumbbell from "../charts/TopicDumbbell";
import LexicalShiftBars from "../charts/LexicalShiftBars";

export default function TopicShifts() {
  return (
    <SectionWrapper wide id="topics">
      <ScrollReveal>
        <h2>What Changed in the Conversation</h2>
        <p>
          The causal analysis tells us that something real happened &mdash; ratings shifted at identifiable moments. But a rating is just a number. To understand what&apos;s driving the decline, I needed to look at what people are actually writing. The question is: how do you systematically analyze the content of 9,064 free-text reviews?
        </p>
        <p>
          The simplest approach would be keyword counting &mdash; pick some terms like &ldquo;billing&rdquo; or &ldquo;trust&rdquo; and track how often they appear. But keyword counting only finds what you&apos;re already looking for. It can&apos;t discover patterns you didn&apos;t anticipate.
        </p>
        <p>
          Structural topic modeling (R&apos;s stm package) takes a different approach &mdash; it reads all 9,064 reviews and discovers clusters of words that tend to appear together, without being told what to look for. A topic isn&apos;t a keyword; it&apos;s a constellation of related terms that the model identifies as a coherent theme. And because the model knows about the timeline (I included era as a covariate), it can estimate whether each topic became more or less prevalent after each business event.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mt-8">
          <TopicDumbbell />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <p className="mt-8">
          The biggest shift: billing disputes (Topic 2) more than doubled in prevalence, from 3.8% to 8.3% of all reviews. Waste and anger language (Topic 15) grew by 83%. Meanwhile, recommendation language (Topic 1) fell 30%.
        </p>
        <QuoteDrawer drawerId="topics-billing" linkText="see billing dispute reviews" />
        <QuoteDrawer drawerId="topics-recommendation" linkText="see early recommendation reviews" />
        <p>
          At the word level, the shift is even more granular. The term &ldquo;counselor&rdquo; nearly disappeared from reviews, replaced by &ldquo;therapist.&rdquo; Insurance-related vocabulary surged.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="mt-6">
          <LexicalShiftBars />
        </div>
      </ScrollReveal>
    </SectionWrapper>
  );
}
