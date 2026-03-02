"use client";

import { INVESTIGATION_STEPS } from "@/lib/investigation";
import ScrollReveal from "./ScrollReveal";

export default function InvestigationTimeline() {
  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="investigation-timeline" className="max-w-[720px] mx-auto px-6 pb-2">
      <ScrollReveal>
        <div className="relative ml-3">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-6">
            {INVESTIGATION_STEPS.map((step, i) => (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Numbered circle */}
                <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 border-border bg-background flex items-center justify-center">
                  <span className="font-mono text-xs text-text-muted">
                    {i + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="pt-0.5">
                  <button
                    onClick={() => handleClick(step.id)}
                    className="font-serif text-foreground hover:text-accent transition-colors cursor-pointer text-left"
                  >
                    {step.question}
                  </button>
                  <p className="text-sm text-text-muted mb-0 mt-0.5">
                    {step.subtext}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Explorer anchor */}
      <ScrollReveal delay={0.1}>
        <div className="mt-8 ml-3 pl-10">
          <button
            onClick={() => handleClick("explorer")}
            className="text-sm text-text-muted hover:text-accent transition-colors cursor-pointer"
          >
            Explore the full dataset &darr;
          </button>
        </div>
      </ScrollReveal>

      {/* Transition line */}
      <ScrollReveal delay={0.15}>
        <p className="mt-10 text-text-body italic">
          I started where any researcher starts &mdash; with what the data looks
          like before you ask it any questions.
        </p>
      </ScrollReveal>
    </div>
  );
}
