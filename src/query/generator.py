"""
Generator — produces grounded answers using GPT-4o with strict citation rules.
Supports conversation history for multi-turn context.
"""

from openai import OpenAI
from src.config import OPENAI_API_KEY, GENERATOR_MODEL

SYSTEM_PROMPT = """You are a facts-only mutual fund FAQ assistant for Groww.

RULES:
- Answer ONLY using the provided context chunks below
- Maximum 3 sentences
- Include exactly one source citation as a URL
- Include the last-updated date from the chunk metadata
- If the context doesn't contain the answer, say: "I don't have this information in my current sources."
- Never give investment advice, comparisons, or predictions
- Never make up information not present in the context

Respond in this exact format:
[Your answer in 1-3 sentences]

📎 Source: [source_url from the most relevant chunk]
🗓️ Last updated from sources: [scrape_date]"""


def format_context(chunks: list[dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        context_parts.append(
            f"--- Chunk {i} ---\n"
            f"Source: {meta.get('source_url', 'N/A')}\n"
            f"Scheme: {meta.get('scheme_name', 'N/A')}\n"
            f"Doc type: {meta.get('doc_type', 'N/A')}\n"
            f"Scrape date: {meta.get('scrape_date', 'N/A')}\n"
            f"Content:\n{chunk['text']}\n"
        )
    return "\n".join(context_parts)


def generate_answer(query: str, chunks: list[dict], conversation_history: list[dict] | None = None) -> str:
    if not chunks:
        return "I don't have this information in my current sources."

    context = format_context(chunks)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history:
        for turn in conversation_history[-4:]:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": f"CONTEXT CHUNKS:\n{context}\n\nUSER QUESTION: {query}"})

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=GENERATOR_MODEL,
        messages=messages,
        temperature=0,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()
