import { siteData } from "@/lib/data";

const BILLING_TYPES = [
  {
    id: 7,
    name: "Unauthorized Charges & Refunds",
    color: "#c44d4d",
    description:
      "Credit card charges without consent, failed refund requests, billing after cancellation. The most adversarial billing pattern.",
  },
  {
    id: 8,
    name: "Waste of Money",
    color: "#d4816b",
    description:
      "Broad dissatisfaction with value received — therapists seen as unqualified, sessions perceived as worthless relative to cost.",
  },
  {
    id: 2,
    name: "Subscription & Session Costs",
    color: "#9CA3AF",
    description:
      "Structural concerns about weekly pricing, session frequency, and monthly subscription model. Less emotional, more transactional.",
  },
];

export default function ThreeBillingTypes() {
  const pricingTopics = siteData.pricingSubTopics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {BILLING_TYPES.map((bt) => {
        const topic = pricingTopics.find((t) => t.id === bt.id);
        return (
          <div key={bt.id} className="chart-container">
            <div
              className="h-1 rounded-full mb-4"
              style={{ background: bt.color }}
            />
            <h4 className="mb-2">{bt.name}</h4>
            <p className="text-sm text-text-body mb-3">{bt.description}</p>
            {topic && (
              <div className="flex flex-wrap gap-1.5">
                {topic.frex.map((word) => (
                  <span
                    key={word}
                    className="text-xs px-2 py-0.5 rounded-full bg-background text-text-muted border border-border"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
