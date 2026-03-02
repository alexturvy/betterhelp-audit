#!/usr/bin/env python3
"""
Scrape all BetterHelp reviews from Trustpilot using Chrome session cookies.
Outputs: betterhelp_reviews.csv
"""

import json
import csv
import time
import re
import sys
import browser_cookie3
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.trustpilot.com/review/www.betterhelp.com"
OUTPUT_FILE = "betterhelp_reviews.csv"
DELAY = 1.5  # seconds between requests to be polite

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


COOKIE_FILE = "/Users/alexturvy/Library/Application Support/Google/Chrome/Profile 2/Cookies"


def get_chrome_cookies():
    """Load Trustpilot cookies from Chrome Profile 2."""
    print("Loading Trustpilot cookies from Chrome Profile 2...")
    try:
        # browser_cookie3 returns a CookieJar — assign directly to session.cookies
        jar = browser_cookie3.chrome(domain_name=".trustpilot.com", cookie_file=COOKIE_FILE)
        cookie_list = list(jar)
        print(f"  Loaded {len(cookie_list)} cookies.")
        return jar
    except Exception as e:
        print(f"  Warning: Could not load Chrome cookies: {e}")
        print("  Trying without cookies (may fail after page 10)...")
        return None


def fetch_page(session, page_num):
    """Fetch a single review page and return parsed review list."""
    url = f"{BASE_URL}?languages=en&page={page_num}"
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ERROR fetching page {page_num}: {e}")
        return None, None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Extract __NEXT_DATA__ JSON embedded in the page
    next_data_tag = soup.find("script", id="__NEXT_DATA__")
    if not next_data_tag:
        print(f"  ERROR: No __NEXT_DATA__ found on page {page_num}")
        return None, None

    try:
        data = json.loads(next_data_tag.string)
    except json.JSONDecodeError as e:
        print(f"  ERROR parsing JSON on page {page_num}: {e}")
        return None, None

    props = data.get("props", {}).get("pageProps", {})
    reviews = props.get("reviews", [])
    pagination = props.get("filters", {}).get("pagination", {})
    total_pages = pagination.get("totalPages", 1)

    return reviews, total_pages


def flatten_review(r):
    """Flatten a review dict into a flat CSV-friendly dict."""
    consumer = r.get("consumer", {}) or {}
    dates = r.get("dates", {}) or {}
    labels = r.get("labels", {}) or {}
    verification = labels.get("verification", {}) or {}
    reply = r.get("reply", {})

    return {
        "id": r.get("id"),
        "title": r.get("title"),
        "text": (r.get("text") or "").replace("\n", " ").strip(),
        "rating": r.get("rating"),
        "likes": r.get("likes"),
        "source": r.get("source"),
        "is_verified": verification.get("isVerified"),
        "verification_level": verification.get("verificationLevel"),
        "experienced_date": dates.get("experiencedDate"),
        "published_date": dates.get("publishedDate"),
        "updated_date": dates.get("updatedDate"),
        "consumer_id": consumer.get("id"),
        "consumer_name": consumer.get("displayName"),
        "consumer_reviews_count": consumer.get("numberOfReviews"),
        "consumer_country": consumer.get("countryCode"),
        "has_reply": bool(reply),
        "reply_text": ((reply or {}).get("text") or "").replace("\n", " ").strip() if reply else "",
        "reply_date": (reply or {}).get("publishedDate") if reply else "",
    }


CSV_FIELDS = [
    "id", "title", "text", "rating", "likes", "source",
    "is_verified", "verification_level",
    "experienced_date", "published_date", "updated_date",
    "consumer_id", "consumer_name", "consumer_reviews_count", "consumer_country",
    "has_reply", "reply_text", "reply_date",
]


def main():
    cookies = get_chrome_cookies()

    session = requests.Session()
    if cookies:
        session.cookies = requests.cookies.RequestsCookieJar()
        for cookie in cookies:
            session.cookies.set_cookie(cookie)

    # Fetch page 1 to get total pages
    print("Fetching page 1 to determine total pages...")
    reviews, total_pages = fetch_page(session, 1)
    if reviews is None:
        print("Failed to fetch page 1. Exiting.")
        sys.exit(1)

    print(f"Total pages: {total_pages}")
    print(f"Writing to: {OUTPUT_FILE}")

    total_written = 0

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()

        # Write page 1 reviews
        for r in reviews:
            writer.writerow(flatten_review(r))
        total_written += len(reviews)
        print(f"  Page 1: {len(reviews)} reviews (total: {total_written})")

        # Fetch remaining pages
        for page in range(2, total_pages + 1):
            time.sleep(DELAY)
            reviews, _ = fetch_page(session, page)

            if reviews is None:
                print(f"  Skipping page {page} due to error.")
                continue

            for r in reviews:
                writer.writerow(flatten_review(r))
            total_written += len(reviews)

            if page % 10 == 0 or page == total_pages:
                print(f"  Page {page}/{total_pages}: {len(reviews)} reviews (total: {total_written})")

            # Flush periodically so we don't lose progress
            if page % 50 == 0:
                f.flush()

    print(f"\nDone! {total_written} reviews saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
