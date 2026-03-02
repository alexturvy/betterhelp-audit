# =============================================================================
# BetterHelp Trustpilot Review Analysis Pipeline
# Three-pass architecture: Temporal → Journey-Stage → Within-Stage Lexical
# =============================================================================

library(tidyverse)
library(tidytext)
library(lubridate)
library(zoo)
library(slider)
library(quanteda)
library(sentimentr)
library(jsonlite)
library(syuzhet)

# --- Configuration -----------------------------------------------------------

DATA_PATH   <- "betterhelp_reviews.csv"
OUTPUT_DIR  <- "output"
PLOTS_DIR   <- "plots"

# Era boundaries (key business events)
ERA_BREAKS <- as.Date(c(
  "2023-03-01",  # FTC complaint filed
  "2023-08-01",  # FTC settlement announced (~July, using Aug as boundary)
  "2024-03-01"   # Insurance expansion era begins (early-mid 2024)
))

ERA_LABELS <- c(
  "Pre-FTC Complaint",
  "FTC Settlement Period",
  "Post-FTC Recovery",
  "Insurance Expansion"
)

# Key terms to track across time
TRACKED_TERMS <- c(
  "trust", "privacy", "data", "insurance", "covered", "expensive",
  "worth", "scam", "refund", "cancel", "match", "switch", "wait",
  "affordable", "convenient", "vulnerable", "charge", "billing"
)

# Journey-stage keyword dictionaries
STAGE_DICTIONARIES <- list(
  signup_intake = c(
    "sign up", "signed up", "signing up", "signup", "registration",
    "register", "intake", "questionnaire", "onboarding", "started",
    "joined", "enrolled", "trial", "free trial", "account"
  ),
  pricing_payment = c(
    "cost", "expensive", "price", "pricing", "afford", "affordable",
    "insurance", "covered", "coverage", "pay", "payment", "subscription",
    "charge", "charged", "charging", "refund", "refunded", "billing",
    "billed", "fee", "fees", "money", "worth it", "worth the money",
    "financial aid", "discount", "coupon", "free week"
  ),
  matching = c(
    "match", "matched", "matching", "assigned", "paired", "pairing",
    "therapist i got", "wrong fit", "not a good fit", "bad fit",
    "good fit", "great fit", "perfect fit", "finding a therapist",
    "find a therapist", "algorithm", "preferences"
  ),
  first_session = c(
    "first session", "first appointment", "first meeting", "initial session",
    "first time", "first call", "introductory", "first video",
    "first chat", "first message"
  ),
  ongoing_sessions = c(
    "sessions", "weekly", "regular", "consistent", "ongoing",
    "video call", "video chat", "live session", "messaging",
    "journal", "worksheet", "homework", "progress", "improving",
    "helped me", "helping me", "therapy sessions"
  ),
  therapist_switching = c(
    "switch", "switched", "switching", "change therapist",
    "changed therapist", "new therapist", "different therapist",
    "replaced", "reassigned", "another therapist", "second therapist",
    "third therapist"
  ),
  cancellation_churn = c(
    "cancel", "cancelled", "canceled", "cancellation", "cancelling",
    "unsubscribe", "quit", "stopped", "left", "leaving",
    "end my subscription", "deactivate", "delete account",
    "hard to cancel", "couldn't cancel", "still charging"
  )
)


# --- Setup -------------------------------------------------------------------

dir.create(OUTPUT_DIR, showWarnings = FALSE)
dir.create(PLOTS_DIR, showWarnings = FALSE)


# --- Load & Clean ------------------------------------------------------------

load_reviews <- function(path) {
  df <- read.csv(path, stringsAsFactors = FALSE)

  df <- df %>%
    mutate(
      published_date = as.Date(published_date),
      experienced_date = as.Date(experienced_date),
      year_month = floor_date(published_date, "month"),
      text_lower = tolower(text),
      title_lower = tolower(title),
      # Combine title + text for analysis
      full_text = paste(title, text, sep = " "),
      full_text_lower = tolower(full_text),
      # Assign era
      era = cut(
        published_date,
        breaks = c(as.Date("2000-01-01"), ERA_BREAKS, as.Date("2030-01-01")),
        labels = ERA_LABELS,
        right = FALSE
      )
    ) %>%
    filter(!is.na(published_date))

  cat("Loaded", nrow(df), "reviews\n")
  cat("Date range:", as.character(min(df$published_date)),
      "to", as.character(max(df$published_date)), "\n")
  cat("Era distribution:\n")
  print(table(df$era))
  cat("\n")

  df
}


# =============================================================================
# PASS 1: TEMPORAL ARCHITECTURE
# =============================================================================

compute_temporal_trends <- function(df) {
  cat("--- Pass 1: Temporal Architecture ---\n")

  # Monthly aggregates
  monthly <- df %>%
    group_by(year_month) %>%
    summarize(
      n_reviews = n(),
      mean_rating = mean(rating, na.rm = TRUE),
      median_rating = median(rating, na.rm = TRUE),
      pct_1star = mean(rating == 1, na.rm = TRUE),
      pct_5star = mean(rating == 5, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(year_month) %>%
    mutate(
      rating_roll3 = rollmean(mean_rating, k = 3, fill = NA, align = "right"),
      volume_roll3 = rollmean(n_reviews, k = 3, fill = NA, align = "right")
    )

  # Term frequency over time
  term_freq <- map_dfr(TRACKED_TERMS, function(term) {
    df %>%
      group_by(year_month) %>%
      summarize(
        term = term,
        freq = mean(str_detect(full_text_lower, fixed(term)), na.rm = TRUE),
        count = sum(str_detect(full_text_lower, fixed(term)), na.rm = TRUE),
        .groups = "drop"
      )
  })

  term_freq_wide <- term_freq %>%
    select(year_month, term, freq) %>%
    pivot_wider(names_from = term, values_from = freq)

  # Merge monthly stats with term frequencies
  temporal <- monthly %>%
    left_join(term_freq_wide, by = "year_month") %>%
    mutate(
      era = cut(
        year_month,
        breaks = c(as.Date("2000-01-01"), ERA_BREAKS, as.Date("2030-01-01")),
        labels = ERA_LABELS,
        right = FALSE
      )
    )

  # --- Diagnostic plots ---

  # 1. Rating over time with era boundaries
  p1 <- ggplot(monthly, aes(x = year_month)) +
    geom_line(aes(y = mean_rating), alpha = 0.3) +
    geom_line(aes(y = rating_roll3), color = "steelblue", linewidth = 1) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "red", alpha = 0.7) +
    annotate("text", x = ERA_BREAKS, y = 5.1,
             label = c("FTC Complaint", "FTC Settlement", "Insurance Expansion"),
             angle = 90, hjust = 0, vjust = -0.5, size = 3, color = "red") +
    labs(title = "BetterHelp Mean Rating Over Time",
         subtitle = "3-month rolling average (blue), era boundaries (red dashed)",
         x = NULL, y = "Mean Rating") +
    theme_minimal() +
    ylim(1, 5.5)

  ggsave(file.path(PLOTS_DIR, "01_rating_over_time.png"), p1, width = 12, height = 6)

  # 2. Review volume over time
  p2 <- ggplot(monthly, aes(x = year_month, y = n_reviews)) +
    geom_col(fill = "steelblue", alpha = 0.5) +
    geom_line(aes(y = volume_roll3), color = "darkblue", linewidth = 1) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "red", alpha = 0.7) +
    labs(title = "Review Volume Over Time",
         subtitle = "Monthly count with 3-month rolling average",
         x = NULL, y = "Reviews per Month") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "02_volume_over_time.png"), p2, width = 12, height = 6)

  # 3. Key term frequency over time
  key_terms_plot <- term_freq %>%
    filter(term %in% c("trust", "privacy", "insurance", "scam", "expensive", "cancel")) %>%
    group_by(term) %>%
    mutate(freq_roll3 = rollmean(freq, k = 3, fill = NA, align = "right")) %>%
    ungroup()

  p3 <- ggplot(key_terms_plot, aes(x = year_month, y = freq_roll3, color = term)) +
    geom_line(linewidth = 0.8) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    labs(title = "Key Term Frequency Over Time",
         subtitle = "Proportion of reviews mentioning each term (3-month rolling avg)",
         x = NULL, y = "Proportion of Reviews", color = "Term") +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "03_term_frequency_over_time.png"), p3, width = 12, height = 6)

  # 4. 1-star vs 5-star proportion over time
  p4 <- monthly %>%
    select(year_month, pct_1star, pct_5star) %>%
    pivot_longer(cols = c(pct_1star, pct_5star), names_to = "metric", values_to = "value") %>%
    mutate(metric = recode(metric, pct_1star = "1-Star %", pct_5star = "5-Star %")) %>%
    ggplot(aes(x = year_month, y = value, color = metric)) +
    geom_line(alpha = 0.3) +
    geom_smooth(se = FALSE, method = "loess", span = 0.3) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    labs(title = "Proportion of 1-Star vs 5-Star Reviews Over Time",
         x = NULL, y = "Proportion", color = NULL) +
    scale_color_manual(values = c("1-Star %" = "firebrick", "5-Star %" = "forestgreen")) +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "04_star_proportions_over_time.png"), p4, width = 12, height = 6)

  cat("Pass 1 complete. Plots saved to", PLOTS_DIR, "\n\n")

  list(temporal = temporal, term_freq = term_freq, monthly = monthly)
}


# =============================================================================
# PASS 2: JOURNEY-STAGE CLASSIFICATION
# =============================================================================

classify_journey_stage <- function(df) {
  cat("--- Pass 2: Journey-Stage Classification ---\n")

  # Score each review against each stage dictionary
  stage_scores <- map_dfc(names(STAGE_DICTIONARIES), function(stage) {
    patterns <- STAGE_DICTIONARIES[[stage]]
    # Count how many dictionary terms match in each review
    score <- map_int(df$full_text_lower, function(txt) {
      sum(str_detect(txt, fixed(patterns)))
    })
    tibble(!!stage := score)
  })

  df_staged <- bind_cols(df, stage_scores)

  # Determine primary stage (highest score, with ties broken by order)
  stage_cols <- names(STAGE_DICTIONARIES)

  df_staged <- df_staged %>%
    mutate(
      max_score = pmax(!!!syms(stage_cols)),
      primary_stage = case_when(
        max_score == 0 ~ "general",
        TRUE ~ {
          scores_mat <- as.matrix(select(., all_of(stage_cols)))
          stage_cols[max.col(scores_mat, ties.method = "first")]
        }
      ),
      # Confidence: is it clearly one stage or ambiguous?
      n_stages_matched = rowSums(select(., all_of(stage_cols)) > 0),
      stage_confidence = case_when(
        max_score == 0 ~ "unclassified",
        n_stages_matched == 1 ~ "high",
        n_stages_matched == 2 ~ "medium",
        TRUE ~ "low"
      )
    )

  # Clean up stage names for display
  df_staged <- df_staged %>%
    mutate(
      primary_stage = recode(primary_stage,
        signup_intake = "Signup/Intake",
        pricing_payment = "Pricing/Payment",
        matching = "Matching",
        first_session = "First Session",
        ongoing_sessions = "Ongoing Sessions",
        therapist_switching = "Therapist Switching",
        cancellation_churn = "Cancellation/Churn",
        general = "General/Multiple"
      )
    )

  # --- Diagnostic output ---
  cat("Stage distribution:\n")
  print(table(df_staged$primary_stage))
  cat("\nConfidence distribution:\n")
  print(table(df_staged$stage_confidence))
  cat("\n")

  # Stage distribution plot
  stage_summary <- df_staged %>%
    count(primary_stage) %>%
    mutate(primary_stage = fct_reorder(primary_stage, n))

  p5 <- ggplot(stage_summary, aes(x = primary_stage, y = n)) +
    geom_col(fill = "steelblue") +
    geom_text(aes(label = n), hjust = -0.1, size = 3.5) +
    coord_flip() +
    labs(title = "Reviews by Journey Stage",
         subtitle = "Dictionary-based classification",
         x = NULL, y = "Number of Reviews") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "05_stage_distribution.png"), p5, width = 10, height = 6)

  # Rating by stage
  p6 <- df_staged %>%
    ggplot(aes(x = fct_reorder(primary_stage, rating, .fun = mean), y = rating)) +
    geom_boxplot(fill = "steelblue", alpha = 0.5, outlier.alpha = 0.1) +
    coord_flip() +
    labs(title = "Rating Distribution by Journey Stage",
         x = NULL, y = "Rating") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "06_rating_by_stage.png"), p6, width = 10, height = 6)

  cat("Pass 2 complete.\n\n")

  df_staged
}


# =============================================================================
# PASS 3: WITHIN-STAGE LEXICAL ANALYSIS
# =============================================================================

compute_stage_profiles <- function(df_staged) {
  cat("--- Pass 3: Within-Stage Lexical Analysis ---\n")

  stages <- unique(df_staged$primary_stage)

  # Tokenize all reviews
  tokens <- df_staged %>%
    select(id, primary_stage, era, rating, full_text) %>%
    unnest_tokens(word, full_text) %>%
    anti_join(stop_words, by = "word") %>%
    filter(str_length(word) > 2, !str_detect(word, "^\\d+$"))

  # --- TF-IDF by stage ---
  stage_words <- tokens %>%
    count(primary_stage, word, sort = TRUE) %>%
    bind_tf_idf(word, primary_stage, n)

  top_tfidf <- stage_words %>%
    group_by(primary_stage) %>%
    slice_max(tf_idf, n = 20, with_ties = FALSE) %>%
    ungroup()

  # --- Bigrams by stage ---
  bigrams <- df_staged %>%
    select(id, primary_stage, full_text) %>%
    unnest_tokens(bigram, full_text, token = "ngrams", n = 2) %>%
    separate(bigram, c("word1", "word2"), sep = " ") %>%
    filter(
      !word1 %in% stop_words$word,
      !word2 %in% stop_words$word,
      str_length(word1) > 2,
      str_length(word2) > 2,
      !str_detect(word1, "^\\d+$"),
      !str_detect(word2, "^\\d+$")
    ) %>%
    unite(bigram, word1, word2, sep = " ")

  top_bigrams <- bigrams %>%
    count(primary_stage, bigram, sort = TRUE) %>%
    group_by(primary_stage) %>%
    slice_max(n, n = 15, with_ties = FALSE) %>%
    ungroup()

  # --- Sentiment by stage (AFINN lexicon via tidytext) ---
  cat("Computing sentiment scores...\n")

  afinn <- get_sentiments("afinn")

  # Compute mean AFINN sentiment per review (sum of word values / word count)
  review_sentiment <- tokens %>%
    inner_join(afinn, by = "word") %>%
    group_by(id) %>%
    summarize(
      sentiment_sum = sum(value),
      sentiment_words = n(),
      sentiment = mean(value),
      .groups = "drop"
    )

  df_staged <- df_staged %>%
    left_join(review_sentiment %>% select(id, sentiment), by = "id") %>%
    mutate(sentiment = replace_na(sentiment, 0))

  stage_sentiment <- df_staged %>%
    group_by(primary_stage) %>%
    summarize(
      n = n(),
      mean_rating = mean(rating, na.rm = TRUE),
      mean_sentiment = mean(sentiment, na.rm = TRUE),
      sd_sentiment = sd(sentiment, na.rm = TRUE),
      pct_negative = mean(sentiment < -0.1, na.rm = TRUE),
      pct_neutral = mean(abs(sentiment) <= 0.1, na.rm = TRUE),
      pct_positive = mean(sentiment > 0.1, na.rm = TRUE),
      .groups = "drop"
    )

  # --- NRC Emotion analysis (using syuzhet's bundled NRC) ---
  cat("Computing NRC emotion profiles...\n")

  # Use syuzhet::get_nrc_sentiment on full review text (no download needed)
  nrc_raw <- get_nrc_sentiment(df_staged$full_text)
  nrc_raw$primary_stage <- df_staged$primary_stage

  emotion_cols <- c("anger", "anticipation", "disgust", "fear",
                    "joy", "sadness", "surprise", "trust",
                    "negative", "positive")

  emotion_by_stage <- nrc_raw %>%
    group_by(primary_stage) %>%
    summarize(across(all_of(emotion_cols), sum), .groups = "drop") %>%
    pivot_longer(cols = all_of(emotion_cols),
                 names_to = "sentiment", values_to = "n") %>%
    group_by(primary_stage) %>%
    mutate(proportion = n / sum(n)) %>%
    ungroup()

  # --- Build stage profiles ---
  profiles <- map(stages, function(stg) {
    tfidf_terms <- top_tfidf %>%
      filter(primary_stage == stg) %>%
      select(word, tf_idf, n) %>%
      as.data.frame()

    bg <- top_bigrams %>%
      filter(primary_stage == stg) %>%
      select(bigram, n) %>%
      as.data.frame()

    sent <- stage_sentiment %>%
      filter(primary_stage == stg) %>%
      as.data.frame()

    emotions <- emotion_by_stage %>%
      filter(primary_stage == stg) %>%
      select(sentiment, proportion, n) %>%
      as.data.frame()

    list(
      stage = stg,
      n_reviews = sent$n,
      mean_rating = round(sent$mean_rating, 2),
      sentiment = list(
        mean = round(sent$mean_sentiment, 3),
        sd = round(sent$sd_sentiment, 3),
        pct_negative = round(sent$pct_negative, 3),
        pct_neutral = round(sent$pct_neutral, 3),
        pct_positive = round(sent$pct_positive, 3)
      ),
      top_tfidf_terms = tfidf_terms,
      top_bigrams = bg,
      nrc_emotions = emotions
    )
  })
  names(profiles) <- stages

  # --- Diagnostic plots ---

  # Sentiment distribution by stage
  p7 <- df_staged %>%
    ggplot(aes(x = sentiment, fill = primary_stage)) +
    geom_density(alpha = 0.4) +
    facet_wrap(~primary_stage, scales = "free_y", ncol = 2) +
    labs(title = "Sentiment Distribution by Journey Stage",
         x = "Sentiment Score", y = "Density") +
    theme_minimal() +
    theme(legend.position = "none")

  ggsave(file.path(PLOTS_DIR, "07_sentiment_by_stage.png"), p7, width = 12, height = 10)

  # NRC emotion heatmap
  p8 <- emotion_by_stage %>%
    ggplot(aes(x = sentiment, y = primary_stage, fill = proportion)) +
    geom_tile() +
    scale_fill_viridis_c() +
    labs(title = "NRC Emotion Profile by Journey Stage",
         x = "Emotion", y = NULL, fill = "Proportion") +
    theme_minimal() +
    theme(axis.text.x = element_text(angle = 45, hjust = 1))

  ggsave(file.path(PLOTS_DIR, "08_nrc_emotion_heatmap.png"), p8, width = 12, height = 8)

  # Top TF-IDF terms for key stages
  top_stages <- c("Cancellation/Churn", "Pricing/Payment", "Matching", "Therapist Switching")
  p9 <- top_tfidf %>%
    filter(primary_stage %in% top_stages) %>%
    group_by(primary_stage) %>%
    slice_max(tf_idf, n = 10) %>%
    ungroup() %>%
    mutate(word = reorder_within(word, tf_idf, primary_stage)) %>%
    ggplot(aes(x = word, y = tf_idf, fill = primary_stage)) +
    geom_col(show.legend = FALSE) +
    facet_wrap(~primary_stage, scales = "free") +
    coord_flip() +
    scale_x_reordered() +
    labs(title = "Most Distinctive Terms by Journey Stage (TF-IDF)",
         x = NULL, y = "TF-IDF") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "09_tfidf_by_stage.png"), p9, width = 14, height = 10)

  cat("Pass 3 complete.\n\n")

  list(
    profiles = profiles,
    stage_sentiment = stage_sentiment,
    emotion_by_stage = emotion_by_stage,
    top_tfidf = top_tfidf,
    top_bigrams = top_bigrams,
    df_staged = df_staged
  )
}


# =============================================================================
# CROSS-CUT: TEMPORAL x STAGE
# =============================================================================

compute_temporal_by_stage <- function(df_staged) {
  cat("--- Computing temporal x stage intersection ---\n")

  temporal_stage <- df_staged %>%
    group_by(year_month, primary_stage) %>%
    summarize(
      n_reviews = n(),
      mean_rating = mean(rating, na.rm = TRUE),
      mean_sentiment = mean(sentiment, na.rm = TRUE),
      .groups = "drop"
    )

  # Plot: stage volume over time for key friction stages
  friction_stages <- c("Cancellation/Churn", "Pricing/Payment",
                        "Matching", "Therapist Switching")

  p10 <- temporal_stage %>%
    filter(primary_stage %in% friction_stages) %>%
    ggplot(aes(x = year_month, y = n_reviews, color = primary_stage)) +
    geom_line(alpha = 0.3) +
    geom_smooth(se = FALSE, method = "loess", span = 0.4) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    labs(title = "Friction Stage Review Volume Over Time",
         x = NULL, y = "Reviews per Month", color = "Stage") +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "10_friction_stages_over_time.png"), p10, width = 12, height = 6)

  # Sentiment by stage over time
  p11 <- temporal_stage %>%
    filter(primary_stage %in% friction_stages, n_reviews >= 3) %>%
    ggplot(aes(x = year_month, y = mean_sentiment, color = primary_stage)) +
    geom_point(alpha = 0.2, size = 1) +
    geom_smooth(se = FALSE, method = "loess", span = 0.5) +
    geom_hline(yintercept = 0, linetype = "dotted") +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    labs(title = "Sentiment by Friction Stage Over Time",
         x = NULL, y = "Mean Sentiment", color = "Stage") +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "11_sentiment_by_stage_over_time.png"), p11, width = 12, height = 6)

  cat("Temporal x stage complete.\n\n")

  temporal_stage
}


# =============================================================================
# LEXICAL SHIFTS ACROSS ERAS
# =============================================================================

compute_lexical_shifts <- function(df_staged) {
  cat("--- Computing lexical shifts across eras ---\n")

  tokens <- df_staged %>%
    select(id, era, full_text) %>%
    unnest_tokens(word, full_text) %>%
    anti_join(stop_words, by = "word") %>%
    filter(str_length(word) > 2, !str_detect(word, "^\\d+$"))

  # Term frequency by era
  era_words <- tokens %>%
    count(era, word) %>%
    group_by(era) %>%
    mutate(
      total = sum(n),
      freq = n / total
    ) %>%
    ungroup()

  # Compare insurance expansion era vs pre-FTC (the biggest contrast)
  if (all(c("Pre-FTC Complaint", "Insurance Expansion") %in% unique(df_staged$era))) {
    pre_ftc <- era_words %>%
      filter(era == "Pre-FTC Complaint") %>%
      select(word, freq_pre = freq, n_pre = n)

    insurance <- era_words %>%
      filter(era == "Insurance Expansion") %>%
      select(word, freq_ins = freq, n_ins = n)

    shifts <- full_join(pre_ftc, insurance, by = "word") %>%
      replace_na(list(freq_pre = 0, freq_ins = 0, n_pre = 0, n_ins = 0)) %>%
      filter(n_pre + n_ins >= 20) %>%  # minimum frequency threshold
      mutate(
        shift = freq_ins - freq_pre,
        log_ratio = log2((freq_ins + 1e-7) / (freq_pre + 1e-7)),
        abs_shift = abs(shift)
      ) %>%
      arrange(desc(abs_shift))

    # Top shifts plot
    top_shifts <- bind_rows(
      shifts %>% slice_max(shift, n = 15) %>% mutate(direction = "More in Insurance Era"),
      shifts %>% slice_min(shift, n = 15) %>% mutate(direction = "More in Pre-FTC Era")
    )

    p12 <- top_shifts %>%
      mutate(word = fct_reorder(word, shift)) %>%
      ggplot(aes(x = word, y = shift, fill = direction)) +
      geom_col() +
      coord_flip() +
      scale_fill_manual(values = c("More in Insurance Era" = "steelblue",
                                    "More in Pre-FTC Era" = "firebrick")) +
      labs(title = "Biggest Vocabulary Shifts: Pre-FTC vs Insurance Expansion Era",
           x = NULL, y = "Frequency Shift", fill = NULL) +
      theme_minimal() +
      theme(legend.position = "bottom")

    ggsave(file.path(PLOTS_DIR, "12_lexical_shifts.png"), p12, width = 12, height = 10)
  } else {
    shifts <- tibble()
    cat("Warning: Not enough era data for shift comparison.\n")
  }

  cat("Lexical shifts complete.\n\n")

  shifts
}


# =============================================================================
# JSON EXPORT
# =============================================================================

export_outputs <- function(temporal_results, df_staged, stage_results,
                           temporal_stage, lexical_shifts) {
  cat("--- Exporting JSON outputs ---\n")

  # 1. temporal_trends.json
  temporal_out <- temporal_results$temporal %>%
    mutate(across(where(is.Date), as.character))

  write_json(
    list(
      monthly = temporal_out,
      era_boundaries = list(
        dates = as.character(ERA_BREAKS),
        labels = c("FTC Complaint Filed", "FTC Settlement", "Insurance Expansion")
      ),
      tracked_terms = TRACKED_TERMS
    ),
    path = file.path(OUTPUT_DIR, "temporal_trends.json"),
    pretty = TRUE, auto_unbox = TRUE
  )

  # 2. journey_stage_reviews.json
  reviews_out <- df_staged %>%
    select(id, title, text, rating, published_date, era,
           primary_stage, stage_confidence, sentiment) %>%
    mutate(across(where(is.Date), as.character))

  write_json(reviews_out, file.path(OUTPUT_DIR, "journey_stage_reviews.json"),
             pretty = TRUE, auto_unbox = TRUE)

  # 3. stage_profiles.json
  write_json(stage_results$profiles,
             file.path(OUTPUT_DIR, "stage_profiles.json"),
             pretty = TRUE, auto_unbox = TRUE)

  # 4. temporal_by_stage.json
  ts_out <- temporal_stage %>%
    mutate(across(where(is.Date), as.character))

  write_json(ts_out, file.path(OUTPUT_DIR, "temporal_by_stage.json"),
             pretty = TRUE, auto_unbox = TRUE)

  # 5. lexical_shifts.json
  write_json(lexical_shifts, file.path(OUTPUT_DIR, "lexical_shifts.json"),
             pretty = TRUE, auto_unbox = TRUE)

  cat("All outputs written to", OUTPUT_DIR, "/\n")
  cat("Files:\n")
  cat("  1. temporal_trends.json\n")
  cat("  2. journey_stage_reviews.json\n")
  cat("  3. stage_profiles.json\n")
  cat("  4. temporal_by_stage.json\n")
  cat("  5. lexical_shifts.json\n\n")
}


# =============================================================================
# RUN PIPELINE
# =============================================================================

main <- function() {
  cat("=== BetterHelp Review Analysis Pipeline ===\n\n")

  # Load
  df <- load_reviews(DATA_PATH)

  # Pass 1: Temporal
  temporal_results <- compute_temporal_trends(df)

  # Pass 2: Journey-stage classification
  df_staged <- classify_journey_stage(df)

  # Pass 3: Within-stage lexical analysis
  stage_results <- compute_stage_profiles(df_staged)
  df_staged <- stage_results$df_staged

  # Cross-cut: temporal x stage
  temporal_stage <- compute_temporal_by_stage(df_staged)

  # Lexical shifts
  lexical_shifts <- compute_lexical_shifts(df_staged)

  # Export
  export_outputs(temporal_results, df_staged, stage_results,
                 temporal_stage, lexical_shifts)

  cat("=== Pipeline complete ===\n")

  # Return everything for interactive exploration
  invisible(list(
    df = df_staged,
    temporal = temporal_results,
    stages = stage_results,
    temporal_stage = temporal_stage,
    lexical_shifts = lexical_shifts
  ))
}

# Execute
results <- main()
