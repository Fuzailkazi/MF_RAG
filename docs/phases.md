# Project Phases — Mutual Fund FAQ Assistant

### Step-by-step build guide for the RAG pipeline

> **Skill level**: Python beginner | **Total phases**: 5 | **Last revised**: April 2026

---

## Prerequisites — What You Need Before Starting

### Accounts & API Keys

| Service | What | Why | Free Tier? |
|---------|------|-----|------------|
| [OpenAI](https://platform.openai.com/signup) | API key | For `text-embedding-3-small` embeddings | Pay-as-you-go (~$0.02 per 1M tokens) |
| [Anthropic](https://console.anthropic.com/) | API key | For Claude Haiku (classifier) + Sonnet (generator) | Pay-as-you-go |

### Local Setup

| Requirement | How to check | Install if missing |
|-------------|-------------|-------------------|
| **Python 3.11+** | `python3 --version` | `brew install python@3.11` (macOS) |
| **pip** | `pip3 --version` | Comes with Python |
| **Git** | `git --version` | `brew install git` |
| **A code editor** | — | VS Code recommended |

### Concepts You Should Know

You don't need to master these — just skim so the terms aren't new:

| Concept | JS Equivalent | 30-second explanation |
|---------|--------------|----------------------|
| **Virtual environment (venv)** | `node_modules` isolation | A folder that keeps this project's packages separate from your system Python |
| **pip install** | `npm install` | Python's package manager |
| **requirements.txt** | `package.json` dependencies | Lists all packages the project needs |
| **.env file** | Same as JS | Stores API keys, loaded with `python-dotenv` |
| **`if __name__ == "__main__":`** | No direct equivalent | Means "only run this code if this file is executed directly, not imported" |
| **Type hints (`def foo(x: str) -> int`)** | TypeScript types | Optional annotations; Python doesn't enforce them at runtime |

---

## Phase 1: Project Setup & Environment

**Goal**: Get a working Python project with all dependencies installed.

**What you'll do:**
1. Initialize the project folder structure (as defined in architecture.md)
2. Create a Python virtual environment (`venv`) — think of it as this project's own `node_modules`
3. Create `requirements.txt` with all dependencies
4. Install everything with `pip install -r requirements.txt`
5. Create `.env` file with your API keys
6. Create `.gitignore` to exclude `venv/`, `.env`, `data/`, `__pycache__/`
7. Verify setup by running a "hello world" test — import each library and print its version

**Deliverables:**
- [ ] Project folder structure created
- [ ] Virtual environment working
- [ ] All packages installed
- [ ] `.env` with API keys
- [ ] `.gitignore` in place
- [ ] Verification script runs without errors

**Estimated effort**: ~30 minutes

---

## Phase 2: Corpus Collection & Ingestion

**Goal**: Download, parse, and chunk all 15–25 source documents.

### Step 2A: Collect Sources

**What you'll do:**
1. Research and list 15–25 official URLs in `sources.csv`
2. For each URL, record: URL, scheme name, AMC, document type, category
3. Verify every URL is from an allowed domain (AMC site, amfiindia.com, sebi.gov.in)

**Deliverables:**
- [ ] `sources.csv` with 15–25 entries
- [ ] Every URL verified as accessible and official

### Step 2B: Build the Scraper

**What you'll do:**
1. Write `src/ingestion/scraper.py`
   - For HTML pages: use `crawl4ai` to extract clean text
   - For PDFs: use `requests` to download to `data/raw/`
2. Run the scraper — all raw content saved to `data/raw/`

**Key Python concepts you'll encounter:**
- `async/await` — same as JS, but Python uses `asyncio` instead of Promises
- `pathlib.Path` — Python's way of handling file paths (like Node's `path` module)
- `with open(file) as f:` — auto-closes the file when done (like a try-finally)

**Deliverables:**
- [ ] `scraper.py` working
- [ ] All 15–25 documents downloaded to `data/raw/`

### Step 2C: Build the PDF Parser

**What you'll do:**
1. Write `src/ingestion/pdf_parser.py`
   - Use `pdfplumber` to extract text and tables from each PDF
   - Save clean text to `data/processed/`
2. Manually spot-check a few parsed files — do they contain the right content?

**Deliverables:**
- [ ] `pdf_parser.py` working
- [ ] All PDFs parsed to clean text in `data/processed/`

### Step 2D: Build the Chunker + Embedder

**What you'll do:**
1. Write `src/ingestion/chunker.py`
   - Use `RecursiveCharacterTextSplitter` (512 tokens, 50 overlap)
   - Attach metadata to every chunk: scheme_name, doc_type, source_url, scrape_date, amc, category
2. Write `src/ingestion/embedder.py`
   - Embed each chunk using `text-embedding-3-small`
   - Store in ChromaDB with metadata
3. Run the full pipeline: parse → chunk → embed → store
4. Verify: query ChromaDB directly to check chunk count and a sample retrieval

**Deliverables:**
- [ ] `chunker.py` and `embedder.py` working
- [ ] ChromaDB populated at `data/chroma_db/`
- [ ] Verification query returns sensible results

**Estimated effort for all of Phase 2**: ~2–3 hours

---

## Phase 3: Query Pipeline

**Goal**: Take a user question and return a cited answer from the corpus.

### Step 3A: Safety Layer

**What you'll do:**
1. Write `src/safety/pii_filter.py`
   - Regex patterns for PAN, Aadhaar, phone, email, account numbers
   - Returns `True/False` + rejection message
2. Write `src/safety/guard.py`
   - Refusal message templates with educational redirects

**Deliverables:**
- [ ] PII filter catches all test patterns
- [ ] Guard produces correct refusal messages

### Step 3B: Query Classifier

**What you'll do:**
1. Write `src/query/classifier.py`
   - Sends query to Claude Haiku with a classification prompt
   - Returns one of: `factual`, `advisory`, `comparative`, `predictive`, `out_of_scope`, `pii_detected`
2. Test with 10+ example queries covering each category

**Key Python concept:**
- `anthropic.Anthropic()` — the API client, similar to `new Anthropic()` in JS

**Deliverables:**
- [ ] Classifier correctly categorizes all test queries

### Step 3C: Scheme Detector

**What you'll do:**
1. Write `src/query/scheme_detector.py`
   - Keyword matching against known scheme names
   - Fuzzy match fallback using `fuse.js`-equivalent (`thefuzz`)
   - Returns scheme name or `None` (for general queries)

**Deliverables:**
- [ ] Detects exact scheme names
- [ ] Handles misspellings (e.g., "parag parikh" → full name)
- [ ] Returns `None` for general questions

### Step 3D: Retriever

**What you'll do:**
1. Write `src/query/retriever.py`
   - Embeds the user query
   - Queries ChromaDB with metadata filters (scheme_name if detected)
   - Returns top-5 chunks with their metadata
   - Fallback: retries without filter if < 2 results

**Deliverables:**
- [ ] Retriever returns relevant chunks for test queries
- [ ] Metadata filters work correctly

### Step 3E: Answer Generator

**What you'll do:**
1. Write `src/query/generator.py`
   - Takes retrieved chunks + user query
   - Sends to Claude Sonnet with the strict system prompt
   - Formats response: answer + source + date
2. Write `src/config.py` with all prompts, constants, and scheme registry

**Deliverables:**
- [ ] Generator produces ≤ 3 sentence answers with citations
- [ ] Refuses advisory queries correctly
- [ ] Returns "not in my sources" when retrieval is empty

### Step 3F: End-to-End Integration

**What you'll do:**
1. Wire everything together: PII filter → classifier → scheme detector → retriever → generator
2. Test the full pipeline from the terminal (no UI yet)
3. Run through all sample queries from `sample_qa.md`

**Deliverables:**
- [ ] Full pipeline works end-to-end from command line
- [ ] All sample Q&A pairs produce correct answers

**Estimated effort for all of Phase 3**: ~3–4 hours

---

## Phase 4: Streamlit UI

**Goal**: Build the chat interface.

**What you'll do:**
1. Write `src/app.py` — the Streamlit app
   - Welcome banner + always-visible disclaimer
   - 3 clickable example query buttons
   - Chat input + message history (using `st.session_state`)
   - Each response formatted with answer + 📎 source + 🗓️ date
   - Footer with corpus refresh date
2. Style with minimal custom CSS (Streamlit handles most of it)
3. Run with `streamlit run src/app.py`

**Key Python concept:**
- `st.session_state` — Streamlit's state management, like React's `useState` but persisted across re-renders (Streamlit re-runs the entire script on every interaction)

**Deliverables:**
- [ ] Chat UI working locally
- [ ] Disclaimer always visible
- [ ] Example queries clickable
- [ ] Answers show citation + date
- [ ] Chat history maintained in session

**Estimated effort**: ~1–2 hours

---

## Phase 5: Testing, Sample Q&A & Documentation

**Goal**: Validate everything and prepare deliverables.

### Step 5A: Create Sample Q&A

**What you'll do:**
1. Write `sample_qa.md` with 10 queries (8 answerable + 2 refusals)
2. Run each through the app and record the actual response
3. Verify: answer matches official source, citation is valid, format is correct

**Deliverables:**
- [ ] `sample_qa.md` with 10 verified Q&A pairs

### Step 5B: Edge Case Testing

**What you'll do:**
1. Test PII queries (PAN, phone, Aadhaar) — should reject
2. Test advisory queries — should refuse with redirect
3. Test out-of-scope schemes — should say "not in scope"
4. Test misspelled scheme names — should fuzzy match
5. Test empty/gibberish queries — should handle gracefully

**Deliverables:**
- [ ] All edge cases handled correctly

### Step 5C: README & Final Docs

**What you'll do:**
1. Write `README.md` — setup instructions, scope, architecture summary, limitations
2. Verify `sources.csv` is complete and accurate
3. Ensure `.env.example` exists (without real keys)

**Deliverables:**
- [ ] `README.md` complete
- [ ] `sources.csv` finalized
- [ ] `.env.example` in place
- [ ] All deliverables from problem statement accounted for

**Estimated effort for all of Phase 5**: ~1–2 hours

---

## Summary

| Phase | What | Effort |
|-------|------|--------|
| **1** | Project setup & environment | ~30 min |
| **2** | Corpus collection & ingestion pipeline | ~2–3 hrs |
| **3** | Query pipeline (safety + retrieval + generation) | ~3–4 hrs |
| **4** | Streamlit chat UI | ~1–2 hrs |
| **5** | Testing, sample Q&A, documentation | ~1–2 hrs |
| | **Total** | **~8–12 hrs** |

---

## How We'll Work Together

- **I'll write the code** for each step — you review and run it
- **I'll explain Python-specific things** in JS terms where possible
- **You tell me when you're ready** for the next phase — we go at your pace
- **If something breaks**, paste the error and I'll fix it

When you're ready, say **"Let's start Phase 1"** and we'll set up the project.

---

*Document version: 1.0 | Last revised: April 2026*
