"""
Gemini text-embedding-004 wrapper (768-dim) powering pgvector similarity
search (Milestone P2-4). Every write path (job postings, fraud reports)
calls `embed_text` so `match_fraud_content` has real data to search; the
query side (`app/similarity.py`) calls it again on the submitted text.

Embeddings are optional enrichment everywhere they're used — a failure
here should never block a job analysis or report submission.
"""

import google.generativeai as genai

from app.config import settings

_EMBEDDING_MODEL = "models/gemini-embedding-001"
_EMBEDDING_DIM = 768
_MAX_CHARS = 8000

_configured = False


def _ensure_configured() -> bool:
    global _configured
    if not settings.GEMINI_API_KEY:
        return False
    if not _configured:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True
    return True


def embed_text(text: str) -> list[float] | None:
    """Best-effort embedding of `text`. Returns None on failure or if Gemini
    isn't configured — never raises."""
    if not text or not text.strip():
        return None
    if not _ensure_configured():
        return None
    try:
        result = genai.embed_content(
            model=_EMBEDDING_MODEL,
            content=text[:_MAX_CHARS],
            output_dimensionality=_EMBEDDING_DIM,
        )
        embedding = result.get("embedding") if isinstance(result, dict) else None
        return list(embedding) if embedding else None
    except Exception:
        return None
