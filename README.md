# Mutual Fund FAQ Assistant

A RAG-based FAQ assistant that answers factual questions about select mutual fund schemes using official AMC, AMFI, and SEBI sources. Built as a Groww product lens.

**Facts-only. No investment advice.**

## Schemes Covered

| Category | Scheme | AMC |
|----------|--------|-----|
| Large-Cap | Mirae Asset Large Cap Fund | Mirae Asset |
| Flexi-Cap | Parag Parikh Flexi Cap Fund | PPFAS |
| ELSS | Axis ELSS Tax Saver Fund | Axis |

## Architecture

```
User Query → PII Filter → Query Classifier (GPT-4o-mini)
                              ↓
                    [factual] → Scheme Detector → Embed Query
                                                      ↓
                                            Pinecone Retrieval (top-5)
                                                      ↓
                                            Answer Generation (GPT-4o)
                                                      ↓
                                            Answer + Citation + Date
                    [advisory/comparative/predictive] → Polite Refusal
                    [pii_detected] → Hard Reject
```

## Tech Stack

| Component | Tool |
|-----------|------|
| Scraping | crawl4ai |
| Chunking | LangChain RecursiveCharacterTextSplitter (512 tokens, 50 overlap) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | Pinecone (cloud, index: mf-faq) |
| Query Classifier | GPT-4o-mini |
| Answer Generator | GPT-4o |
| Backend API | FastAPI |
| Frontend | React + Tailwind CSS + shadcn/ui |
| Fuzzy Matching | thefuzz |

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key
- Pinecone API key (free tier works)

### Backend

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run ingestion (one-time)
python3 -m src.ingestion.scraper     # Scrape all 20 URLs
python3 -m src.ingestion.embedder    # Chunk, embed, and upsert to Pinecone

# Start API server
uvicorn src.api:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
rag/
├── src/
│   ├── ingestion/
│   │   ├── scraper.py          # crawl4ai URL scraping
│   │   ├── chunker.py          # Text splitting + metadata tagging
│   │   └── embedder.py         # OpenAI embedding + Pinecone upsert
│   ├── query/
│   │   ├── classifier.py       # GPT-4o-mini query classification
│   │   ├── scheme_detector.py  # Exact + fuzzy scheme matching
│   │   ├── retriever.py        # Pinecone retrieval with metadata filters
│   │   └── generator.py        # GPT-4o grounded answer generation
│   ├── safety/
│   │   ├── pii_filter.py       # Regex PII detection (PAN, Aadhaar, etc.)
│   │   └── guard.py            # Refusal templates with educational redirects
│   ├── config.py               # Constants, scheme registry, model config
│   └── api.py                  # FastAPI backend
├── frontend/                   # React + Tailwind + shadcn/ui
├── data/raw/                   # Scraped HTML content
├── docs/                       # Problem statement, architecture, phases
├── sources.csv                 # 20 official source URLs
├── sample_qa.md                # 10 sample Q&A pairs with citations
├── requirements.txt            # Python dependencies
└── .env.example                # API key template
```

## Corpus

20 official URLs from:
- AMC websites (miraeassetmf.co.in, amc.ppfas.com, axismf.com)
- Groww (groww.in)
- AMFI (amfiindia.com)
- SEBI (sebi.gov.in, investor.sebi.gov.in)

See `sources.csv` for the full list.

## Safety

- **No PII**: Queries containing PAN, Aadhaar, phone, email, or account numbers are rejected before any LLM call
- **No advice**: Advisory, comparative, and predictive queries are refused with educational redirects
- **No hallucination**: If retrieved chunks don't contain the answer, the system says so
- **No third-party sources**: Corpus is 100% official AMC/AMFI/SEBI

## Limitations

- Static corpus — factsheets change monthly; answers may lag
- Only 3 schemes covered — other schemes get "not in scope"
- No OCR for scanned PDFs (URL-only approach)
- NAV/returns intentionally excluded
- No multi-turn context — each query is independent
- English only

## Disclaimer

> This tool provides factual information only. It does not constitute investment advice, a recommendation to buy or sell any mutual fund, or a solicitation of any kind. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.
>
> Data sourced exclusively from official AMC, AMFI, and SEBI publications.
