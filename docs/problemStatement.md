# 🏦 Mutual Fund FAQ Assistant — Problem Statement
### Facts-Only Q&A System | Groww × RAG Architecture
> **Product**: Groww &nbsp;|&nbsp; **Track**: W1 · W2 · W3 &nbsp;|&nbsp; **Type**: Retrieval-Augmented Generation (RAG)

---

## 📌 Executive Summary

India has over 40 crore mutual fund folios (AMFI, 2024), yet most retail investors still struggle to answer basic questions about a scheme — *What is the expense ratio? Is there an exit load? How long is the ELSS lock-in?* — because the answers are buried in dense PDFs like SIDs and KIMs.

This project builds a **lightweight, citation-first FAQ assistant** that retrieves verified factual answers from official AMC, AMFI, and SEBI sources — using a **RAG (Retrieval-Augmented Generation)** pipeline — and surfaces them with a single source link per answer. No opinions. No advice. No hallucinations.

The product context is **Groww**, one of India's largest retail investing platforms, used as the lens for understanding the target user and their information needs.

---

## 🎯 Objective

> Design and deploy a working RAG-based assistant that answers only **verifiable, factual queries** about mutual fund schemes using a curated corpus of official public documents.

| Goal | Description |
|---|---|
| **Accuracy** | Every answer traces back to an official source |
| **Brevity** | Max 3 sentences per answer |
| **Safety** | Refuses advisory, comparative, or speculative questions |
| **Transparency** | Every answer includes a citation link + last-updated date |
| **Privacy** | Zero PII collected, stored, or processed |

---

## 👥 Target Users

### Primary
- **Retail investors on Groww** who are comparing 2–3 schemes before investing and want quick factual clarity (exit load, minimum SIP, lock-in period, etc.)

### Secondary
- **Customer support teams** at Groww or AMCs who answer the same 10 questions every day and want a reliable reference tool
- **Content & compliance teams** building educational material who need source-backed facts

---

## 🗂️ Scope of Work

### 1. AMC & Scheme Selection

Choose **one AMC** and **3–5 schemes** with category diversity:

| Category | Example Scheme |
|---|---|
| Large-Cap | Mirae Asset Large Cap Fund |
| Flexi-Cap | Parag Parikh Flexi Cap Fund |
| ELSS | Axis Long Term Equity Fund |
| *(optional)* Mid-Cap | Nippon India Growth Fund |
| *(optional)* Debt | HDFC Short Term Debt Fund |

> **Why diversity?** Different categories have different rules — ELSS has a lock-in, debt funds have different tax treatment, large-caps have a stricter universe. A diverse corpus tests the assistant's ability to distinguish between schemes accurately.

---

### 2. Corpus Collection

Collect **15–25 official public URLs** across:

| Source Type | Examples | Count |
|---|---|---|
| Scheme Factsheets | AMC monthly factsheet PDFs | 3–5 |
| KIM (Key Information Memorandum) | AMC website, scheme-specific | 3–5 |
| SID (Scheme Information Document) | SEBI / AMC filing | 3–5 |
| AMC FAQ / Help Pages | Groww Help Centre, AMC FAQs | 2–3 |
| AMFI Guidance | amfiindia.com investor education | 2–3 |
| SEBI Circulars / Riskometer Notes | sebi.gov.in | 1–2 |
| Statement / Tax Doc Guides | AMC or Groww help article | 1–2 |

**Hard rules for corpus:**
- ✅ Official AMC websites only
- ✅ AMFI (amfiindia.com)
- ✅ SEBI (sebi.gov.in)
- ❌ No third-party blogs, aggregators, or news articles
- ❌ No screenshots or cached pages

---

### 3. RAG Pipeline Architecture

```
┌─────────────────────────────────────────────────────┐
│                    INGESTION                        │
│  Scrape/Download → Parse PDF/HTML → Chunk → Embed  │
│  Tag each chunk with: source_url, scheme, date     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  VECTOR STORE                       │
│  ChromaDB (local) — ~15–25 docs, small corpus      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 QUERY PIPELINE                      │
│  User Query → Embed → Retrieve top-k chunks        │
│  → LLM (Claude Sonnet) → Format answer + cite      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                   UI LAYER                          │
│  Streamlit chat interface with disclaimer banner   │
└─────────────────────────────────────────────────────┘
```

**Recommended stack:**

| Component | Tool | Why |
|---|---|---|
| Scraping | `crawl4ai` or `requests + BeautifulSoup` | Handles JS-rendered AMC pages |
| PDF parsing | `pdfplumber` | Clean table/text extraction from KIMs |
| Chunking | `LangChain RecursiveCharacterTextSplitter` | Preserves sentence boundaries |
| Embeddings | `text-embedding-3-small` (OpenAI) | Fast, cheap, good for English financial text |
| Vector store | `ChromaDB` (local) | Zero infra, persists to disk |
| LLM | `Claude Sonnet` via Anthropic API | Best instruction-following for refusals |
| UI | `Streamlit` | Fastest path to a working chat demo |

---

### 4. FAQ Assistant Requirements

#### Answerable Queries (must answer)

| Query Type | Example |
|---|---|
| Expense ratio | "What is the expense ratio of Axis Long Term Equity Fund?" |
| Exit load | "What is the exit load for Parag Parikh Flexi Cap Fund?" |
| Minimum SIP | "What is the minimum SIP amount for Mirae Asset Large Cap?" |
| ELSS lock-in | "What is the lock-in period for an ELSS fund?" |
| Riskometer | "What is the risk level of Axis Long Term Equity Fund?" |
| Benchmark | "What index does Parag Parikh Flexi Cap Fund benchmark against?" |
| Statement download | "How do I download my capital gains statement on Groww?" |
| Fund type | "Is Mirae Asset Large Cap Fund an open-ended scheme?" |

#### Answer Format (strictly enforced)

```
[Answer in ≤ 3 sentences]

📎 Source: [Official URL]
🗓️ Last updated from sources: [Date of document / scrape date]
```

#### Refusable Queries (must refuse politely)

| Query Type | Example |
|---|---|
| Investment advice | "Should I invest in this fund?" |
| Comparison / ranking | "Which fund is better — PPFAS or Mirae?" |
| Return prediction | "Will this fund give 15% returns?" |
| Portfolio building | "How should I allocate my ₹1 lakh?" |
| Performance analysis | "How has this fund performed vs the index?" |

**Refusal format:**
```
This assistant only answers factual questions about mutual fund schemes 
(expense ratios, exit loads, lock-in periods, etc.) using official sources.

For [topic], please visit: [relevant AMFI/SEBI educational link]
```

---

### 5. User Interface

**Minimal chat UI with these elements:**

| Element | Description |
|---|---|
| Welcome banner | Brief intro: what the assistant does and doesn't do |
| Disclaimer | *"Facts-only. No investment advice."* — always visible |
| Example questions | 3 clickable starter queries |
| Chat window | Question + answer + citation link |
| Last updated footer | Date of corpus last refresh |

---

## 🚧 Constraints

### Data & Sources
| Rule | Detail |
|---|---|
| Official sources only | AMC, AMFI (amfiindia.com), SEBI (sebi.gov.in) |
| No third-party content | No blogs, Moneycontrol, ET Money, etc. |
| No screenshots as source | Must be parseable text from official page |

### Privacy & Security
| Rule | Detail |
|---|---|
| No PAN / Aadhaar | Never accept or store |
| No account numbers | Reject any query containing one |
| No OTPs | Never request or process |
| No email or phone | No user identity collected at any point |

### Content Restrictions
| Rule | Detail |
|---|---|
| No investment advice | Hard refusal with educational redirect |
| No return calculations | Link to official factsheet instead |
| No scheme comparisons | Politely decline and cite AMFI |
| No opinion | Every sentence must trace to a source |

---

## 📦 Deliverables

| # | Deliverable | Format | Description |
|---|---|---|---|
| 1 | Working prototype | App / notebook | RAG chatbot with chat UI |
| 2 | Source list | `sources.csv` or `sources.md` | 15–25 official URLs with scheme tags |
| 3 | README | `README.md` | Setup, AMC/scheme scope, architecture, limits |
| 4 | Sample Q&A | `sample_qa.md` | 5–10 queries with answers + citation links |
| 5 | Disclaimer snippet | Inline in UI | *"Facts-only. No investment advice."* |

---

## ✅ Success Criteria

| Criterion | Measure |
|---|---|
| Factual accuracy | Answer matches official source document |
| Citation present | Every answer has exactly 1 valid source link |
| Refusal quality | Advisory queries declined politely with redirect |
| Brevity | No answer exceeds 3 sentences |
| Privacy | Zero PII accepted or stored |
| Source compliance | 100% of corpus from AMC / AMFI / SEBI |

---

## 🧪 Skills Being Tested

| Code | Skill | What's Evaluated |
|---|---|---|
| **W1** | Thinking Like a Model | Identify the exact fact being asked; decide whether to answer or refuse; avoid hallucination |
| **W2** | LLMs & Prompting | System prompt design; concise phrasing; safe-refusal wording; citation formatting |
| **W3** | RAGs | Corpus curation; chunking strategy; retrieval accuracy; grounded citation from official pages |

---

## ⚠️ Known Limitations

- Corpus is static — factsheets change monthly; answers may lag by up to 30 days
- Only covers the selected AMC and 3–5 schemes — other schemes will get a "not in scope" response
- Does not handle audio, images, or scanned PDFs without OCR pre-processing
- Performance data (NAV, returns) is intentionally excluded — users are redirected to official factsheets

---

## 📋 Disclaimer

> **This tool provides factual information only. It does not constitute investment advice, a recommendation to buy or sell any mutual fund, or a solicitation of any kind. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.**
>
> *Data sourced exclusively from official AMC, AMFI, and SEBI publications. Last updated from sources: [date of latest corpus refresh].*

---

## 📚 Glossary

| Term | Full Form | Context |
|---|---|---|
| AMC | Asset Management Company | Manages the mutual fund schemes |
| MF | Mutual Fund | Pooled investment vehicle |
| ELSS | Equity Linked Savings Scheme | Tax-saving MF with 3-year lock-in under Sec 80C |
| SIP | Systematic Investment Plan | Fixed periodic investment |
| SEBI | Securities and Exchange Board of India | Market regulator |
| AMFI | Association of Mutual Funds in India | Industry body; investor education |
| KIM | Key Information Memorandum | Summary of key scheme details |
| SID | Scheme Information Document | Detailed scheme document |
| RAG | Retrieval-Augmented Generation | AI technique: retrieve facts → generate answer |
| PII | Personally Identifiable Information | PAN, Aadhaar, phone, email, account numbers |
| NAV | Net Asset Value | Per-unit price of the mutual fund |
| TER | Total Expense Ratio | Annual fee charged by the fund |

---

*Document version: 2.0 &nbsp;|&nbsp; Product: Groww &nbsp;|&nbsp; Last revised: April 2026*
