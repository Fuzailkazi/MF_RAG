"""
Generator — produces grounded answers using Gemini with strict citation rules.
Supports conversation history for multi-turn context.
"""

from google import genai
from src.config import GEMINI_API_KEY, GENERATOR_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)

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
    """Format retrieved chunks into context for the LLM."""
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


def generate_answer(
    query: str,
    chunks: list[dict],
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Generate a grounded answer from retrieved chunks.
    Optionally includes conversation history for multi-turn context.
    """
    if not chunks:
        return "I don't have this information in my current sources."

    context = format_context(chunks)

    # Build conversation as a single prompt with history
    prompt_parts = []
    if conversation_history:
        for turn in conversation_history[-4:]:
            role = "User" if turn["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {turn['content']}")

    prompt_parts.append(f"CONTEXT CHUNKS:\n{context}\n\nUSER QUESTION: {query}")
    full_prompt = "\n\n".join(prompt_parts)

    response = client.models.generate_content(
        model=GENERATOR_MODEL,
        contents=full_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0,
            max_output_tokens=300,
        ),
    )

    return response.text.strip()
