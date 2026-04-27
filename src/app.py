"""
Streamlit Chat UI — Mutual Fund FAQ Assistant
"""

import streamlit as st
from src.safety.pii_filter import filter_query
from src.query.classifier import classify_query
from src.query.scheme_detector import detect_scheme
from src.query.retriever import retrieve
from src.query.generator import generate_answer
from src.safety.guard import get_refusal

# --- Page config ---
st.set_page_config(
    page_title="MF FAQ Assistant",
    page_icon="📊",
    layout="centered",
)

# --- Custom CSS ---
st.markdown(
    """
<style>
    /* Import a similar open-source font as a fallback if Proxima Nova isn't installed */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    html, body, [class*="st-"] {
        font-family: 'Proxima Nova', 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif !important;
    }

    .disclaimer-bar {
        background-color: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 16px;
        font-size: 14px;
        color: #856404;
        text-align: center;
    }
    .source-info {
        font-size: 13px;
        color: #6c757d;
        margin-top: 4px;
    }
    .stChatMessage {
        border-radius: 12px;
    }
</style>
""",
    unsafe_allow_html=True,
)

# --- Welcome banner ---
st.title("📊 Mutual Fund FAQ Assistant")
st.caption(
    "Ask factual questions about select mutual fund schemes — powered by official sources."
)

# --- Disclaimer (always visible) ---
st.markdown(
    '<div class="disclaimer-bar">'
    "⚠️ <strong>Facts-only. No investment advice.</strong> "
    "Mutual fund investments are subject to market risks. "
    "Please read all scheme-related documents carefully before investing."
    "</div>",
    unsafe_allow_html=True,
)

# --- Example queries ---
EXAMPLE_QUERIES = [
    "What is the expense ratio of Mirae Asset Large Cap Fund?",
    "What is the exit load for Parag Parikh Flexi Cap Fund?",
    "What is the lock-in period for an ELSS fund?",
]

st.markdown("**Try an example:**")
cols = st.columns(len(EXAMPLE_QUERIES))
for i, query in enumerate(EXAMPLE_QUERIES):
    if cols[i].button(query, key=f"example_{i}", use_container_width=True):
        st.session_state["pending_query"] = query

# --- Divider ---
st.divider()

# --- Chat history ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])


def process_query(query: str) -> str:
    """Run the full pipeline and return the response."""
    # Step 1: PII filter
    is_safe, msg = filter_query(query)
    if not is_safe:
        return f"🚫 {msg}"

    # Step 2: Classify
    category = classify_query(query)

    # Step 3: If not factual, refuse
    if category != "factual":
        return get_refusal(category)

    # Step 4: Detect scheme
    scheme = detect_scheme(query)

    # Step 5: Retrieve
    chunks = retrieve(query, scheme)

    # Step 6: Generate answer
    answer = generate_answer(query, chunks)
    return answer


# --- Handle pending query from example buttons ---
if "pending_query" in st.session_state:
    query = st.session_state.pop("pending_query")
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)
    with st.chat_message("assistant"):
        with st.spinner("Looking up..."):
            response = process_query(query)
        st.markdown(response)
    st.session_state.messages.append({"role": "assistant", "content": response})

# --- Chat input ---
if user_input := st.chat_input("Ask a factual question about mutual funds..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)
    with st.chat_message("assistant"):
        with st.spinner("Looking up..."):
            response = process_query(user_input)
        st.markdown(response)
    st.session_state.messages.append({"role": "assistant", "content": response})

# --- Footer ---
st.divider()
st.caption(
    "📚 Data sourced from official AMC, AMFI, and SEBI publications. "
    "Covers: Mirae Asset Large Cap, Parag Parikh Flexi Cap, Axis ELSS Tax Saver. "
    "| Last corpus refresh: April 2026"
)
