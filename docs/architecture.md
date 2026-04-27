# RAG Architecture — Mutual Fund FAQ Assistant

### Metadata-Filtered Retrieval-Augmented Generation Pipeline

> **Product**: Groww | **Approach**: Metadata-Filtered RAG | **Last revised**: April 2026

---

## 1. Architecture Overview

The system uses a **Metadata-Filtered RAG** architecture — a single ChromaDB vector store with rich per-chunk metadata (scheme name, document type, source URL, scrape date). This enables precise filtered retrieval without the complexity of multiple collections, while gracefully handling both scheme-specific and general mutual fund queries.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                   │
│                   (Streamlit Chat UI)                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SAFETY LAYER                                    │
│  ┌─────────────┐   ┌────────────────┐   ┌───────────────────────┐  │
│  │ PII Filter  │──▶│ Query Classifier│──▶│ Refusal / Pass-through│  │
│  │ (Regex)     │   │ (Claude Haiku)  │   │                       │  │
│  └─────────────┘   └────────────────┘   └───────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ (factual queries only)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RETRIEVAL LAYER                                   │
│  ┌──────────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Scheme Detection  │──▶│ Embed Query   │──▶│ ChromaDB Retrieval │  │
│  │ (keyword + fuzzy) │   │ (text-embed-  │   │ (top-5 + metadata  │  │
│  │                   │   │  3-small)     │   │  filters)          │  │
│  └──────────────────┘   └──────────────┘   └────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GENERATION LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Claude Sonnet — Strict System Prompt                           │ │
│  │ • Max 3 sentences                                              │ │
│  │ • Must cite source URL                                         │ │
│  │ • Must include last-updated date                               │ │
│  │ • Must ground answer in retrieved chunks only                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMAT                                   │
│  [Answer in ≤ 3 sentences]                                          │
│  📎 Source: [Official URL]                                          │
│  🗓️ Last updated from sources: [Date]                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. AMC & Scheme Selection

| Category   | Scheme                          | AMC          |
| ---------- | ------------------------------- | ------------ |
| Large-Cap  | Mirae Asset Large Cap Fund      | Mirae Asset  |
| Flexi-Cap  | Parag Parikh Flexi Cap Fund     | PPFAS        |
| ELSS       | Axis Long Term Equity Fund      | Axis         |

**Why these 3?** Category diversity tests the assistant's ability to distinguish rules — ELSS has a mandatory 3-year lock-in, flexi-caps have flexible mandates, and large-caps are SEBI-constrained to top-100 stocks. Different exit loads, expense ratios, and benchmarks across all three.

---

## 3. Corpus Strategy

### 3.1 Target Sources (15–25 URLs)

| Source Type                | Per Scheme | Total | Examples                                           |
| -------------------------- | ---------- | ----- | -------------------------------------------------- |
| Scheme Factsheet (PDF)     | 1          | 3     | Monthly factsheet from AMC website                 |
| KIM (PDF)                  | 1          | 3     | Key Information Memorandum from AMC                 |
| SID (PDF)                  | 1          | 3     | Scheme Information Document from AMC / SEBI filing  |
| AMC FAQ / Help Page (HTML) | 1          | 3     | Scheme-specific FAQ on AMC website                  |
| Groww Help Articles (HTML) | —          | 2–3   | Statement downloads, how-to guides                  |
| AMFI Guidance (HTML)       | —          | 2–3   | amfiindia.com investor education pages              |
| SEBI Circulars (PDF/HTML)  | —          | 1–2   | Riskometer guidelines, expense ratio circulars      |

### 3.2 Source Validation Rules

- **Allowed**: Official AMC websites, amfiindia.com, sebi.gov.in, Groww help center
- **Blocked**: Third-party blogs, aggregators (Moneycontrol, ET Money), news articles, cached/screenshot pages

### 3.3 Source Tracking

All sources stored in `sources.csv`:

```csv
url,scheme_name,amc,doc_type,category,scrape_date,notes
https://...,Mirae Asset Large Cap Fund,Mirae Asset,factsheet,large-cap,2026-04-12,April 2026 factsheet
```

---

## 4. Ingestion Pipeline

### 4.1 Scraping

| Content Type | Tool          | Rationale                                        |
| ------------ | ------------- | ------------------------------------------------ |
| HTML pages   | `crawl4ai`    | Handles JS-rendered AMC pages, outputs clean MD  |
| PDF downloads| `requests`    | Direct download, no rendering needed             |

**Process:**
1. Fetch URL → save raw content to `data/raw/`
2. HTML: `crawl4ai` extracts clean markdown
3. PDF: download and store for parsing

### 4.2 PDF Parsing

**Tool:** `pdfplumber`

- Extracts text preserving paragraph structure
- Extracts tables as structured data (critical for expense ratios, fund details)
- Handles multi-column layouts common in KIMs and SIDs
- Output: clean text file per document saved to `data/processed/`

### 4.3 Chunking

**Tool:** `LangChain RecursiveCharacterTextSplitter`

| Parameter      | Value | Rationale                                              |
| -------------- | ----- | ------------------------------------------------------ |
| `chunk_size`   | 512   | Small enough for precise retrieval, large enough for context |
| `chunk_overlap`| 50    | Prevents sentence-boundary information loss            |
| `separators`   | `["\n\n", "\n", ". ", " "]` | Preserves paragraph → sentence → word hierarchy |

**Metadata attached to every chunk:**

```json
{
  "scheme_name": "Mirae Asset Large Cap Fund",
  "amc": "Mirae Asset",
  "category": "large-cap",
  "doc_type": "SID",
  "source_url": "https://...",
  "scrape_date": "2026-04-12",
  "chunk_index": 14
}
```

### 4.4 Embedding & Storage

| Component     | Choice                          | Rationale                          |
| ------------- | ------------------------------- | ---------------------------------- |
| Embedding     | OpenAI `text-embedding-3-small` | 1536 dims, fast, cheap, good for English financial text |
| Vector Store  | ChromaDB (local, persistent)    | Zero infra, persists to `data/chroma_db/` |
| Collection    | Single: `mf_faq_chunks`        | Metadata filters handle scheme separation |

**Estimated corpus size:** ~15–25 docs → ~500–1500 chunks → trivially fits in local ChromaDB.

---

## 5. Query Pipeline

### 5.1 Query Classification

**Model:** Claude Haiku (fast, cheap — this is a simple classification task)

Classifies each query into one of:

| Category       | Action          | Example                                      |
| -------------- | --------------- | -------------------------------------------- |
| `factual`      | Proceed to retrieval | "What is the expense ratio of Axis ELSS?"  |
| `advisory`     | Refuse politely | "Should I invest in this fund?"              |
| `comparative`  | Refuse politely | "Which fund is better, PPFAS or Mirae?"      |
| `predictive`   | Refuse politely | "Will this fund give 15% returns?"           |
| `out_of_scope` | Refuse politely | "What's the weather today?"                  |
| `pii_detected` | Hard reject     | Query containing PAN/Aadhaar/account numbers |

**Refusal format:**
```
This assistant only answers factual questions about mutual fund schemes
(expense ratios, exit loads, lock-in periods, etc.) using official sources.

For [topic], please visit: [relevant AMFI/SEBI educational link]
```

### 5.2 Scheme Detection

Before retrieval, extract the target scheme from the query:

1. **Exact match**: keyword lookup against known scheme names
2. **Fuzzy match**: `thefuzz` library for partial/misspelled names (e.g., "parag parikh" → "Parag Parikh Flexi Cap Fund")
3. **No match**: query is general (e.g., "What is an ELSS lock-in?") — retrieve without scheme filter

The detected scheme name is used as a **metadata filter** during ChromaDB retrieval.

### 5.3 Retrieval

```python
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={"scheme_name": detected_scheme}  # omitted if general query
)
```

- **Top-k:** 5 chunks (small corpus, generous retrieval)
- **Metadata filter:** scheme_name when detected; optionally doc_type for specific queries (e.g., "exit load" → prefer SID/KIM)
- **Fallback:** If filtered retrieval returns < 2 results, retry without scheme filter

### 5.4 Answer Generation

**Model:** Claude Sonnet via Anthropic API

**System prompt enforces:**
- Answer ONLY from the provided retrieved chunks
- Maximum 3 sentences
- Must include exactly 1 source URL from chunk metadata
- Must include the scrape_date as "last updated" date
- If retrieved chunks don't contain the answer → say "I don't have this information in my current sources"
- Never generate investment advice, comparisons, or predictions

**Prompt template:**
```
You are a facts-only mutual fund FAQ assistant for Groww.

RULES:
- Answer ONLY using the provided context chunks below
- Maximum 3 sentences
- Include exactly one source citation
- Include the last-updated date
- If the context doesn't contain the answer, say so
- Never give investment advice, comparisons, or predictions

CONTEXT CHUNKS:
{retrieved_chunks_with_metadata}

USER QUESTION: {query}

Respond in this format:
[Answer in ≤ 3 sentences]

📎 Source: [source_url from the most relevant chunk]
🗓️ Last updated from sources: [scrape_date]
```

---

## 6. Safety & Compliance

### 6.1 PII Detection (Pre-LLM Filter)

Regex-based detection runs **before** any LLM call:

| PII Type       | Pattern                         | Action       |
| -------------- | ------------------------------- | ------------ |
| PAN            | `[A-Z]{5}[0-9]{4}[A-Z]`        | Hard reject  |
| Aadhaar        | `[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}` | Hard reject |
| Phone          | `(\+91)?[6-9][0-9]{9}`          | Hard reject  |
| Email          | `\S+@\S+\.\S+`                  | Hard reject  |
| Account Number | `[0-9]{9,18}`                    | Hard reject  |

**Rejection message:**
```
This assistant does not accept or process personal information
(PAN, Aadhaar, phone, email, or account numbers).
Please remove any personal details and rephrase your question.
```

### 6.2 Hallucination Guard

- Answer generation is **grounded**: the system prompt restricts Claude to only use provided chunks
- If no relevant chunks are retrieved (similarity score below threshold), the system responds with a "not in my sources" message instead of generating an answer
- No external knowledge is used — the model acts as a summarizer of retrieved content only

### 6.3 Content Restrictions

| Restriction          | Implementation                                  |
| -------------------- | ----------------------------------------------- |
| No investment advice | Query classifier + system prompt enforcement    |
| No return calcs      | Classifier catches; system prompt reinforces     |
| No comparisons       | Classifier detects multi-scheme comparative intent |
| No opinions          | System prompt: every sentence must trace to source |

---

## 7. UI Layer — Streamlit

### 7.1 Components

| Element             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| **Welcome Banner**  | "Mutual Fund FAQ Assistant — Ask factual questions about select schemes" |
| **Disclaimer Bar**  | Always-visible: *"Facts-only. No investment advice. Mutual fund investments are subject to market risks."* |
| **Example Queries** | 3 clickable buttons: expense ratio, exit load, ELSS lock-in |
| **Chat Window**     | User question + formatted answer with citation              |
| **Corpus Footer**   | "Data sourced from official AMC/AMFI/SEBI publications. Last refreshed: [date]" |

### 7.2 Chat Flow

```
User types question
    → PII filter (client-side regex check)
    → Send to backend
    → Query classification
    → [If factual] Retrieval → Generation → Display with citation
    → [If advisory] Display refusal with educational redirect
    → [If PII] Display rejection message
```

### 7.3 Session Management

- No authentication required (no PII)
- Streamlit session state stores chat history for the current session only
- No data persisted between sessions
- No analytics or tracking beyond Streamlit defaults

---

## 8. Technology Stack

| Component        | Tool / Library                          | Version  | Purpose                          |
| ---------------- | --------------------------------------- | -------- | -------------------------------- |
| Scraping (HTML)  | `crawl4ai`                              | latest   | JS-rendered AMC page extraction  |
| Scraping (PDF)   | `requests`                              | 2.31+    | Direct PDF download              |
| PDF Parsing      | `pdfplumber`                            | 0.10+    | Text + table extraction from PDFs|
| Chunking         | `langchain-text-splitters`              | 0.2+     | RecursiveCharacterTextSplitter   |
| Embeddings       | `openai` (text-embedding-3-small)       | 1.x      | 1536-dim embeddings              |
| Vector Store     | `chromadb`                              | 0.5+     | Local persistent vector storage  |
| LLM (classify)   | `anthropic` (Claude Haiku)              | 0.30+    | Fast query classification        |
| LLM (generate)   | `anthropic` (Claude Sonnet)             | 0.30+    | Answer generation with citations |
| Fuzzy Matching   | `thefuzz`                               | 0.22+    | Scheme name detection            |
| UI               | `streamlit`                             | 1.35+    | Chat interface                   |
| Environment      | `python-dotenv`                         | 1.0+     | API key management               |

---

## 9. Project Structure

```
rag/
├── docs/
│   ├── problemStatement.md          # Original problem statement
│   └── architecture.md              # This document
├── src/
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── scraper.py               # crawl4ai + requests download
│   │   ├── pdf_parser.py            # pdfplumber text/table extraction
│   │   ├── chunker.py               # text splitting + metadata tagging
│   │   └── embedder.py              # embed chunks + store to ChromaDB
│   ├── query/
│   │   ├── __init__.py
│   │   ├── classifier.py            # query type classification (Haiku)
│   │   ├── scheme_detector.py       # scheme name extraction + fuzzy match
│   │   ├── retriever.py             # ChromaDB retrieval with filters
│   │   └── generator.py             # answer generation (Sonnet)
│   ├── safety/
│   │   ├── __init__.py
│   │   ├── pii_filter.py            # regex-based PII detection
│   │   └── guard.py                 # refusal logic + educational redirects
│   ├── config.py                    # constants, prompts, scheme registry
│   └── app.py                       # Streamlit UI entry point
├── data/
│   ├── raw/                         # downloaded PDFs and HTML
│   ├── processed/                   # parsed clean text files
│   └── chroma_db/                   # ChromaDB persistent store
├── sources.csv                      # corpus: 15-25 official URLs
├── sample_qa.md                     # 5-10 sample Q&A with citations
├── requirements.txt                 # Python dependencies
├── .env.example                     # API key template (no real keys)
└── README.md                        # Setup, scope, architecture summary
```

---

## 10. Data Flow Summary

```
                    INGESTION (one-time / periodic)
                    ================================
Official URLs ──▶ Scrape/Download ──▶ Parse (pdfplumber) ──▶ Chunk (512 tok)
                                                                │
                                                    Tag metadata per chunk
                                                                │
                                                    Embed (text-embedding-3-small)
                                                                │
                                                    Store in ChromaDB
                                                    (collection: mf_faq_chunks)


                    QUERY (real-time)
                    =================
User Question ──▶ PII Filter ──▶ Classify (Haiku) ──┬──▶ [advisory] Refuse
                                                     │
                                                     └──▶ [factual]
                                                              │
                                                    Detect scheme name
                                                              │
                                                    Embed query
                                                              │
                                                    Retrieve top-5 (ChromaDB + filters)
                                                              │
                                                    Generate answer (Sonnet)
                                                              │
                                                    Format: answer + 📎 source + 🗓️ date
                                                              │
                                                    Display in Streamlit
```

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Single vs. multi collection | Single with metadata filters | Simpler, handles both scheme-specific and general queries |
| Chunk size | 512 tokens | Balance between retrieval precision and context sufficiency |
| Top-k | 5 | Generous for small corpus; better recall without noise |
| Classification model | Haiku (not Sonnet) | Classification is simple; save cost and latency |
| Generation model | Sonnet | Best instruction-following for strict format + refusals |
| Embedding model | text-embedding-3-small | Cost-effective, sufficient quality for this corpus size |
| Fuzzy matching | thefuzz | Lightweight, no ML model needed for 3 scheme names |
| PII detection | Regex (not ML) | Deterministic, zero false negatives for known patterns |

---

## 12. Limitations & Future Considerations

| Limitation | Mitigation |
| ---------- | ---------- |
| Static corpus — factsheets change monthly | Re-run ingestion pipeline monthly; display scrape date |
| Only 3 schemes covered | "Not in scope" response for unrecognized schemes |
| No OCR for scanned PDFs | Only use text-based PDFs from official sources |
| NAV/returns excluded | Redirect users to official factsheet links |
| No multi-turn context | Each query is independent; no conversation memory |
| English only | Corpus is English; Hindi/regional queries get a polite redirect |

---

## 13. Environment & Configuration

```bash
# .env.example
OPENAI_API_KEY=sk-...          # For text-embedding-3-small
ANTHROPIC_API_KEY=sk-ant-...   # For Claude Haiku + Sonnet
CHROMA_PERSIST_DIR=./data/chroma_db
```

**No PII is stored anywhere.** No user data is collected. No authentication required.

---

*Document version: 1.0 | Architecture: Metadata-Filtered RAG | Last revised: April 2026*
