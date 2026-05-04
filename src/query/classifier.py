"""
Query Classifier — uses GPT-4o-mini to classify user queries.
"""

from openai import OpenAI
from src.config import OPENAI_API_KEY, CLASSIFIER_MODEL

CLASSIFICATION_PROMPT = """You are a query classifier for a mutual fund FAQ assistant.

Classify the user's query into exactly ONE of these categories:

- factual: Questions about specific fund details (expense ratio, exit load, lock-in, minimum SIP, benchmark, risk level, fund type, how-to questions about statements/downloads)
- advisory: Questions asking for investment advice ("should I invest", "is this a good fund", "how should I allocate")
- comparative: Questions comparing funds ("which is better", "A vs B", "best fund for")
- predictive: Questions about future returns or performance ("will this fund give", "expected returns", "how will it perform")
- out_of_scope: Questions unrelated to mutual funds ("weather", "news", general chat)

Respond with ONLY the category name, nothing else."""


def classify_query(query: str) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=CLASSIFIER_MODEL,
        messages=[
            {"role": "system", "content": CLASSIFICATION_PROMPT},
            {"role": "user", "content": query},
        ],
        temperature=0,
        max_tokens=20,
    )
    category = response.choices[0].message.content.strip().lower()
    valid = {"factual", "advisory", "comparative", "predictive", "out_of_scope"}
    return category if category in valid else "out_of_scope"
