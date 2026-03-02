import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

const OUTPUT_DIR = join(__dirname, "public", "data");
const RAW_DIR = join(process.env.HOME!, "BetterHelp", "output");
const CSV_PATH = join(process.env.HOME!, "BetterHelp", "betterhelp_reviews.csv");
const REVIEWS_JSON = join(RAW_DIR, "journey_stage_reviews.json");

// ── Helpers ──────────────────────────────────────────────────────────────

function readJSON(filename: string) {
  return JSON.parse(readFileSync(join(RAW_DIR, filename), "utf-8"));
}

function round(n: number, decimals = 4) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ── Topic labels (manually assigned from FREX words) ─────────────────────

const TOPIC_LABELS: Record<number, string> = {
  1: "Recommendation & Praise",
  2: "Billing Disputes",
  3: "Life-Changing Impact",
  4: "Platform Features & Journaling",
  5: "Mental Health Professionalism",
  6: "Long-Term Relationship",
  7: "Affordability & Financial Aid",
  8: "Finding the Right Match",
  9: "Love & Group Sessions",
  10: "Overcoming Hesitancy",
  11: "Session Disappointments",
  12: "Provider Selection Issues",
  13: "Healing Journey & Growth",
  14: "Positive Listening & Advice",
  15: "Waste & Anger",
  16: "Customer Service Teams",
  17: "Convenience & Modality",
  18: "Ease of Use & Worth",
  19: "Face-to-Face Comparison",
  20: "Pandemic & Accessibility",
};

// ── 1. Rating Distribution ──────────────────────────────────────────────

function buildRatingDistribution(monthlyTs: any[]) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  // We don't have per-review data in monthly_ts, so use the CSV
  const csv = readFileSync(CSV_PATH, "utf-8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  for (const row of rows) {
    const r = parseInt(row.rating);
    if (r >= 1 && r <= 5) counts[r]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: counts[star],
    pct: round(counts[star] / total, 4),
  }));
}

// ── 2. Monthly data ─────────────────────────────────────────────────────

function assignEra(yearMonth: string): string {
  if (yearMonth < "2023-03") return "Pre-FTC";
  if (yearMonth < "2023-08") return "FTC Settlement";
  if (yearMonth < "2024-03") return "Post-FTC Recovery";
  return "Insurance Expansion";
}

function buildMonthly(monthlyTs: any[]) {
  return monthlyTs.map((m: any) => ({
    yearMonth: m.year_month.slice(0, 7),
    nReviews: m.n_reviews,
    meanRating: round(m.mean_rating, 4),
    pct1star: round(m.pct_1star, 4),
    pct5star: round(m.pct_5star, 4),
    era: assignEra(m.year_month.slice(0, 7)),
  }));
}

// ── 3. Monthly fitted (ITS) ─────────────────────────────────────────────

function buildMonthlyFitted(monthlyTs: any[]) {
  return monthlyTs.map((m: any) => ({
    yearMonth: m.year_month.slice(0, 7),
    meanRating: round(m.mean_rating, 4),
    pct1star: round(m.pct_1star, 4),
    fittedRating: round(m.fitted_rating, 4),
    fitted1star: round(m.fitted_1star, 4),
    era: assignEra(m.year_month.slice(0, 7)),
    postFtc: m.post_ftc,
    tSinceFtc: round(m.t_since_ftc, 2),
  }));
}

// ── 4. ITS Coefficients ─────────────────────────────────────────────────

function extractCoeffs(model: any) {
  const coeffs: Record<string, any> = {};
  for (const c of model.coefficients) {
    coeffs[c._row] = {
      estimate: round(c.Estimate, 4),
      se: round(c["Std. Error"], 4),
      pValue: round(c["Pr(>|t|)"], 6),
    };
  }
  return { ...coeffs, rSquared: round(model.r_squared, 4) };
}

function buildITSCoefficients(its: any) {
  return {
    ftcRating: extractCoeffs(its.ftc_mean_rating),
    ftc1star: extractCoeffs(its.ftc_pct_1star),
    multiRating: extractCoeffs(its.multi_mean_rating),
    multi1star: extractCoeffs(its.multi_pct_1star),
  };
}

// ── 5. RD Estimate ──────────────────────────────────────────────────────

function buildRDEstimate(rd: any) {
  const r = rd.rdrobust;
  return {
    estimate: round(r.estimate, 4),
    se: round(r.se, 4),
    pValue: round(r.p_value, 4),
    ciLower: round(r.ci_lower, 4),
    ciUpper: round(r.ci_upper, 4),
    bandwidth: round(r.bandwidth, 1),
  };
}

// ── 6. Daily RD data ────────────────────────────────────────────────────

function buildDailyRD() {
  const csv = readFileSync(CSV_PATH, "utf-8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true });

  const FTC_DATE = new Date("2023-03-01");
  const dayMs = 86400000;
  const windowDays = 365;

  // Group by published_date
  const byDate: Record<string, { sum: number; count: number }> = {};
  for (const row of rows) {
    const dateStr = row.published_date?.slice(0, 10);
    if (!dateStr) continue;
    const rating = parseFloat(row.rating);
    if (isNaN(rating)) continue;
    if (!byDate[dateStr]) byDate[dateStr] = { sum: 0, count: 0 };
    byDate[dateStr].sum += rating;
    byDate[dateStr].count++;
  }

  const result: any[] = [];
  for (const [dateStr, { sum, count }] of Object.entries(byDate)) {
    const date = new Date(dateStr);
    const daysFromFTC = Math.round(
      (date.getTime() - FTC_DATE.getTime()) / dayMs
    );
    if (Math.abs(daysFromFTC) <= windowDays) {
      result.push({
        date: dateStr,
        meanRating: round(sum / count, 4),
        n: count,
        daysFromFTC,
      });
    }
  }
  return result.sort((a, b) => a.daysFromFTC - b.daysFromFTC);
}

// ── 7. Topics ───────────────────────────────────────────────────────────

function buildTopics(stmData: any) {
  const prevalenceByEra = stmData.prevalence_by_era;

  return stmData.topics.map((t: any) => {
    const preFTC =
      prevalenceByEra.find(
        (p: any) => p.topic_num === t.topic && p.era === "Pre-FTC Complaint"
      )?.prevalence ?? 0;
    const insurance =
      prevalenceByEra.find(
        (p: any) =>
          p.topic_num === t.topic && p.era === "Insurance Expansion"
      )?.prevalence ?? 0;

    return {
      id: t.topic,
      label: TOPIC_LABELS[t.topic] || `Topic ${t.topic}`,
      frex: t.frex.slice(0, 7),
      prob: t.prob.slice(0, 7),
      prevalence: {
        preFTC: round(preFTC, 4),
        insurance: round(insurance, 4),
      },
    };
  });
}

// ── 8. Lexical Shifts ───────────────────────────────────────────────────

function buildLexicalShifts() {
  const data: any[] = readJSON("lexical_shifts.json");

  // Sort by shift, take top 15 increased and top 15 decreased
  const sorted = [...data].sort((a, b) => b.shift - a.shift);

  const increased = sorted.slice(0, 15).map((d) => ({
    word: d.word,
    freqPre: round(d.freq_pre, 6),
    freqPost: round(d.freq_ins, 6),
    shift: round(d.shift, 6),
    logRatio: round(d.log_ratio, 4),
  }));

  const decreased = sorted
    .slice(-15)
    .reverse()
    .map((d) => ({
      word: d.word,
      freqPre: round(d.freq_pre, 6),
      freqPost: round(d.freq_ins, 6),
      shift: round(d.shift, 6),
      logRatio: round(d.log_ratio, 4),
    }));

  return { increased, decreased };
}

// ── 9. Stage Ratings ────────────────────────────────────────────────────

function buildStageRatings() {
  const profiles: any = readJSON("stage_profiles.json");
  return Object.values(profiles).map((p: any) => ({
    stage: p.stage,
    n: p.n_reviews,
    meanRating: round(p.mean_rating, 2),
  }));
}

// ── 10. Stage Monthly (Pricing + Ongoing, recent 24 months) ─────────────

function buildStageMonthly() {
  const data: any[] = readJSON("temporal_by_stage.json");

  // Filter to Pricing/Payment and Ongoing Sessions stages
  const stages = ["Pricing/Payment", "Ongoing Sessions"];
  const filtered = data.filter(
    (d) =>
      stages.includes(d.primary_stage) &&
      d.year_month >= "2024-01-01" &&
      d.n_reviews >= 3
  );

  return filtered.map((d) => ({
    yearMonth: d.year_month.slice(0, 7),
    stage: d.primary_stage,
    nReviews: d.n_reviews,
    meanRating: round(d.mean_rating, 4),
  }));
}

// ── 11. Pricing Sub-Topics ──────────────────────────────────────────────

function buildPricingSubTopics() {
  const stageTopics: any = readJSON("stm_stage_topics.json");
  const pricing = stageTopics["Pricing/Payment"];
  if (!pricing) return [];

  return pricing.topics.map((t: any) => ({
    id: t.topic,
    label: getPricingLabel(t.topic),
    frex: t.frex.slice(0, 7),
  }));
}

function getPricingLabel(topicNum: number): string {
  const labels: Record<number, string> = {
    1: "Affordability & Accessibility",
    2: "Subscription & Session Costs",
    3: "Life-Changing Value",
    4: "Service Concerns & NHS",
    5: "Financial Aid & Discounts",
    6: "Emotional Connection",
    7: "Unauthorized Charges & Refunds",
    8: "Waste of Money",
    9: "Decision & Skepticism",
    10: "Communication & Scheduling",
  };
  return labels[topicNum] || `Pricing Topic ${topicNum}`;
}

// ── 12. Quote Drawers ──────────────────────────────────────────────────

/** Normalize raw era names to the short labels used in site-data */
function normalizeEra(raw: string): string {
  const map: Record<string, string> = {
    "Pre-FTC Complaint": "Pre-FTC",
    "FTC Settlement Period": "FTC Settlement",
    "Post-FTC Recovery": "Post-FTC Recovery",
    "Insurance Expansion": "Insurance Expansion",
  };
  return map[raw] || raw;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(" ", maxLen);
  return text.slice(0, cut > 0 ? cut : maxLen) + "…";
}

/**
 * Sample `count` items from `arr` with era diversity.
 * Prefer spreading across eras; fall back to random if not enough eras.
 */
function diverseSample<T extends { era: string }>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  const byEra: Record<string, T[]> = {};
  for (const item of arr) {
    (byEra[item.era] ||= []).push(item);
  }
  const eras = Object.keys(byEra);
  const result: T[] = [];
  let round = 0;
  while (result.length < count) {
    const era = eras[round % eras.length];
    const pool = byEra[era];
    if (pool.length > 0) result.push(pool.shift()!);
    round++;
    if (round > count * 4) break; // safety
  }
  return result;
}

function buildQuoteDrawers() {
  const raw: any[] = JSON.parse(readFileSync(REVIEWS_JSON, "utf-8"));

  // Normalize eras on all reviews
  const reviews = raw.map((r) => ({
    ...r,
    era: normalizeEra(r.era),
  }));

  const BILLING_KW = /charge|refund|billing|billed|unauthorized|fraud|credit card|debit/i;

  const drawerConfigs: Record<string, { filter: (r: any) => boolean; count: number }> = {
    "descriptive-glowing": {
      filter: (r) => r.rating >= 4,
      count: 6,
    },
    "timeline-one-star": {
      filter: (r) => r.rating === 1 && r.era === "Insurance Expansion",
      count: 5,
    },
    "topics-billing": {
      filter: (r) => r.primary_stage === "Pricing/Payment" && r.sentiment < 0,
      count: 5,
    },
    "topics-recommendation": {
      filter: (r) =>
        r.era === "Pre-FTC" && /recommend/i.test(r.text) && r.rating >= 4,
      count: 5,
    },
    "billing-unauthorized": {
      filter: (r) =>
        r.primary_stage === "Pricing/Payment" &&
        r.rating === 1 &&
        r.era === "Insurance Expansion" &&
        BILLING_KW.test(r.text),
      count: 5,
    },
  };

  const drawers: Record<string, any> = {};

  for (const [id, cfg] of Object.entries(drawerConfigs)) {
    const pool = reviews
      .filter(cfg.filter)
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 20);
    const sampled = diverseSample(pool, cfg.count);
    drawers[id] = {
      reviews: sampled.map((r) => ({
        text: truncateText(r.text, 300),
        rating: r.rating,
        date: formatDate(r.published_date),
        era: r.era,
        stage: r.primary_stage,
      })),
    };
  }

  // Special case: twostargap-contrast — two sub-arrays
  const sessionPositive = reviews
    .filter((r) => r.primary_stage === "Ongoing Sessions" && r.rating === 5)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 20);
  const churnNegative = reviews
    .filter((r) => r.primary_stage === "Cancellation/Churn" && r.rating === 1)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 20);

  const formatReview = (r: any) => ({
    text: truncateText(r.text, 300),
    rating: r.rating,
    date: formatDate(r.published_date),
    era: r.era,
    stage: r.primary_stage,
  });

  drawers["twostargap-contrast"] = {
    reviews: diverseSample(sessionPositive, 3).map(formatReview),
    contrastReviews: diverseSample(churnNegative, 3).map(formatReview),
  };

  return drawers;
}

// ── 13. Explorer Reviews ───────────────────────────────────────────────

function buildExplorerReviews() {
  const raw: any[] = JSON.parse(readFileSync(REVIEWS_JSON, "utf-8"));

  const reviews = raw.map((r) => ({
    id: r.id,
    text: r.text,
    rating: r.rating,
    date: formatDate(r.published_date),
    era: normalizeEra(r.era),
    stage: r.primary_stage,
    sentiment: round(r.sentiment, 4),
  }));

  const outPath = join(OUTPUT_DIR, "reviews.json");
  writeFileSync(outPath, JSON.stringify(reviews));

  const size = readFileSync(outPath).length;
  console.log(`Wrote ${outPath} (${(size / 1024 / 1024).toFixed(1)} MB, ${reviews.length} reviews)`);
  return reviews.length;
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  console.log("Reading raw data...");
  const itsRd = readJSON("its_rd_results.json");
  const stmGlobal = readJSON("stm_global_topics.json");

  console.log("Building site data...");
  const siteData = {
    ratingDistribution: buildRatingDistribution(itsRd.monthly_ts),
    monthly: buildMonthly(itsRd.monthly_ts),
    monthlyFitted: buildMonthlyFitted(itsRd.monthly_ts),
    itsCoefficients: buildITSCoefficients(itsRd.its),
    rdEstimate: buildRDEstimate(itsRd.rd),
    dailyRD: buildDailyRD(),
    topics: buildTopics(stmGlobal),
    lexicalShifts: buildLexicalShifts(),
    stageRatings: buildStageRatings(),
    stageMonthly: buildStageMonthly(),
    pricingSubTopics: buildPricingSubTopics(),
    quoteDrawers: buildQuoteDrawers(),
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, "site-data.json");
  writeFileSync(outPath, JSON.stringify(siteData));

  const size = readFileSync(outPath).length;
  console.log(`Wrote ${outPath} (${(size / 1024).toFixed(1)} KB)`);

  // Quick sanity checks
  console.log(`  ratingDistribution: ${siteData.ratingDistribution.length} rows`);
  console.log(`  monthly: ${siteData.monthly.length} rows`);
  console.log(`  monthlyFitted: ${siteData.monthlyFitted.length} rows`);
  console.log(`  dailyRD: ${siteData.dailyRD.length} rows`);
  console.log(`  topics: ${siteData.topics.length} topics`);
  console.log(`  lexicalShifts: ${siteData.lexicalShifts.increased.length} + ${siteData.lexicalShifts.decreased.length}`);
  console.log(`  stageRatings: ${siteData.stageRatings.length} stages`);
  console.log(`  stageMonthly: ${siteData.stageMonthly.length} rows`);
  console.log(`  pricingSubTopics: ${siteData.pricingSubTopics.length} topics`);
  const drawerKeys = Object.keys(siteData.quoteDrawers);
  console.log(`  quoteDrawers: ${drawerKeys.length} drawers (${drawerKeys.join(", ")})`);
  for (const [k, v] of Object.entries(siteData.quoteDrawers) as [string, any][]) {
    const count = v.reviews.length + (v.contrastReviews?.length ?? 0);
    console.log(`    ${k}: ${count} reviews`);
  }

  // Build explorer reviews (separate file)
  console.log("\nBuilding explorer reviews...");
  const explorerCount = buildExplorerReviews();
}

main();
