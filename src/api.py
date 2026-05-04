"""
FastAPI backend — exposes the query pipeline as a REST API.
Supports conversation memory, confidence scores, and hybrid retrieval.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.safety.pii_filter import filter_query
from src.query.classifier import classify_query
from src.query.scheme_detector import detect_scheme
from src.query.retriever import retrieve
from src.query.generator import generate_answer
from src.safety.guard import get_refusal


app = FastAPI(title="MF FAQ Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversationTurn(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    query: str
    conversation_history: list[ConversationTurn] = []


class QueryResponse(BaseModel):
    answer: str
    category: str
    scheme: str | None = None
    scheme_category: str | None = None
    source_url: str | None = None
    confidence: float | None = None
    confidence_label: str | None = None
    blocked: bool = False


SCHEME_CATEGORIES = {
    "Mirae Asset Large Cap Fund": "large-cap",
    "Parag Parikh Flexi Cap Fund": "flexi-cap",
    "Axis ELSS Tax Saver Fund": "elss",
}


def get_confidence(score: float) -> tuple[float, str]:
    """Convert retrieval score to confidence level."""
    if score >= 0.80:
        return round(score, 2), "high"
    elif score >= 0.65:
        return round(score, 2), "medium"
    else:
        return round(score, 2), "low"


@app.post("/api/ask", response_model=QueryResponse)
def ask(req: QueryRequest):
    query = req.query.strip()

    try:
        # Step 1: PII filter
        is_safe, msg = filter_query(query)
        if not is_safe:
            return QueryResponse(answer=msg, category="pii_detected", blocked=True)

        # Step 2: Classify
        category = classify_query(query)

        # Step 3: If not factual, refuse
        if category != "factual":
            return QueryResponse(answer=get_refusal(category), category=category, blocked=True)

        # Step 4: Detect scheme (check conversation history for context)
        scheme = detect_scheme(query)
        if not scheme and req.conversation_history:
            for turn in reversed(req.conversation_history[-4:]):
                scheme = detect_scheme(turn.content)
                if scheme:
                    break

        # Step 5: Retrieve with hybrid search
        chunks = retrieve(query, scheme)

        # Step 6: Calculate confidence from top retrieval score
        confidence = None
        confidence_label = None
        if chunks:
            confidence, confidence_label = get_confidence(chunks[0]["score"])

        # Step 7: Generate answer with conversation context
        history = [{"role": t.role, "content": t.content} for t in req.conversation_history]
        answer = generate_answer(query, chunks, history)

        # Extract source URL from top chunk
        source_url = None
        if chunks:
            source_url = chunks[0].get("metadata", {}).get("source_url")

        return QueryResponse(
            answer=answer,
            category=category,
            scheme=scheme,
            scheme_category=SCHEME_CATEGORIES.get(scheme) if scheme else None,
            source_url=source_url,
            confidence=confidence,
            confidence_label=confidence_label,
        )

    except Exception as e:
        error_msg = str(e).lower()
        if "429" in str(e) or "quota" in error_msg or "rate" in error_msg or "exhausted" in error_msg:
            return QueryResponse(
                answer="⚠️ API rate limit reached. The Gemini free tier daily quota has been exhausted. Please try again after 12:30 PM IST tomorrow, or switch to a paid API key.",
                category="rate_limited",
                blocked=True,
            )
        return QueryResponse(
            answer=f"An error occurred: {str(e)[:200]}",
            category="error",
            blocked=True,
        )


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Calculators ---

class SIPRequest(BaseModel):
    monthly_amount: float
    expected_return: float  # annual %
    years: int

class StepUpSIPRequest(BaseModel):
    monthly_amount: float
    annual_step_up: float  # annual increase %
    expected_return: float
    years: int

class SWPRequest(BaseModel):
    initial_investment: float
    monthly_withdrawal: float
    expected_return: float  # annual %
    years: int

class LumpsumRequest(BaseModel):
    amount: float
    expected_return: float  # annual %
    years: int

class CalcResponse(BaseModel):
    total_invested: float
    estimated_returns: float
    total_value: float
    yearly_breakdown: list[dict]


@app.post("/api/calc/sip", response_model=CalcResponse)
def calc_sip(req: SIPRequest):
    monthly_rate = req.expected_return / 100 / 12
    months = req.years * 12
    total_invested = req.monthly_amount * months

    if monthly_rate == 0:
        total_value = total_invested
    else:
        total_value = req.monthly_amount * (((1 + monthly_rate) ** months - 1) / monthly_rate) * (1 + monthly_rate)

    yearly = []
    for y in range(1, req.years + 1):
        m = y * 12
        if monthly_rate == 0:
            val = req.monthly_amount * m
        else:
            val = req.monthly_amount * (((1 + monthly_rate) ** m - 1) / monthly_rate) * (1 + monthly_rate)
        yearly.append({"year": y, "invested": round(req.monthly_amount * m), "value": round(val)})

    return CalcResponse(
        total_invested=round(total_invested),
        estimated_returns=round(total_value - total_invested),
        total_value=round(total_value),
        yearly_breakdown=yearly,
    )


@app.post("/api/calc/stepup-sip", response_model=CalcResponse)
def calc_stepup_sip(req: StepUpSIPRequest):
    monthly_rate = req.expected_return / 100 / 12
    total_value = 0.0
    total_invested = 0.0
    current_monthly = req.monthly_amount
    yearly = []

    for y in range(1, req.years + 1):
        for _ in range(12):
            total_invested += current_monthly
            total_value = (total_value + current_monthly) * (1 + monthly_rate)
        yearly.append({"year": y, "invested": round(total_invested), "value": round(total_value)})
        current_monthly *= (1 + req.annual_step_up / 100)

    return CalcResponse(
        total_invested=round(total_invested),
        estimated_returns=round(total_value - total_invested),
        total_value=round(total_value),
        yearly_breakdown=yearly,
    )


@app.post("/api/calc/swp", response_model=CalcResponse)
def calc_swp(req: SWPRequest):
    monthly_rate = req.expected_return / 100 / 12
    balance = req.initial_investment
    total_withdrawn = 0.0
    yearly = []

    for y in range(1, req.years + 1):
        for _ in range(12):
            balance = balance * (1 + monthly_rate) - req.monthly_withdrawal
            total_withdrawn += req.monthly_withdrawal
            if balance < 0:
                balance = 0
                break
        yearly.append({"year": y, "withdrawn": round(total_withdrawn), "balance": round(max(balance, 0))})
        if balance <= 0:
            break

    return CalcResponse(
        total_invested=round(req.initial_investment),
        estimated_returns=round(total_withdrawn + max(balance, 0) - req.initial_investment),
        total_value=round(max(balance, 0)),
        yearly_breakdown=yearly,
    )


@app.post("/api/calc/lumpsum", response_model=CalcResponse)
def calc_lumpsum(req: LumpsumRequest):
    total_value = req.amount * ((1 + req.expected_return / 100) ** req.years)
    yearly = []
    for y in range(1, req.years + 1):
        val = req.amount * ((1 + req.expected_return / 100) ** y)
        yearly.append({"year": y, "invested": round(req.amount), "value": round(val)})

    return CalcResponse(
        total_invested=round(req.amount),
        estimated_returns=round(total_value - req.amount),
        total_value=round(total_value),
        yearly_breakdown=yearly,
    )
