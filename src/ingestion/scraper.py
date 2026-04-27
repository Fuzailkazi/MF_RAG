"""
Scraper — fetches content from all URLs in sources.csv using crawl4ai.
Saves scraped markdown to data/raw/{sanitized_filename}.md
"""

import csv
import re
import asyncio
from pathlib import Path
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


RAW_DIR = Path("data/raw")
SOURCES_FILE = Path("sources.csv")


def sanitize_filename(url: str) -> str:
    """Turn a URL into a safe filename."""
    name = re.sub(r"https?://", "", url)
    name = re.sub(r"[^\w\-.]", "_", name)
    return name[:120] + ".md"


def load_sources() -> list[dict]:
    """Load all rows from sources.csv."""
    with open(SOURCES_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [row for row in reader if row["url"].strip()]


async def scrape_url(crawler: AsyncWebCrawler, url: str) -> str | None:
    """Scrape a single URL and return its markdown content."""
    try:
        config = CrawlerRunConfig(
            wait_until="networkidle",
            page_timeout=60000,
            delay_before_return_html=3.0,
        )
        result = await crawler.arun(url=url, config=config)
        if result.success and result.markdown:
            return result.markdown.raw_markdown
        else:
            print(f"  FAIL: {url} — {result.error_message}")
            return None
    except Exception as e:
        print(f"  ERROR: {url} — {e}")
        return None


async def scrape_all() -> list[dict]:
    """Scrape all URLs from sources.csv and save to data/raw/."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    sources = load_sources()
    results = []

    browser_config = BrowserConfig(headless=True)
    async with AsyncWebCrawler(config=browser_config) as crawler:
        for i, source in enumerate(sources, 1):
            url = source["url"].strip()
            print(f"[{i}/{len(sources)}] Scraping: {url}")

            content = await scrape_url(crawler, url)
            if content:
                filename = sanitize_filename(url)
                filepath = RAW_DIR / filename
                filepath.write_text(content, encoding="utf-8")
                print(f"  Saved: {filepath} ({len(content)} chars)")
                results.append({**source, "raw_file": str(filepath), "char_count": len(content)})
            else:
                print(f"  Skipped (no content)")

    print(f"\nDone: {len(results)}/{len(sources)} URLs scraped successfully.")
    return results


if __name__ == "__main__":
    asyncio.run(scrape_all())
