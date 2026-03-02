"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INVESTIGATION_STEPS } from "@/lib/investigation";

export default function ScrollProgress() {
  const [visible, setVisible] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());

  // Visibility: show after scrolling past timeline, hide at closing
  useEffect(() => {
    const timelineEl = document.getElementById("investigation-timeline");
    const closingEl = document.getElementById("closing");
    if (!timelineEl || !closingEl) return;

    let pastTimeline = false;
    let atClosing = false;

    const update = () => setVisible(pastTimeline && !atClosing);

    const timelineObs = new IntersectionObserver(
      ([entry]) => {
        // Show when the timeline's bottom has scrolled out of view
        pastTimeline = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        update();
      },
      { threshold: 0 }
    );

    const closingObs = new IntersectionObserver(
      ([entry]) => {
        atClosing = entry.isIntersecting;
        update();
      },
      { threshold: 0 }
    );

    timelineObs.observe(timelineEl);
    closingObs.observe(closingEl);

    return () => {
      timelineObs.disconnect();
      closingObs.disconnect();
    };
  }, []);

  // Track current section
  useEffect(() => {
    const ids = INVESTIGATION_STEPS.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = new Map<string, boolean>();
        entries.forEach((entry) => {
          intersecting.set(entry.target.id, entry.isIntersecting);
        });

        // Find the last section that is currently intersecting
        let latest: string | null = null;
        const newPassed = new Set(passedIds);

        for (const el of elements) {
          const isIn = intersecting.get(el.id);
          if (isIn !== undefined) {
            if (isIn) latest = el.id;
          }
        }

        if (latest) {
          setCurrentId(latest);
          // Everything before current is "passed"
          const idx = ids.indexOf(latest);
          for (let i = 0; i < idx; i++) {
            newPassed.add(ids[i]);
          }
          setPassedIds(newPassed);
        }
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-0"
          aria-label="Investigation progress"
        >
          {INVESTIGATION_STEPS.map((step, i) => {
            const isCurrent = step.id === currentId;
            const isPassed = passedIds.has(step.id);

            return (
              <div key={step.id} className="flex flex-col items-center">
                <button
                  onClick={() => handleClick(step.id)}
                  aria-label={step.question}
                  className="group relative cursor-pointer p-1"
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isCurrent
                        ? "bg-accent scale-125"
                        : isPassed
                          ? "bg-text-muted"
                          : "bg-transparent border border-border"
                    }`}
                  />
                  {/* Tooltip on hover */}
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-text-muted bg-background/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {step.question}
                  </span>
                </button>
                {/* Connecting line between dots */}
                {i < INVESTIGATION_STEPS.length - 1 && (
                  <div className="w-px h-4 bg-border" />
                )}
              </div>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
