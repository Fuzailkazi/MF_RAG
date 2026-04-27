"""
Query Classifier — uses Gemini Flash to classify user queries.
Categories: factual, advisory, comparative, predictive, out_of_scope
"""

from google import genai
from src.config import GEMINI_API_KEY, CLASSIFIER_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)

CLASSIFICATION_PROMPT = """You are a query classifier for a mutual fund FAQ assistant.

Classify the user's query into exactly ONE of these categories:

- factual: Questions about specific fund details (expense ratio, exit load, lock-in, minimum SIP, benchmark, risk level, fund type, how-to questions about statements/downloads)
- advisory: Questions asking for investment advice ("should I invest", "is this a good fund", "how should I allocate")
- comparative: Questions comparing funds ("which is better", "A vs B", "best fund for")
- predictive: Questions about future returns or performance ("will this fund give", "expected returns", "how will it perform")
- out_of_scope: Questions unrelated to mutual funds ("weather", "news", general chat)

Respond with ONLY the category name, nothing else."""


def classify_query(query: str) -> str:
    """
    Classify a user query into one of the supported categories.
    """
    response = client.models.generate_content(
        model=CLASSIFIER_MODEL,
        contents=query,
        config=genai.types.GenerateContentConfig(
            system_instruction=CLASSIFICATION_PROMPT,
            temperature=0,
            max_output_tokens=20,
        ),
    )

    category = response.text.strip().lower()

    valid_categories = {"factual", "advisory", "comparative", "predictive", "out_of_scope"}
    if category not in valid_categories:
        return "out_of_scope"

    return category
