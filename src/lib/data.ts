import siteDataJson from "../../public/data/site-data.json";

// ── Types ───────────────────────────────────────────────────────────────

export interface RatingRow {
  star: number;
  count: number;
  pct: number;
}

export interface MonthlyRow {
  yearMonth: string;
  nReviews: number;
  meanRating: number;
  pct1star: number;
  pct5star: number;
  era: string;
}

export interface MonthlyFittedRow {
  yearMonth: string;
  meanRating: number;
  pct1star: number;
  fittedRating: number;
  fitted1star: number;
  era: string;
  postFtc: number;
  tSinceFtc: number;
}

export interface CoeffSet {
  [key: string]: { estimate: number; se: number; pValue: number };
}

export interface ITSCoefficients {
  ftcRating: CoeffSet;
  ftc1star: CoeffSet;
  multiRating: CoeffSet;
  multi1star: CoeffSet;
}

export interface RDEstimate {
  estimate: number;
  se: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  bandwidth: number;
}

export interface DailyRDRow {
  date: string;
  meanRating: number;
  n: number;
  daysFromFTC: number;
}

export interface Topic {
  id: number;
  label: string;
  frex: string[];
  prob: string[];
  prevalence: { preFTC: number; insurance: number };
}

export interface LexicalEntry {
  word: string;
  freqPre: number;
  freqPost: number;
  shift: number;
  logRatio: number;
}

export interface StageRating {
  stage: string;
  n: number;
  meanRating: number;
}

export interface StageMonthlyRow {
  yearMonth: string;
  stage: string;
  nReviews: number;
  meanRating: number;
}

export interface PricingSubTopic {
  id: number;
  label: string;
  frex: string[];
}

export interface QuoteReview {
  text: string;
  rating: number;
  date: string;
  era: string;
  stage: string;
}

export interface QuoteDrawerSet {
  reviews: QuoteReview[];
  contrastReviews?: QuoteReview[];
}

export interface ExplorerReview {
  id: string;
  text: string;
  rating: number;
  date: string;
  era: string;
  stage: string;
  sentiment: number;
}

export interface SiteData {
  ratingDistribution: RatingRow[];
  monthly: MonthlyRow[];
  monthlyFitted: MonthlyFittedRow[];
  itsCoefficients: ITSCoefficients;
  rdEstimate: RDEstimate;
  dailyRD: DailyRDRow[];
  topics: Topic[];
  lexicalShifts: { increased: LexicalEntry[]; decreased: LexicalEntry[] };
  stageRatings: StageRating[];
  stageMonthly: StageMonthlyRow[];
  pricingSubTopics: PricingSubTopic[];
  quoteDrawers: Record<string, QuoteDrawerSet>;
}

// ── Constants ───────────────────────────────────────────────────────────

export const BASE_PATH = "/betterhelp";

// ── Data export ─────────────────────────────────────────────────────────

export const siteData = siteDataJson as unknown as SiteData;
