"""
Embedder — embeds chunks using OpenAI and upserts to Pinecone.
"""

import hashlib
from openai import OpenAI
from pinecone import Pinecone

from src.config import OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME, EMBEDDING_MODEL
from src.ingestion.chunker import chunk_all


BATCH_SIZE = 50  # Pinecone upsert batch size


def get_embedding(client: OpenAI, text: str) -> list[float]:
    """Get embedding for a single text."""
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def embed_and_upsert(chunks: list[dict]) -> int:
    """
    Embed all chunks and upsert to Pinecone.
    Returns the number of vectors upserted.
    """
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)

    # Embed in batches
    vectors = []
    for i, chunk in enumerate(chunks):
        text = chunk["text"]
        metadata = {**chunk["metadata"], "text": text}  # Store text in metadata for retrieval

        # Create a stable ID from source URL + chunk index
        raw_id = f"{chunk['metadata']['source_url']}_{chunk['metadata']['chunk_index']}"
        vector_id = hashlib.md5(raw_id.encode()).hexdigest()

        embedding = get_embedding(openai_client, text)
        vectors.append({
            "id": vector_id,
            "values": embedding,
            "metadata": metadata,
        })

        if (i + 1) % 10 == 0:
            print(f"  Embedded {i + 1}/{len(chunks)} chunks")

    # Upsert in batches
    total_upserted = 0
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i : i + BATCH_SIZE]
        index.upsert(vectors=batch)
        total_upserted += len(batch)
        print(f"  Upserted batch: {total_upserted}/{len(vectors)}")

    print(f"\nDone: {total_upserted} vectors in Pinecone index '{PINECONE_INDEX_NAME}'.")
    return total_upserted


def run_ingestion():
    """Full pipeline: chunk -> embed -> upsert."""
    print("Step 1: Chunking scraped content...")
    chunks = chunk_all()

    if not chunks:
        print("No chunks to embed. Did you run the scraper first?")
        return

    print(f"\nStep 2: Embedding and upserting {len(chunks)} chunks to Pinecone...")
    count = embed_and_upsert(chunks)

    # Verify
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    stats = index.describe_index_stats()
    print(f"\nPinecone index stats: {stats.total_vector_count} total vectors")


if __name__ == "__main__":
    run_ingestion()
