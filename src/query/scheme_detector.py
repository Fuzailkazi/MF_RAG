"""
Scheme Detector — extracts target scheme name from user query.
Uses exact keyword match first, then fuzzy matching via thefuzz.
"""

from thefuzz import fuzz
from src.config import SCHEME_REGISTRY

FUZZY_THRESHOLD = 65  # Minimum score to consider a fuzzy match


def detect_scheme(query: str) -> str | None:
    """
    Detect which scheme the user is asking about.
    Returns the canonical scheme name or None for general queries.
    """
    query_lower = query.lower()

    # 1. Exact match against scheme names
    for scheme_name in SCHEME_REGISTRY:
        if scheme_name.lower() in query_lower:
            return scheme_name

    # 2. Exact match against aliases
    for scheme_name, info in SCHEME_REGISTRY.items():
        for alias in info["aliases"]:
            if alias.lower() in query_lower:
                return scheme_name

    # 3. Fuzzy match against scheme names and aliases
    best_score = 0
    best_match = None

    all_names = []
    for scheme_name, info in SCHEME_REGISTRY.items():
        all_names.append((scheme_name, scheme_name))
        for alias in info["aliases"]:
            all_names.append((alias, scheme_name))

    for name, canonical in all_names:
        score = fuzz.partial_ratio(query_lower, name.lower())
        if score > best_score:
            best_score = score
            best_match = canonical

    if best_score >= FUZZY_THRESHOLD:
        return best_match

    return None
