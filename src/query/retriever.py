"""
Retriever — hybrid search: vector similarity + keyword boosting.
Retrieves from Pinecone with metadata filtering and re-ranking.
"""

import re
from openai import OpenAI
from pinecone import Pinecone

from src.config import (
    OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME,
    EMBEDDING_MODEL, TOP_K,
)

# Keywords that strongly indicate the user wants specific data fields
KEYWORD_BOOST = {
    "expense ratio": ["expense ratio", "ter", "total expense"],
    "exit load": ["exit load", "redemption charge", "exit fee"],
    "lock-in": ["lock-in", "lock in", "lockin", "lock period"],
    "minimum sip": ["minimum sip", "min sip", "sip amount", "minimum investment"],
    "benchmark": ["benchmark", "index", "nifty", "sensex"],
    "risk": ["risk", "riskometer", "risk level", "risk profile"],
    "nav": ["nav", "net asset value"],
    "fund type": ["open-ended", "open ended", "closed-ended", "fund type", "scheme type"],
    "capital gains": ["capital gains", "capital gain", "tax statement", "download statement"],
}


def get_query_embedding(client: OpenAI, query: str) -> list[float]:
    """Embed the user query."""
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=query)
    return response.data[0].embedding


def keyword_rerank(query: str, chunks: list[dict]) -> list[dict]:
    """
    Re-rank chunks by boosting those that contain keywords matching the query intent.
    This acts as a lightweight hybrid search layer on top of vector retrieval.
    """
    query_lower = query.lower()

    # Find which keyword categories the query matches
    matched_keywords = []
    for category, keywords in KEYWORD_BOOST.items():
        for kw in keywords:
            if kw in query_lower:
                matched_keywords.extend(keywords)
                break

    if not matched_keywords:
        return chunks

    # Boost scores for chunks containing these keywords
    reranked = []
    for chunk in chunks:
        text_lower = chunk["text"].lower()
        boost = sum(0.05 for kw in matched_keywords if kw in text_lower)
        reranked.append({**chunk, "score": chunk["score"] + boost})

    reranked.sort(key=lambda c: c["score"], reverse=True)
    return reranked


def retrieve(query: str, scheme_name: str | None = None) -> list[dict]:
    """
    Retrieve top-k chunks from Pinecone with hybrid search.
    1. Vector similarity search (with optional scheme filter)
    2. Keyword re-ranking boost
    3. Fallback to unfiltered if too few results

    Returns list of dicts: {text, metadata, score}
    """
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)

    query_embedding = get_query_embedding(openai_client, query)

    # Retrieve more candidates for re-ranking
    fetch_k = TOP_K * 3

    if scheme_name:
        results = index.query(
            vector=query_embedding,
            top_k=fetch_k,
            include_metadata=True,
            filter={"scheme_name": {"$eq": scheme_name}},
        )

        # Fallback: if < 2 results, retry without filter
        if len(results.matches) < 2:
            results = index.query(
                vector=query_embedding,
                top_k=fetch_k,
                include_metadata=True,
            )
    else:
        results = index.query(
            vector=query_embedding,
            top_k=fetch_k,
            include_metadata=True,
        )

    chunks = []
    for match in results.matches:
        chunks.append({
            "text": match.metadata.get("text", ""),
            "metadata": match.metadata,
            "score": match.score,
        })

    # Re-rank with keyword boosting
    chunks = keyword_rerank(query, chunks)

    # Return top-k after re-ranking
    return chunks[:TOP_K]
