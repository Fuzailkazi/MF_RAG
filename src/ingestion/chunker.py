"""
Chunker — splits scraped markdown files into chunks with metadata.
Uses LangChain RecursiveCharacterTextSplitter.
"""

import csv
from pathlib import Path
from datetime import date
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.config import CHUNK_SIZE, CHUNK_OVERLAP, SCHEME_REGISTRY


RAW_DIR = Path("data/raw")
SOURCES_FILE = Path("sources.csv")

# Map CSV scheme names to canonical registry names
_SCHEME_NORMALIZE = {}
for _canonical, _info in SCHEME_REGISTRY.items():
    _SCHEME_NORMALIZE[_canonical.lower()] = _canonical
    for _alias in _info["aliases"]:
        _SCHEME_NORMALIZE[_alias.lower()] = _canonical


def normalize_scheme_name(raw_name: str) -> str:
    """Normalize a scheme name from CSV to match the registry."""
    if not raw_name:
        return ""
    lower = raw_name.lower()
    for key, canonical in _SCHEME_NORMALIZE.items():
        if key in lower:
            return canonical
    return raw_name


def load_sources() -> list[dict]:
    """Load sources.csv as list of dicts."""
    with open(SOURCES_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [row for row in reader if row["url"].strip()]


def chunk_all() -> list[dict]:
    """
    Read each scraped file from data/raw/, split into chunks,
    and attach metadata from sources.csv.

    Returns a list of dicts: {text, metadata}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " "],
    )

    sources = load_sources()
    all_chunks = []

    for source in sources:
        url = source["url"].strip()
        # Find the matching raw file
        raw_files = list(RAW_DIR.glob("*.md"))
        raw_file = None
        for f in raw_files:
            # Match by checking if the URL's domain/path is in the filename
            if _url_matches_file(url, f.name):
                raw_file = f
                break

        if not raw_file or not raw_file.exists():
            print(f"  No raw file found for: {url}")
            continue

        content = raw_file.read_text(encoding="utf-8")
        if not content.strip():
            print(f"  Empty content for: {url}")
            continue

        chunks = splitter.split_text(content)
        print(f"  {raw_file.name}: {len(chunks)} chunks")

        for i, chunk_text in enumerate(chunks):
            all_chunks.append({
                "text": chunk_text,
                "metadata": {
                    "scheme_name": normalize_scheme_name(source.get("scheme_name", "")),
                    "amc": source.get("amc", ""),
                    "doc_type": source.get("doc_type", ""),
                    "category": source.get("category", ""),
                    "source_url": url,
                    "source_domain": source.get("source_domain", ""),
                    "scrape_date": str(date.today()),
                    "chunk_index": i,
                },
            })

    print(f"\nTotal chunks: {len(all_chunks)}")
    return all_chunks


def _url_matches_file(url: str, filename: str) -> bool:
    """Check if a URL corresponds to a raw filename."""
    import re
    # Replicate the sanitize logic from scraper.py
    name = re.sub(r"https?://", "", url)
    name = re.sub(r"[^\w\-.]", "_", name)
    expected = name[:120] + ".md"
    return filename == expected


if __name__ == "__main__":
    chunks = chunk_all()
    for c in chunks[:3]:
        print(f"\n--- Chunk (scheme={c['metadata']['scheme_name']}) ---")
        print(c["text"][:200])
