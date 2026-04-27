"""
Guard — refusal messages with educational redirects for non-factual queries.
"""

REFUSAL_TEMPLATES = {
    "advisory": (
        "This assistant only answers factual questions about mutual fund schemes "
        "(expense ratios, exit loads, lock-in periods, etc.) using official sources.\n\n"
        "For investment advice, please consult a SEBI-registered investment advisor or visit: "
        "https://www.amfiindia.com/investor-corner/knowledge-center/what-are-mutual-funds.html"
    ),
    "comparative": (
        "This assistant only answers factual questions about mutual fund schemes "
        "(expense ratios, exit loads, lock-in periods, etc.) using official sources.\n\n"
        "For fund comparisons, please visit: "
        "https://www.amfiindia.com/research-information/other-data/scheme-performance-details"
    ),
    "predictive": (
        "This assistant only answers factual questions about mutual fund schemes "
        "(expense ratios, exit loads, lock-in periods, etc.) using official sources.\n\n"
        "For past performance data, please check the official factsheet of the fund on the AMC website."
    ),
    "out_of_scope": (
        "This assistant only answers factual questions about mutual fund schemes "
        "(expense ratios, exit loads, lock-in periods, etc.) using official sources.\n\n"
        "For general queries, please visit: https://www.amfiindia.com"
    ),
}


def get_refusal(category: str) -> str:
    """Return the refusal message for a given query category."""
    return REFUSAL_TEMPLATES.get(category, REFUSAL_TEMPLATES["out_of_scope"])
