"""
PII Filter — regex-based detection for PAN, Aadhaar, phone, email, account numbers.
Runs BEFORE any LLM call.
"""

import re


PII_PATTERNS = {
    "PAN": r"[A-Z]{5}[0-9]{4}[A-Z]",
    "Aadhaar": r"[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}",
    "Phone": r"(\+91)?[6-9][0-9]{9}",
    "Email": r"\S+@\S+\.\S+",
    "Account Number": r"[0-9]{9,18}",
}

REJECTION_MESSAGE = (
    "This assistant does not accept or process personal information "
    "(PAN, Aadhaar, phone, email, or account numbers). "
    "Please remove any personal details and rephrase your question."
)


def check_pii(text: str) -> tuple[bool, str | None]:
    """
    Check if text contains PII.
    Returns (has_pii, pii_type) — e.g. (True, "PAN") or (False, None).
    """
    for pii_type, pattern in PII_PATTERNS.items():
        if re.search(pattern, text):
            return True, pii_type
    return False, None


def filter_query(query: str) -> tuple[bool, str]:
    """
    Run PII filter on a user query.
    Returns (is_safe, message).
    If unsafe, message is the rejection text.
    If safe, message is empty.
    """
    has_pii, pii_type = check_pii(query)
    if has_pii:
        return False, REJECTION_MESSAGE
    return True, ""
