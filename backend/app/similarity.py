"""
Module 7 — Real scam similarity search (Milestone P2-4).

Replaces the old `/scanner/analyze-similarity` behavior of asking Gemini to
recall "known scams" from training memory (hallucination-prone) with an
actual pgvector search over our own stored `fraud_reports` and
`job_postings`. Gemini's only remaining role here is narrating *real*
matches in plain language — it never invents them.
"""

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas_similarity import SimilarityCheckRequest, SimilarityCheckResponse, SimilarityMatch
from app.services import gemini_client
from app.services.embeddings import embed_text
from app.services.scan_log import log_scan, resolve_user_id
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/similarity", tags=["Scam Similarity"])

_DEFAULT_MATCH_COUNT = 5
_DEFAULT_MIN_SIMILARITY = 0.5


def find_similar(
    text: str,
    *,
    match_count: int = _DEFAULT_MATCH_COUNT,
    min_similarity: float = _DEFAULT_MIN_SIMILARITY,
) -> list[SimilarityMatch]:
    """Embed `text` and search stored fraud content via the `match_fraud_content`
    SQL function. Empty list (never hallucinated matches) if embedding or the
    RPC call fails, or if nothing clears `min_similarity`."""
    vector = embed_text(text)
    if not vector:
        return []
    try:
        result = get_supabase_admin_client().rpc(
            "match_fraud_content",
            {"query_embedding": vector, "match_count": match_count, "min_similarity": min_similarity},
        ).execute()
    except Exception:
        return []

    matches = []
    for row in result.data or []:
        content = row.get("content") or ""
        matches.append(
            SimilarityMatch(
                source_table=row["source_table"],
                id=row["id"],
                similarity=round(row["similarity"], 4),
                category=row.get("category"),
                excerpt=content[:300],
            )
        )
    return matches


def run_similarity_check(text: str, *, user_id: Optional[str] = None) -> SimilarityCheckResponse:
    """Core logic shared by `POST /similarity/check` and the legacy
    `POST /scanner/analyze-similarity` route, so both log exactly one
    scan_history row and never diverge in behavior."""
    matches = find_similar(text)

    if matches:
        try:
            analysis = gemini_client.explain_similarity_matches(
                text,
                [
                    {
                        "source_table": m.source_table,
                        "category": m.category,
                        "similarity": m.similarity,
                        "excerpt": m.excerpt,
                    }
                    for m in matches
                ],
            )
        except gemini_client.GeminiUnavailableError:
            analysis = (
                f"Found {len(matches)} similar case(s) in our records, the closest at "
                f"{round(matches[0].similarity * 100)}% similarity."
            )
    else:
        analysis = "No similar cases found in our records for this text."

    result: dict[str, Any] = {
        "matches": [m.model_dump() for m in matches],
        "analysis": analysis,
        # generic score/category so this shows up sensibly in scan_history / my-scans
        "similarityScore": round(matches[0].similarity * 100, 2) if matches else 0,
        "riskCategory": "match_found" if matches else "no_match",
    }
    scan_id = log_scan("similarity", text, result, user_id=user_id)

    return SimilarityCheckResponse(matches=matches, analysis=analysis, scan_id=scan_id)


@router.post(
    "/check",
    response_model=SimilarityCheckResponse,
    summary="Search stored fraud data for cases similar to the given text",
)
async def check_similarity(payload: SimilarityCheckRequest, authorization: Optional[str] = Header(None)):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text cannot be empty.")
    return run_similarity_check(text, user_id=resolve_user_id(authorization))
