"""
RAG chat assistant — retrieval-augmented Q&A over TrustLens fraud data.

Retrieves context from:
  1. pgvector similarity search (fraud_reports + job_postings)
  2. Trust repository keyword search (companies, recruiters, scam sites, reports)

Then asks Gemini to answer using only that context.
"""

import re

from fastapi import APIRouter, HTTPException, status

from app.repository import search_repository_records
from app.schemas_rag import RagChatRequest, RagChatResponse, RagSourceItem
from app.services import gemini_client
from app.services.config_store import get_config
from app.similarity import find_similar

router = APIRouter(prefix="/rag", tags=["RAG Assistant"])

_CHAT_MATCH_COUNT = 5
_CHAT_MIN_SIMILARITY = 0.35
_REPO_LIMIT = 8


def _extract_search_terms(question: str) -> str:
    """Pull likely entity names from a natural-language question."""
    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', question)
    if quoted:
        return next((a or b for a, b in quoted if a or b), question)
    cleaned = re.sub(
        r"\b(is|are|was|were|has|have|had|the|a|an|this|that|safe|legit|legitimate|scam|fraud|fake|reported|about|how|what|when|where|who|why|can|could|should|would|do|does|did|tell|me|check|verify)\b",
        " ",
        question,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ?.,!")
    return cleaned[:120] if cleaned else question[:120]


@router.post(
    "/chat",
    response_model=RagChatResponse,
    summary="Ask the RAG assistant a recruitment-fraud question",
)
async def rag_chat(payload: RagChatRequest):
    config = get_config()
    if not config.get("rag_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG assistant is currently disabled by an administrator.",
        )

    question = payload.message.strip()
    search_terms = _extract_search_terms(question)

    matches = find_similar(
        question,
        match_count=_CHAT_MATCH_COUNT,
        min_similarity=_CHAT_MIN_SIMILARITY,
    )
    repo_results = search_repository_records(search_terms, limit=_REPO_LIMIT)

    match_dicts = [
        {
            "source_table": m.source_table,
            "category": m.category,
            "similarity": m.similarity,
            "excerpt": m.excerpt,
        }
        for m in matches
    ]
    repo_dicts = [r.model_dump() for r in repo_results]

    try:
        result = gemini_client.answer_rag_question(
            question,
            match_dicts,
            repo_dicts,
            system_prompt=config.get("system_prompt_override"),
        )
    except gemini_client.GeminiUnavailableError:
        result = gemini_client.fallback_rag_answer(question, match_dicts, repo_dicts)

    source_details: list[RagSourceItem] = []
    for m in matches:
        label = f"{m.source_table.replace('_', ' ').title()}"
        if m.category:
            label += f" ({m.category})"
        source_details.append(
            RagSourceItem(label=label, type=m.source_table, similarity=m.similarity)
        )
    for r in repo_results:
        label = f"{r.type.replace('_', ' ').title()}: {r.label}"
        source_details.append(RagSourceItem(label=label, type=r.type))

    sources = result.get("sources") or []
    if not sources and source_details:
        sources = [s.label for s in source_details[:5]]

    return RagChatResponse(
        answer=result["answer"],
        confidence=result["confidence"],
        sources=sources,
        source_details=source_details,
    )
