# CLAUDE.md — Mutual Fund FAQ Assistant (RAG)

## Project Overview

A RAG-based FAQ assistant for Groww that answers **factual-only** questions about mutual fund schemes using official AMC/AMFI/SEBI sources. No advice, no comparisons, no predictions.

- **Stack**: Python 3.11+ | Pinecone (vector DB) | OpenAI embeddings (`text-embedding-3-small`) | GPT-4o-mini (classifier) + GPT-4o (generator) | Streamlit UI
- **Docs**: See `docs/` for problem statement, architecture, and phased build plan

## Project Structure

```
src/ingestion/   — scraper, chunker, embedder
src/query/       — classifier, scheme_detector, retriever, generator
src/safety/      — pii_filter, guard (refusal logic)
src/config.py    — constants, prompts, scheme registry
src/app.py       — Streamlit entry point
data/raw/        — scraped HTML content
data/processed/  — parsed clean text
sources.csv      — corpus of 20 official URLs
```

## Commands

```bash
# Setup
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Run the app
streamlit run src/app.py

# Run ingestion pipeline (when corpus needs refresh)
python3 -m src.ingestion.embedder
```

## Key Architecture Decisions

- **Pinecone index** (`mf-faq`) with metadata filters per chunk (scheme_name, doc_type, source_url, scrape_date)
- **Chunk size**: 512 tokens, 50 overlap using `RecursiveCharacterTextSplitter`
- **Top-k retrieval**: 5 chunks; falls back to unfiltered if < 2 results with scheme filter
- **Query classification** via GPT-4o-mini before retrieval (factual/advisory/comparative/predictive/out_of_scope/pii_detected)
- **Answer generation** via GPT-4o with strict system prompt
- **Scheme detection**: exact keyword match + `thefuzz` fuzzy matching
- **PII filtering**: regex-based, runs before any LLM call

## Coding Conventions

- Python 3.11+ — use type hints
- Environment variables via `python-dotenv` (`.env` file, never commit real keys)
- Keep answers grounded: every response must cite exactly 1 source URL + scrape date
- Max 3 sentences per answer — enforced in the system prompt

## Schemes in Scope

| Category  | Scheme                          | AMC         |
|-----------|---------------------------------|-------------|
| Large-Cap | Mirae Asset Large Cap Fund      | Mirae Asset |
| Flexi-Cap | Parag Parikh Flexi Cap Fund     | PPFAS       |
| ELSS      | Axis Long Term Equity Fund      | Axis        |

## Safety Rules (non-negotiable)

- **No PII**: reject queries containing PAN, Aadhaar, phone, email, account numbers
- **No investment advice**: refuse advisory, comparative, predictive queries with educational redirect
- **No third-party sources**: corpus must only come from official AMC, AMFI, SEBI domains
- **No hallucination**: if retrieved chunks don't contain the answer, say "I don't have this information in my current sources"

## User Context

The developer is experienced in JS/TS but new to Python. When explaining Python concepts, use JS/TS analogies (e.g., venv = node_modules, pip = npm, `with open()` = try-finally).
