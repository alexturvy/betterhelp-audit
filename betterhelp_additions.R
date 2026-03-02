# =============================================================================
# BetterHelp Additions (v2)
# Supplements betterhelp_pipeline.R with:
#   1. Enhanced text preprocessing (lemmatization, spell correction, name filter)
#   2. Dictionary expansion + reclassification
#   3. Temporal fixes (min-n filter, 2019+ plots)
#   4. Structural Topic Model (STM)
#   5. Interrupted Time Series + Regression Discontinuity
#   6. Low-N stage representative reviews
# =============================================================================

library(tidyverse)
library(tidytext)
library(lubridate)
library(zoo)
library(quanteda)
library(quanteda.textstats)
library(textstem)
library(hunspell)
library(stm)
library(lmtest)
library(sandwich)
library(segmented)
library(rdrobust)
library(jsonlite)

# Fix namespace conflicts: MASS::select masks dplyr::select
select <- dplyr::select
filter <- dplyr::filter
collapse <- dplyr::collapse

# --- Reuse v1 constants ------------------------------------------------------

DATA_PATH   <- "betterhelp_reviews.csv"
OUTPUT_DIR  <- "output"
PLOTS_DIR   <- "plots"

ERA_BREAKS <- as.Date(c(
  "2023-03-01",
  "2023-08-01",
  "2024-03-01"
))

ERA_LABELS <- c(
  "Pre-FTC Complaint",
  "FTC Settlement Period",
  "Post-FTC Recovery",
  "Insurance Expansion"
)

TRACKED_TERMS <- c(
  "trust", "privacy", "data", "insurance", "covered", "expensive",
  "worth", "scam", "refund", "cancel", "match", "switch", "wait",
  "affordable", "convenient", "vulnerable", "charge", "billing"
)

# v1 stage dictionaries (copied so this script is standalone)
STAGE_DICTIONARIES_V1 <- list(
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

STAGE_DISPLAY_NAMES <- c(
  signup_intake       = "Signup/Intake",
  pricing_payment     = "Pricing/Payment",
  matching            = "Matching",
  first_session       = "First Session",
  ongoing_sessions    = "Ongoing Sessions",
  therapist_switching = "Therapist Switching",
  cancellation_churn  = "Cancellation/Churn"
)


# =============================================================================
# LOAD DATA
# =============================================================================

load_data <- function() {
  cat("=== Loading data ===\n")
  df <- read.csv(DATA_PATH, stringsAsFactors = FALSE) %>%
    mutate(
      published_date = as.Date(published_date),
      experienced_date = as.Date(experienced_date),
      year_month = floor_date(published_date, "month"),
      text_lower = tolower(text),
      title_lower = tolower(title),
      full_text = paste(title, text, sep = " "),
      full_text_lower = tolower(full_text),
      era = cut(
        published_date,
        breaks = c(as.Date("2000-01-01"), ERA_BREAKS, as.Date("2030-01-01")),
        labels = ERA_LABELS,
        right = FALSE
      )
    ) %>%
    filter(!is.na(published_date))

  cat("Loaded", nrow(df), "reviews\n\n")
  df
}


# =============================================================================
# MODULE 1: ENHANCED TEXT PREPROCESSING
# =============================================================================

preprocess_text <- function(df) {
  cat("=== Module 1: Enhanced Text Preprocessing ===\n")

  # --- 1a. Lemmatize ---
  cat("  Lemmatizing...\n")
  df$clean_text <- textstem::lemmatize_strings(df$full_text_lower)

  # Post-lemma corrections the lemmatizer misses
  post_lemma_map <- c(
    "cancellation" = "cancel",
    "cancellations" = "cancel",
    "therapists" = "therapist",
    "counsellors" = "counselor",
    "counsellor" = "counselor",
    "counselors" = "counselor",
    "sessions" = "session",
    "medications" = "medication",
    "appointments" = "appointment",
    "subscriptions" = "subscription"
  )

  for (from in names(post_lemma_map)) {
    df$clean_text <- str_replace_all(
      df$clean_text,
      paste0("\\b", from, "\\b"),
      post_lemma_map[[from]]
    )
  }

  # --- 1b. Targeted spelling correction ---
  cat("  Running targeted spelling correction...\n")

  # Tokenize to unique alpha-only words, compute doc frequency
  doc_freq <- df$clean_text %>%
    str_extract_all("[a-z]{4,}") %>%
    map(unique) %>%
    unlist() %>%
    table()

  # Candidates: appear in 2-10 reviews (likely typos, not jargon)
  protected <- c(
    "betterhelp", "telehealth", "cbt", "emdr", "adhd", "copay",
    "talkspace", "cerebral", "hipaa", "therapist", "counselor",
    "wellbeing", "mindfulness", "iop", "dbt", "cancelling", "cancelled"
  )
  candidates <- names(doc_freq[doc_freq >= 2 & doc_freq <= 10])
  candidates <- setdiff(candidates, protected)

  misspelled <- candidates[!hunspell::hunspell_check(candidates)]
  suggestions_raw <- hunspell::hunspell_suggest(misspelled)

  # Only auto-correct single-suggestion cases with similar length
  corrections <- tibble(original = misspelled, suggestions = suggestions_raw) %>%
    filter(map_int(suggestions, length) == 1) %>%
    mutate(correction = map_chr(suggestions, 1)) %>%
    filter(correction != original, abs(nchar(correction) - nchar(original)) <= 2) %>%
    select(original, correction)

  cat("  Spell corrections applied (", nrow(corrections), " tokens):\n")
  if (nrow(corrections) > 0) {
    print(corrections, n = min(30, nrow(corrections)))
    for (i in seq_len(nrow(corrections))) {
      df$clean_text <- str_replace_all(
        df$clean_text,
        paste0("\\b", corrections$original[i], "\\b"),
        corrections$correction[i]
      )
    }
  }

  # --- 1c. Therapist name detection ---
  cat("  Detecting therapist names...\n")

  # Find tokens near "therapist", "counselor", "dr.", "named" in original text
  name_context_pattern <- "(therapist|counselor|counsellor|dr\\.|named|name is|name was)\\s+(\\w+)"
  name_matches <- str_match_all(df$full_text_lower, name_context_pattern)
  nearby_tokens <- unique(unlist(map(name_matches, ~ .x[, 3])))

  # Also check 3-word window: extract words within 3 positions of trigger words
  trigger_pattern <- "(?:therapist|counselor|counsellor|dr\\.|named)"
  context_matches <- str_extract_all(
    df$full_text_lower,
    paste0("(?:\\w+\\s+){0,3}", trigger_pattern, "(?:\\s+\\w+){0,3}")
  )
  context_tokens <- unique(unlist(str_split(unlist(context_matches), "\\s+")))

  # Filter: capitalized in original text, fail hunspell, low doc frequency
  original_tokens <- unlist(str_split(df$full_text, "\\s+"))
  capitalized_tokens <- unique(original_tokens[str_detect(original_tokens, "^[A-Z][a-z]+")])
  capitalized_lower <- tolower(capitalized_tokens)

  # Get doc frequency for these
  cap_doc_freq <- doc_freq[capitalized_lower]
  cap_doc_freq[is.na(cap_doc_freq)] <- 0

  # Candidate names: capitalized, near trigger words, fail spell check, low freq
  potential_names <- capitalized_lower[
    capitalized_lower %in% context_tokens &
    !hunspell::hunspell_check(capitalized_lower) &
    cap_doc_freq <= 20 &
    nchar(capitalized_lower) >= 4
  ]

  # Remove common words, countries, adjectives that slip through
  common_words <- c(
    "the", "and", "but", "for", "was", "not", "this", "that",
    "with", "have", "from", "they", "been", "said", "each",
    "betterhelp", "therapist", "counselor", "therapy", "counseling",
    # Countries/nationalities
    "england", "ireland", "american", "english", "british", "australian",
    "canadian", "european", "african", "asian", "america", "australia",
    # Common informal/British words that fail hunspell
    "cancelling", "cancelled", "ive", "thats", "dont", "didnt", "doesnt",
    "wasnt", "isnt", "havent", "wont", "cant", "shouldnt", "wouldnt",
    "couldnt", "arent", "hasnt", "hadnt", "youre", "youve", "theyre",
    "hes", "shes", "whos", "whats", "lets", "its",
    # Common words that might appear capitalized at sentence start
    "really", "never", "always", "every", "still", "much", "very",
    "great", "good", "best", "worst", "life", "help", "feel",
    "like", "just", "also", "even", "back", "well", "need"
  )
  THERAPIST_NAMES <- setdiff(unique(potential_names), common_words)
  # Only keep purely alphabetic tokens (no digits, no punctuation residue)
  THERAPIST_NAMES <- THERAPIST_NAMES[str_detect(THERAPIST_NAMES, "^[a-z]+$")]

  cat("  Detected", length(THERAPIST_NAMES), "probable therapist names\n")
  if (length(THERAPIST_NAMES) > 0) {
    cat("  Examples:", paste(head(THERAPIST_NAMES, 15), collapse = ", "), "\n")
  }

  cat("Module 1 complete.\n\n")

  list(df = df, therapist_names = THERAPIST_NAMES, spell_corrections = corrections)
}


# =============================================================================
# MODULE 2: DICTIONARY EXPANSION + RECLASSIFICATION
# =============================================================================

reclassify_stages <- function(df) {
  cat("=== Module 2: Dictionary Expansion + Reclassification ===\n")

  # v2 dictionaries with expanded terms
  STAGE_DICTIONARIES_V2 <- list(
    signup_intake = STAGE_DICTIONARIES_V1$signup_intake,
    pricing_payment = c(
      STAGE_DICTIONARIES_V1$pricing_payment,
      "copay", "deductible", "auto-renew", "auto renew", "membership",
      "out of pocket", "out-of-pocket"
    ),
    matching = STAGE_DICTIONARIES_V1$matching,
    first_session = STAGE_DICTIONARIES_V1$first_session,
    ongoing_sessions = c(
      STAGE_DICTIONARIES_V1$ongoing_sessions,
      "listens", "understanding", "compassionate", "caring",
      "my therapist", "love my therapist", "great therapist",
      "life changing", "life-changing", "highly recommend",
      "safe space", "coping", "tools", "strategies", "growth",
      "healing", "amazing therapist", "wonderful therapist",
      "best therapist", "thankful", "grateful", "breakthrough",
      "changed my life", "saved my life"
    ),
    therapist_switching = STAGE_DICTIONARIES_V1$therapist_switching,
    cancellation_churn = c(
      STAGE_DICTIONARIES_V1$cancellation_churn,
      "stop charging", "keep charging", "tried to cancel",
      "impossible to cancel", "won't stop", "wont stop",
      "kept charging", "auto renewed", "auto-renewed"
    )
  )

  # Run v1 classification first (to produce migration matrix)
  classify_with_dict <- function(df, dictionaries) {
    stage_scores <- map_dfc(names(dictionaries), function(stage) {
      patterns <- dictionaries[[stage]]
      score <- map_int(df$full_text_lower, function(txt) {
        sum(str_detect(txt, fixed(patterns)))
      })
      tibble(!!stage := score)
    })

    stage_cols <- names(dictionaries)
    scored <- bind_cols(df %>% select(id), stage_scores)

    scored %>%
      mutate(
        max_score = pmax(!!!syms(stage_cols)),
        primary_stage = case_when(
          max_score == 0 ~ "general",
          TRUE ~ {
            scores_mat <- as.matrix(select(., all_of(stage_cols)))
            stage_cols[max.col(scores_mat, ties.method = "first")]
          }
        )
      ) %>%
      mutate(
        primary_stage = recode(primary_stage, !!!STAGE_DISPLAY_NAMES,
                               general = "General/Multiple")
      ) %>%
      select(id, primary_stage)
  }

  # v1 classification
  v1_stages <- classify_with_dict(df, STAGE_DICTIONARIES_V1) %>%
    rename(primary_stage_v1 = primary_stage)

  # v2 classification
  v2_stages <- classify_with_dict(df, STAGE_DICTIONARIES_V2) %>%
    rename(primary_stage_v2 = primary_stage)

  # Merge
  df <- df %>%
    left_join(v1_stages, by = "id") %>%
    left_join(v2_stages, by = "id")

  # Migration matrix
  migration <- df %>%
    count(primary_stage_v1, primary_stage_v2) %>%
    arrange(primary_stage_v1, primary_stage_v2)

  cat("  V1 stage distribution:\n")
  print(table(df$primary_stage_v1))
  cat("\n  V2 stage distribution:\n")
  print(table(df$primary_stage_v2))
  cat("\n  General/Multiple: v1 =", sum(df$primary_stage_v1 == "General/Multiple"),
      "-> v2 =", sum(df$primary_stage_v2 == "General/Multiple"), "\n")

  # --- Plot 13: Migration heatmap ---
  migration_pct <- migration %>%
    group_by(primary_stage_v1) %>%
    mutate(pct = n / sum(n)) %>%
    ungroup()

  p13 <- ggplot(migration_pct, aes(x = primary_stage_v2, y = primary_stage_v1, fill = pct)) +
    geom_tile(color = "white") +
    geom_text(aes(label = n), size = 3) +
    scale_fill_gradient(low = "white", high = "steelblue", labels = scales::percent) +
    labs(title = "Stage Classification Migration: v1 -> v2",
         subtitle = "Cell values show review count; fill shows row proportion",
         x = "V2 Classification", y = "V1 Classification", fill = "Row %") +
    theme_minimal() +
    theme(axis.text.x = element_text(angle = 45, hjust = 1))

  ggsave(file.path(PLOTS_DIR, "13_stage_migration.png"), p13, width = 12, height = 8)
  cat("  Plot 13 saved.\n")

  cat("Module 2 complete.\n\n")

  list(df = df, migration = migration)
}


# =============================================================================
# MODULE 3: TEMPORAL FIXES
# =============================================================================

fix_temporal <- function(df) {
  cat("=== Module 3: Temporal Fixes ===\n")

  MIN_MONTHLY_N <- 30
  MIN_STAGE_MONTHLY_N <- 5

  # Monthly aggregates with min-n filter
  monthly_v2 <- df %>%
    group_by(year_month) %>%
    summarize(
      n_reviews = n(),
      mean_rating = mean(rating, na.rm = TRUE),
      median_rating = median(rating, na.rm = TRUE),
      pct_1star = mean(rating == 1, na.rm = TRUE),
      pct_5star = mean(rating == 5, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    filter(n_reviews >= MIN_MONTHLY_N) %>%
    arrange(year_month) %>%
    mutate(
      rating_roll3 = rollmean(mean_rating, k = 3, fill = NA, align = "right"),
      volume_roll3 = rollmean(n_reviews, k = 3, fill = NA, align = "right")
    )

  cat("  Months with >=", MIN_MONTHLY_N, "reviews:", nrow(monthly_v2),
      "(range:", as.character(min(monthly_v2$year_month)), "to",
      as.character(max(monthly_v2$year_month)), ")\n")

  # Term frequency over time (filtered)
  term_freq_v2 <- map_dfr(TRACKED_TERMS, function(term) {
    df %>%
      group_by(year_month) %>%
      summarize(
        term = term,
        n_total = n(),
        freq = mean(str_detect(full_text_lower, fixed(term)), na.rm = TRUE),
        count = sum(str_detect(full_text_lower, fixed(term)), na.rm = TRUE),
        .groups = "drop"
      ) %>%
      filter(n_total >= MIN_MONTHLY_N)
  })

  # --- Plot 14: Fixed term frequency ---
  key_terms <- c("trust", "privacy", "insurance", "scam", "expensive", "cancel")

  key_terms_plot <- term_freq_v2 %>%
    filter(term %in% key_terms) %>%
    group_by(term) %>%
    mutate(freq_roll3 = rollmean(freq, k = 3, fill = NA, align = "right")) %>%
    ungroup()

  # Compute axis range from actual data
  y_range <- range(key_terms_plot$freq_roll3, na.rm = TRUE)
  y_pad <- diff(y_range) * 0.05

  p14 <- ggplot(key_terms_plot, aes(x = year_month, y = freq_roll3, color = term)) +
    geom_line(linewidth = 0.8) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    annotate("text", x = ERA_BREAKS, y = y_range[2] + y_pad,
             label = c("FTC Complaint", "FTC Settlement", "Insurance Expansion"),
             angle = 90, hjust = 0, vjust = -0.5, size = 2.5, color = "gray40") +
    coord_cartesian(ylim = c(y_range[1] - y_pad, y_range[2] + y_pad * 3)) +
    labs(title = "Key Term Frequency Over Time (FIXED: 2019+, min-n filtered)",
         subtitle = paste0("Months with <", MIN_MONTHLY_N, " reviews excluded; 3-month rolling avg"),
         x = NULL, y = "Proportion of Reviews", color = "Term") +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "14_term_frequency_v2.png"), p14, width = 12, height = 6)
  cat("  Plot 14 saved.\n")

  # Temporal x stage (v2 stages), min-n filtered
  temporal_stage_v2 <- df %>%
    group_by(year_month, primary_stage_v2) %>%
    summarize(
      n_reviews = n(),
      mean_rating = mean(rating, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    filter(n_reviews >= MIN_STAGE_MONTHLY_N)

  # Build temporal trends v2 JSON payload
  term_freq_wide_v2 <- term_freq_v2 %>%
    select(year_month, term, freq) %>%
    pivot_wider(names_from = term, values_from = freq)

  temporal_out <- monthly_v2 %>%
    left_join(term_freq_wide_v2, by = "year_month") %>%
    mutate(
      era = cut(
        year_month,
        breaks = c(as.Date("2000-01-01"), ERA_BREAKS, as.Date("2030-01-01")),
        labels = ERA_LABELS,
        right = FALSE
      )
    )

  cat("Module 3 complete.\n\n")

  list(
    monthly_v2 = monthly_v2,
    temporal_out = temporal_out,
    term_freq_v2 = term_freq_v2,
    temporal_stage_v2 = temporal_stage_v2
  )
}


# =============================================================================
# MODULE 4: STRUCTURAL TOPIC MODEL (STM)
# =============================================================================

run_stm <- function(df, therapist_names) {
  cat("=== Module 4: Structural Topic Model ===\n")

  # --- 4a. Corpus preparation ---
  cat("  Preparing corpus...\n")

  # Custom stopwords: therapist names + standard
  custom_stops <- c(therapist_names, "betterhelp", "better", "help",
                    "therapy", "therapist", "counselor", "counseling",
                    "online", "app", "platform", "review", "experience")

  processed <- textProcessor(
    documents = df$clean_text,
    metadata = df %>% select(id, era, published_date, rating, year_month,
                             primary_stage_v2),
    stem = FALSE,  # already lemmatized
    customstopwords = custom_stops,
    lowercase = TRUE,
    removenumbers = TRUE,
    removepunctuation = TRUE,
    verbose = FALSE
  )

  prepped <- prepDocuments(
    processed$documents,
    processed$vocab,
    processed$meta,
    lower.thresh = 3,  # min doc frequency of 3
    verbose = FALSE
  )

  cat("  Corpus:", length(prepped$documents), "documents,",
      length(prepped$vocab), "unique terms\n")

  # Add covariates to metadata
  prepped$meta <- prepped$meta %>%
    mutate(
      year_num = as.numeric(published_date - as.Date("2020-01-01")) / 365.25,
      rating_centered = rating - mean(rating, na.rm = TRUE)
    )

  # --- 4b. Model selection: searchK ---
  cat("  Running searchK for K = {10, 15, 20, 25, 30}...\n")
  cat("  (This may take 15-25 minutes)\n")

  K_candidates <- c(10, 15, 20, 25, 30)

  search_result <- searchK(
    documents = prepped$documents,
    vocab = prepped$vocab,
    K = K_candidates,
    prevalence = ~ era + s(year_num) + rating_centered,
    data = prepped$meta,
    init.type = "Spectral",
    verbose = FALSE
  )

  # Plot 15: searchK diagnostics
  sk_df <- data.frame(
    K = unlist(search_result$results$K),
    exclusivity = unlist(search_result$results$exclus),
    coherence = unlist(search_result$results$semcoh),
    residual = unlist(search_result$results$residual),
    heldout = unlist(search_result$results$heldout)
  )

  p15a <- ggplot(sk_df, aes(x = coherence, y = exclusivity, label = K)) +
    geom_point(size = 4, color = "steelblue") +
    geom_text(vjust = -1, size = 4) +
    labs(title = "STM Model Selection: Coherence vs Exclusivity",
         subtitle = "Higher on both axes is better; labeled by K",
         x = "Semantic Coherence", y = "Exclusivity") +
    theme_minimal()

  p15b <- sk_df %>%
    pivot_longer(cols = c(exclusivity, coherence, residual, heldout),
                 names_to = "metric", values_to = "value") %>%
    ggplot(aes(x = K, y = value)) +
    geom_line(color = "steelblue", linewidth = 0.8) +
    geom_point(color = "steelblue", size = 2) +
    facet_wrap(~metric, scales = "free_y") +
    labs(title = "STM Diagnostics Across K Values",
         x = "Number of Topics (K)", y = "Value") +
    theme_minimal()

  p15 <- patchwork::wrap_plots(p15a, p15b, ncol = 1)
  ggsave(file.path(PLOTS_DIR, "15_stm_searchK.png"), p15, width = 12, height = 10)
  cat("  Plot 15 saved.\n")

  # --- 4c. Global model: K=20 ---
  cat("  Fitting global STM (K=20)...\n")

  global_model <- stm(
    documents = prepped$documents,
    vocab = prepped$vocab,
    K = 20,
    prevalence = ~ era + s(year_num) + rating_centered,
    data = prepped$meta,
    init.type = "Spectral",
    verbose = FALSE
  )

  # Extract topic labels (FREX and Prob words)
  topic_words <- labelTopics(global_model, n = 10)

  topics_list <- map(1:20, function(k) {
    list(
      topic = k,
      frex = topic_words$frex[k, ],
      prob = topic_words$prob[k, ],
      lift = topic_words$lift[k, ],
      score = topic_words$score[k, ]
    )
  })

  # --- Plot 16: Top FREX words per topic ---
  frex_df <- map_dfr(1:20, function(k) {
    tibble(
      topic = paste0("Topic ", k),
      word = topic_words$frex[k, 1:7],
      rank = 1:7
    )
  })

  p16 <- frex_df %>%
    mutate(word = reorder_within(word, -rank, topic)) %>%
    ggplot(aes(x = word, y = 7 - rank + 1, fill = topic)) +
    geom_col(show.legend = FALSE) +
    facet_wrap(~topic, scales = "free_x", ncol = 5) +
    coord_flip() +
    scale_x_reordered() +
    labs(title = "STM Global Model: Top 7 FREX Words per Topic (K=20)",
         x = NULL, y = "Rank (higher = more distinctive)") +
    theme_minimal() +
    theme(strip.text = element_text(size = 8),
          axis.text.y = element_text(size = 7))

  ggsave(file.path(PLOTS_DIR, "16_stm_frex_words.png"), p16, width = 16, height = 14)
  cat("  Plot 16 saved.\n")

  # --- 4d. Era effects ---
  cat("  Estimating era effects...\n")

  effects <- estimateEffect(
    1:20 ~ era + s(year_num) + rating_centered,
    stmobj = global_model,
    metadata = prepped$meta,
    uncertainty = "Global"
  )

  # Extract era effects for each topic
  era_effects <- map_dfr(1:20, function(k) {
    s <- summary(effects, topics = k)
    coefs <- s$tables[[1]]
    coef_names <- rownames(coefs)

    # Find era coefficients
    era_rows <- grep("^era", coef_names)
    if (length(era_rows) == 0) return(tibble())

    tibble(
      topic = k,
      term = coef_names[era_rows],
      estimate = coefs[era_rows, "Estimate"],
      se = coefs[era_rows, "Std. Error"],
      t_value = coefs[era_rows, "t value"],
      p_value = coefs[era_rows, "Pr(>|t|)"]
    )
  })

  # Topic prevalence by era
  topic_props <- make.dt(global_model, meta = prepped$meta)
  topic_cols <- paste0("Topic", 1:20)

  prevalence_by_era <- topic_props %>%
    group_by(era) %>%
    summarize(across(all_of(topic_cols), mean, .names = "{.col}"), .groups = "drop") %>%
    pivot_longer(cols = all_of(topic_cols), names_to = "topic", values_to = "prevalence") %>%
    mutate(topic_num = as.integer(str_extract(topic, "\\d+")))

  # --- Plot 17: Prevalence by era heatmap ---
  p17 <- prevalence_by_era %>%
    mutate(topic_label = paste0("Topic ", topic_num)) %>%
    ggplot(aes(x = era, y = reorder(topic_label, topic_num), fill = prevalence)) +
    geom_tile(color = "white") +
    geom_text(aes(label = sprintf("%.2f", prevalence)), size = 2.5) +
    scale_fill_viridis_c(option = "magma", direction = -1) +
    labs(title = "STM Topic Prevalence by Era",
         x = NULL, y = NULL, fill = "Mean\nPrevalence") +
    theme_minimal() +
    theme(axis.text.x = element_text(angle = 30, hjust = 1))

  ggsave(file.path(PLOTS_DIR, "17_stm_prevalence_era.png"), p17, width = 12, height = 10)
  cat("  Plot 17 saved.\n")

  # --- Plot 18: Topic prevalence over time ---
  # Aggregate by month
  prevalence_monthly <- topic_props %>%
    mutate(year_month = floor_date(as.Date(published_date), "month")) %>%
    group_by(year_month) %>%
    summarize(
      n = n(),
      across(all_of(topic_cols), mean, .names = "{.col}"),
      .groups = "drop"
    ) %>%
    filter(n >= 30) %>%
    pivot_longer(cols = all_of(topic_cols), names_to = "topic", values_to = "prevalence") %>%
    mutate(topic_num = as.integer(str_extract(topic, "\\d+")))

  # Pick top-8 most variable topics for readability
  topic_variance <- prevalence_monthly %>%
    group_by(topic_num) %>%
    summarize(var = var(prevalence, na.rm = TRUE), .groups = "drop") %>%
    slice_max(var, n = 8)

  p18 <- prevalence_monthly %>%
    filter(topic_num %in% topic_variance$topic_num) %>%
    mutate(topic_label = paste0("Topic ", topic_num)) %>%
    ggplot(aes(x = year_month, y = prevalence, color = topic_label)) +
    geom_line(alpha = 0.5) +
    geom_smooth(se = FALSE, method = "loess", span = 0.4, linewidth = 0.8) +
    geom_vline(xintercept = ERA_BREAKS, linetype = "dashed", color = "gray50", alpha = 0.5) +
    labs(title = "STM Topic Prevalence Over Time (8 most variable topics)",
         subtitle = "Months with <30 reviews excluded; loess smoother",
         x = NULL, y = "Mean Topic Prevalence", color = NULL) +
    theme_minimal() +
    theme(legend.position = "bottom")

  ggsave(file.path(PLOTS_DIR, "18_stm_prevalence_time.png"), p18, width = 14, height = 7)
  cat("  Plot 18 saved.\n")

  # --- 4e. Topic correlation network ---
  cat("  Computing topic correlations...\n")
  topic_corr <- topicCorr(global_model, method = "simple")

  # Plot 19: correlation network
  adj <- topic_corr$cor
  adj[abs(adj) < 0.05] <- 0
  diag(adj) <- 0

  # Build edge list
  edges <- which(adj != 0 & upper.tri(adj), arr.ind = TRUE)
  if (nrow(edges) > 0) {
    edge_df <- tibble(
      from = edges[, 1],
      to = edges[, 2],
      weight = adj[edges]
    )

    # Simple force-directed layout via igraph if available, else grid
    if (requireNamespace("igraph", quietly = TRUE)) {
      g <- igraph::graph_from_data_frame(edge_df, directed = FALSE,
                                          vertices = data.frame(name = 1:20))
      layout <- igraph::layout_with_fr(g)
      node_df <- tibble(topic = 1:20, x = layout[, 1], y = layout[, 2])

      edge_plot <- edge_df %>%
        left_join(node_df, by = c("from" = "topic")) %>%
        rename(x_from = x, y_from = y) %>%
        left_join(node_df, by = c("to" = "topic")) %>%
        rename(x_to = x, y_to = y)

      p19 <- ggplot() +
        geom_segment(data = edge_plot,
                     aes(x = x_from, xend = x_to, y = y_from, yend = y_to),
                     color = "gray70", alpha = 0.6) +
        geom_point(data = node_df, aes(x = x, y = y),
                   size = 8, color = "steelblue") +
        geom_text(data = node_df, aes(x = x, y = y, label = topic),
                  size = 3, color = "white", fontface = "bold") +
        labs(title = "STM Topic Correlation Network",
             subtitle = "Edges show correlations > |0.05|") +
        theme_void()
    } else {
      # Fallback: simple heatmap
      corr_df <- as.data.frame(as.table(topic_corr$cor)) %>%
        rename(topic1 = Var1, topic2 = Var2, correlation = Freq)

      p19 <- ggplot(corr_df, aes(x = topic1, y = topic2, fill = correlation)) +
        geom_tile() +
        scale_fill_gradient2(low = "firebrick", mid = "white", high = "steelblue") +
        labs(title = "STM Topic Correlation Matrix") +
        theme_minimal()
    }
  } else {
    p19 <- ggplot() +
      annotate("text", x = 0.5, y = 0.5, label = "No topic correlations above threshold") +
      theme_void() +
      labs(title = "STM Topic Correlation Network")
  }

  ggsave(file.path(PLOTS_DIR, "19_stm_correlation_network.png"), p19, width = 10, height = 10)
  cat("  Plot 19 saved.\n")

  # --- 4f. Within-stage STM for high-volume stages ---
  cat("  Fitting within-stage STM models...\n")

  high_volume_stages <- c("Pricing/Payment", "Ongoing Sessions", "Matching")
  stage_stm_results <- list()

  for (stg in high_volume_stages) {
    stg_rows <- which(df$primary_stage_v2 == stg)
    if (length(stg_rows) < 500) {
      cat("    Skipping", stg, "( n =", length(stg_rows), "< 500)\n")
      next
    }
    cat("    Fitting STM for", stg, "(n =", length(stg_rows), ")...\n")

    stg_proc <- textProcessor(
      documents = df$clean_text[stg_rows],
      metadata = df[stg_rows, ] %>% select(id, era, published_date, rating, year_month),
      stem = FALSE,
      customstopwords = c(custom_stops, therapist_names),
      lowercase = TRUE,
      removenumbers = TRUE,
      removepunctuation = TRUE,
      verbose = FALSE
    )

    stg_prep <- prepDocuments(
      stg_proc$documents,
      stg_proc$vocab,
      stg_proc$meta,
      lower.thresh = 3,
      verbose = FALSE
    )

    stg_model <- stm(
      documents = stg_prep$documents,
      vocab = stg_prep$vocab,
      K = 10,
      prevalence = ~ era,
      data = stg_prep$meta,
      init.type = "Spectral",
      verbose = FALSE
    )

    stg_words <- labelTopics(stg_model, n = 10)

    stage_stm_results[[stg]] <- list(
      stage = stg,
      n_docs = length(stg_rows),
      topics = map(1:10, function(k) {
        list(
          topic = k,
          frex = stg_words$frex[k, ],
          prob = stg_words$prob[k, ]
        )
      })
    )
  }

  cat("Module 4 complete.\n\n")

  list(
    global_model = global_model,
    prepped = prepped,
    search_result = search_result,
    effects = effects,
    era_effects = era_effects,
    topics_list = topics_list,
    prevalence_by_era = prevalence_by_era,
    topic_corr = topic_corr,
    stage_stm_results = stage_stm_results
  )
}


# =============================================================================
# MODULE 5: INTERRUPTED TIME SERIES + REGRESSION DISCONTINUITY
# =============================================================================

run_its_rd <- function(df, monthly_v2) {
  cat("=== Module 5: ITS + Regression Discontinuity ===\n")

  # Use monthly_v2 (already min-n filtered) for ITS
  ts_data <- monthly_v2 %>%
    mutate(
      t = row_number(),
      # Event dummies and time-since
      post_ftc = as.integer(year_month >= as.Date("2023-03-01")),
      t_since_ftc = pmax(0, as.numeric(difftime(year_month, as.Date("2023-03-01"), units = "days")) / 30.44),
      post_settlement = as.integer(year_month >= as.Date("2023-08-01")),
      t_since_settlement = pmax(0, as.numeric(difftime(year_month, as.Date("2023-08-01"), units = "days")) / 30.44),
      post_insurance = as.integer(year_month >= as.Date("2024-03-01")),
      t_since_insurance = pmax(0, as.numeric(difftime(year_month, as.Date("2024-03-01"), units = "days")) / 30.44)
    )

  its_results <- list()

  # --- 5a. Single-event ITS for FTC complaint ---
  for (outcome in c("mean_rating", "pct_1star")) {
    cat("  ITS for", outcome, "(FTC complaint)...\n")

    formula <- as.formula(paste(outcome, "~ t + post_ftc + t_since_ftc"))
    model <- lm(formula, data = ts_data)

    # Newey-West HAC standard errors (lag = 3)
    nw_vcov <- NeweyWest(model, lag = 3, prewhite = FALSE)
    nw_test <- coeftest(model, vcov. = nw_vcov)

    its_results[[paste0("ftc_", outcome)]] <- list(
      outcome = outcome,
      event = "FTC Complaint (2023-03)",
      coefficients = as.data.frame(nw_test[, ]),
      r_squared = summary(model)$r.squared,
      n_months = nrow(ts_data)
    )
  }

  # --- 5b. Multi-event ITS (all three events) ---
  for (outcome in c("mean_rating", "pct_1star")) {
    cat("  Multi-event ITS for", outcome, "...\n")

    formula <- as.formula(paste(
      outcome,
      "~ t + post_ftc + t_since_ftc + post_settlement + t_since_settlement + post_insurance + t_since_insurance"
    ))
    model <- lm(formula, data = ts_data)
    nw_vcov <- NeweyWest(model, lag = 3, prewhite = FALSE)
    nw_test <- coeftest(model, vcov. = nw_vcov)

    its_results[[paste0("multi_", outcome)]] <- list(
      outcome = outcome,
      event = "Multi-intervention (FTC + Settlement + Insurance)",
      coefficients = as.data.frame(nw_test[, ]),
      r_squared = summary(model)$r.squared,
      n_months = nrow(ts_data)
    )
  }

  # --- Plot 20: ITS mean_rating ---
  ftc_model <- lm(mean_rating ~ t + post_ftc + t_since_ftc, data = ts_data)
  ts_data$fitted_rating <- predict(ftc_model)

  p20 <- ggplot(ts_data, aes(x = year_month)) +
    geom_point(aes(y = mean_rating), alpha = 0.5, size = 2) +
    geom_line(aes(y = fitted_rating), color = "firebrick", linewidth = 1) +
    geom_vline(xintercept = as.Date("2023-03-01"), linetype = "dashed", color = "red") +
    annotate("text", x = as.Date("2023-03-01"), y = max(ts_data$mean_rating, na.rm = TRUE),
             label = "FTC Complaint", angle = 90, vjust = -0.5, color = "red", size = 3) +
    labs(title = "Interrupted Time Series: Mean Rating at FTC Complaint",
         subtitle = "Segmented regression with Newey-West HAC SEs",
         x = NULL, y = "Mean Monthly Rating") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "20_its_mean_rating.png"), p20, width = 12, height = 6)
  cat("  Plot 20 saved.\n")

  # --- Plot 21: ITS pct_1star ---
  ftc_model_1star <- lm(pct_1star ~ t + post_ftc + t_since_ftc, data = ts_data)
  ts_data$fitted_1star <- predict(ftc_model_1star)

  p21 <- ggplot(ts_data, aes(x = year_month)) +
    geom_point(aes(y = pct_1star), alpha = 0.5, size = 2) +
    geom_line(aes(y = fitted_1star), color = "firebrick", linewidth = 1) +
    geom_vline(xintercept = as.Date("2023-03-01"), linetype = "dashed", color = "red") +
    annotate("text", x = as.Date("2023-03-01"), y = max(ts_data$pct_1star, na.rm = TRUE),
             label = "FTC Complaint", angle = 90, vjust = -0.5, color = "red", size = 3) +
    labs(title = "Interrupted Time Series: % 1-Star Reviews at FTC Complaint",
         subtitle = "Segmented regression with Newey-West HAC SEs",
         x = NULL, y = "Proportion 1-Star Reviews") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "21_its_pct_1star.png"), p21, width = 12, height = 6)
  cat("  Plot 21 saved.\n")

  # --- 5c. Regression Discontinuity for FTC complaint ---
  cat("  Running regression discontinuity...\n")

  # Running variable: days from FTC complaint
  ftc_date <- as.Date("2023-03-01")
  rd_data <- df %>%
    mutate(days_from_ftc = as.numeric(published_date - ftc_date)) %>%
    group_by(published_date) %>%
    summarize(
      mean_rating = mean(rating, na.rm = TRUE),
      pct_1star = mean(rating == 1, na.rm = TRUE),
      n = n(),
      days_from_ftc = first(days_from_ftc),
      .groups = "drop"
    ) %>%
    filter(n >= 3)  # at least 3 reviews per day

  rd_results <- list()

  tryCatch({
    rd_fit <- rdrobust(
      y = rd_data$mean_rating,
      x = rd_data$days_from_ftc,
      c = 0,
      kernel = "triangular",
      bwselect = "mserd"
    )

    rd_results$rdrobust <- list(
      estimate = rd_fit$coef[1],
      se = rd_fit$se[1],
      p_value = rd_fit$pv[1],
      ci_lower = rd_fit$ci[1, 1],
      ci_upper = rd_fit$ci[1, 2],
      bandwidth = rd_fit$bws[1, 1],
      n_left = rd_fit$N_h[1],
      n_right = rd_fit$N_h[2]
    )

    cat("  RD estimate:", round(rd_fit$coef[1], 4),
        "(p =", round(rd_fit$pv[1], 4), ")\n")
    cat("  Bandwidth:", round(rd_fit$bws[1, 1], 1), "days\n")
  }, error = function(e) {
    cat("  rdrobust failed:", conditionMessage(e), "\n")
    cat("  Falling back to manual +/- 6 month window...\n")
  })

  # Fallback / supplement: manual +/- 6 month window
  window_data <- rd_data %>%
    filter(abs(days_from_ftc) <= 180)

  if (nrow(window_data) > 10) {
    manual_rd <- lm(mean_rating ~ days_from_ftc * I(days_from_ftc >= 0), data = window_data)
    rd_results$manual_6mo <- list(
      coefficients = as.data.frame(summary(manual_rd)$coefficients),
      r_squared = summary(manual_rd)$r.squared,
      n_obs = nrow(window_data)
    )
  }

  # --- Plot 22: RD visualization ---
  rd_plot_data <- rd_data %>%
    filter(abs(days_from_ftc) <= 365)

  p22 <- ggplot(rd_plot_data, aes(x = days_from_ftc, y = mean_rating)) +
    geom_point(aes(size = n), alpha = 0.3, color = "gray40") +
    geom_smooth(data = filter(rd_plot_data, days_from_ftc < 0),
                method = "loess", span = 0.5, color = "steelblue", se = TRUE) +
    geom_smooth(data = filter(rd_plot_data, days_from_ftc >= 0),
                method = "loess", span = 0.5, color = "firebrick", se = TRUE) +
    geom_vline(xintercept = 0, linetype = "dashed", color = "red") +
    annotate("text", x = 0, y = max(rd_plot_data$mean_rating, na.rm = TRUE),
             label = "FTC Complaint\n(March 2023)", hjust = -0.1, color = "red", size = 3) +
    scale_size_continuous(range = c(1, 5), guide = "none") +
    labs(title = "Regression Discontinuity: Mean Rating Around FTC Complaint",
         subtitle = "Local polynomial fit; point size = daily review count",
         x = "Days from FTC Complaint (March 2023)", y = "Mean Daily Rating") +
    theme_minimal()

  ggsave(file.path(PLOTS_DIR, "22_rd_ftc.png"), p22, width = 12, height = 6)
  cat("  Plot 22 saved.\n")

  cat("Module 5 complete.\n\n")

  list(
    its_results = its_results,
    rd_results = rd_results,
    ts_data = ts_data
  )
}


# =============================================================================
# MODULE 6: LOW-N STAGE REPRESENTATIVE REVIEWS
# =============================================================================

extract_representatives <- function(df) {
  cat("=== Module 6: Low-N Stage Representatives ===\n")

  low_n_stages <- c("Therapist Switching", "First Session", "Cancellation/Churn")
  representatives <- list()

  for (stg in low_n_stages) {
    stg_reviews <- df %>% filter(primary_stage_v2 == stg)
    n_stg <- nrow(stg_reviews)

    if (n_stg < 5) {
      cat("  Skipping", stg, "(n =", n_stg, ")\n")
      next
    }

    cat("  Processing", stg, "(n =", n_stg, ")...\n")

    # Build DFM and compute centroid
    stg_corpus <- corpus(stg_reviews$clean_text)
    stg_dfm <- dfm(quanteda::tokens(stg_corpus, remove_punct = TRUE, remove_numbers = TRUE)) %>%
      dfm_remove(stopwords("en")) %>%
      dfm_trim(min_termfreq = 2)

    if (nfeat(stg_dfm) == 0) {
      cat("    Empty DFM, skipping.\n")
      next
    }

    centroid <- colMeans(as.matrix(stg_dfm))

    # Cosine similarity of each review to centroid
    dfm_mat <- as.matrix(stg_dfm)
    cos_sim <- apply(dfm_mat, 1, function(row) {
      denom <- sqrt(sum(row^2)) * sqrt(sum(centroid^2))
      if (denom == 0) return(0)
      sum(row * centroid) / denom
    })

    stg_reviews$similarity <- cos_sim

    # Diversity-sample across rating bins
    n_target <- min(15, n_stg)

    # Create rating bins
    stg_reviews$rating_bin <- cut(stg_reviews$rating, breaks = c(0, 2, 3, 5),
                                   labels = c("1-2", "3", "4-5"))

    # Sample proportionally from each bin, weighted by similarity
    sampled <- stg_reviews %>%
      group_by(rating_bin) %>%
      slice_max(similarity, n = ceiling(n_target / 3), with_ties = FALSE) %>%
      ungroup() %>%
      slice_max(similarity, n = n_target, with_ties = FALSE) %>%
      arrange(desc(similarity))

    representatives[[stg]] <- sampled %>%
      select(id, title, text, rating, published_date, similarity, rating_bin) %>%
      mutate(stage = stg, across(where(is.Date), as.character))

    cat("    Selected", nrow(sampled), "representatives\n")
  }

  cat("Module 6 complete.\n\n")

  representatives
}


# =============================================================================
# JSON EXPORT
# =============================================================================

export_additions <- function(migration, temporal_out, stm_results,
                              its_rd_results, representatives) {
  cat("=== Exporting JSON outputs ===\n")

  # 1. stage_migration.json
  write_json(migration, file.path(OUTPUT_DIR, "stage_migration.json"),
             pretty = TRUE, auto_unbox = TRUE)
  cat("  1. stage_migration.json\n")

  # 2. temporal_trends_v2.json
  temporal_json <- temporal_out %>%
    mutate(across(where(is.Date), as.character))

  write_json(
    list(
      monthly = temporal_json,
      era_boundaries = list(
        dates = as.character(ERA_BREAKS),
        labels = c("FTC Complaint Filed", "FTC Settlement", "Insurance Expansion")
      ),
      note = "Min-n filtered: months with <30 reviews excluded"
    ),
    file.path(OUTPUT_DIR, "temporal_trends_v2.json"),
    pretty = TRUE, auto_unbox = TRUE
  )
  cat("  2. temporal_trends_v2.json\n")

  # 3. stm_global_topics.json
  stm_global <- list(
    model_k = 20,
    topics = stm_results$topics_list,
    prevalence_by_era = stm_results$prevalence_by_era %>%
      mutate(across(where(is.factor), as.character)),
    era_effects = stm_results$era_effects
  )
  write_json(stm_global, file.path(OUTPUT_DIR, "stm_global_topics.json"),
             pretty = TRUE, auto_unbox = TRUE)
  cat("  3. stm_global_topics.json\n")

  # 4. stm_stage_topics.json
  write_json(stm_results$stage_stm_results,
             file.path(OUTPUT_DIR, "stm_stage_topics.json"),
             pretty = TRUE, auto_unbox = TRUE)
  cat("  4. stm_stage_topics.json\n")

  # 5. its_rd_results.json
  its_rd_json <- list(
    its = its_rd_results$its_results,
    rd = its_rd_results$rd_results,
    monthly_ts = its_rd_results$ts_data %>%
      mutate(across(where(is.Date), as.character)) %>%
      select(year_month, n_reviews, mean_rating, pct_1star, pct_5star,
             t, post_ftc, t_since_ftc, fitted_rating, fitted_1star)
  )
  write_json(its_rd_json, file.path(OUTPUT_DIR, "its_rd_results.json"),
             pretty = TRUE, auto_unbox = TRUE)
  cat("  5. its_rd_results.json\n")

  # 6. low_n_stage_representatives.json
  write_json(representatives, file.path(OUTPUT_DIR, "low_n_stage_representatives.json"),
             pretty = TRUE, auto_unbox = TRUE)
  cat("  6. low_n_stage_representatives.json\n")

  cat("All outputs written to", OUTPUT_DIR, "/\n\n")
}


# =============================================================================
# MAIN
# =============================================================================

main <- function() {
  cat("=== BetterHelp Additions Pipeline (v2) ===\n\n")
  start_time <- Sys.time()

  # Load
  df <- load_data()

  # Module 1: Enhanced preprocessing
  preproc <- preprocess_text(df)
  df <- preproc$df
  therapist_names <- preproc$therapist_names

  # Module 2: Dictionary expansion + reclassification
  reclass <- reclassify_stages(df)
  df <- reclass$df

  # Module 3: Temporal fixes
  temporal <- fix_temporal(df)

  # Module 4: STM
  stm_results <- run_stm(df, therapist_names)

  # Module 5: ITS + RD
  its_rd_results <- run_its_rd(df, temporal$monthly_v2)

  # Module 6: Low-N representatives
  representatives <- extract_representatives(df)

  # Export
  export_additions(reclass$migration, temporal$temporal_out,
                   stm_results, its_rd_results, representatives)

  elapsed <- difftime(Sys.time(), start_time, units = "mins")
  cat("=== Pipeline complete in", round(as.numeric(elapsed), 1), "minutes ===\n")

  invisible(list(
    df = df,
    preproc = preproc,
    temporal = temporal,
    stm = stm_results,
    its_rd = its_rd_results,
    representatives = representatives
  ))
}

# Execute
results <- main()
