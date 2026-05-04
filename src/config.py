import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "mf-faq")

CHUNK_SIZE = 512
CHUNK_OVERLAP = 50
TOP_K = 5

EMBEDDING_MODEL = "text-embedding-3-small"
CLASSIFIER_MODEL = "gpt-4o-mini"
GENERATOR_MODEL = "gpt-4o"

SCHEME_REGISTRY = {
    "Mirae Asset Large Cap Fund": {
        "amc": "Mirae Asset",
        "category": "large-cap",
        "aliases": ["mirae large cap", "mirae asset large cap"],
    },
    "Mirae Asset Emerging Bluechip Fund": {
        "amc": "Mirae Asset",
        "category": "large-and-mid-cap",
        "aliases": ["mirae emerging bluechip", "mirae bluechip"],
    },
    "Mirae Asset Tax Saver Fund": {
        "amc": "Mirae Asset",
        "category": "elss",
        "aliases": ["mirae tax saver", "mirae elss"],
    },
}
