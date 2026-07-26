"""
Module 1 — Job Fraud Detection.

Risk is a weighted composite of independent signals (see
app/services/scoring.py): rule-based red-flag phrases, an internal-database
match on any domain/email found in the text, and Gemini's structured
semantic sub-signals. No single source is treated as the final verdict.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas_common import SignalBreakdownItem
from app.schemas_jobs import JobAnalyzeRequest, JobAnalyzeResponse
from app.services import gemini_client, internal_db, rule_checks
from app.services.embeddings import embed_text
from app.services.scan_log import log_scan, resolve_user_id
from app.services.scoring import combine
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/jobs", tags=["Job Fraud Detection"])


@router.post(
    "/analyze",
    response_model=JobAnalyzeResponse,
    summary="Analyze a job posting for fraud risk",
)
async def analyze_job(payload: JobAnalyzeRequest, authorization: Optional[str] = Header(None)):
    text = payload.description.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    signals = [rule_checks.check_red_flag_phrases(text)]

    domain = internal_db.extract_domain(text)
    if domain:
        db_signal = internal_db.check_domain(domain)
        if db_signal:
            signals.append(db_signal)

    ai_available = True
    gemini_summary = ""
    try:
        gemini_signals, gemini_summary = gemini_client.analyze_job_posting(text)
        signals.extend(gemini_signals)
    except gemini_client.GeminiUnavailableError:
        ai_available = False

    composite = combine(signals)

    explanation = gemini_summary or "Assessment based on rule-based checks and internal database records."
    if not ai_available:
        explanation += (
            " (AI semantic analysis was unavailable for this request — score reflects "
            "rule-based and database signals only.)"
        )

    try:
        get_supabase_admin_client().table("job_postings").insert(
            {
                "description": text,
                "risk_score": composite.final_score,
                "risk_category": composite.category,
                "explanation": explanation,
                "signal_breakdown": [
                    {
                        "name": s.name,
                        "score": s.score,
                        "weight": s.weight,
                        "explanation": s.explanation,
                        "is_override": s.is_override,
                    }
                    for s in composite.breakdown
                ],
                # Powers Module 7's pgvector similarity search (Milestone P2-4);
                # None (embedding failure) is a valid value, never blocks the insert.
                "embedding": embed_text(text),
            }
        ).execute()
    except Exception:
        pass  # persistence is best-effort; never fail the analysis response over it

    signal_breakdown = [
        SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
        for s in composite.breakdown
    ]

    scan_id = log_scan(
        "job_text",
        text,
        {
            "risk_score": composite.final_score,
            "risk_category": composite.category,
            "explanation": explanation,
            "signal_breakdown": [s.model_dump() for s in signal_breakdown],
            "ai_available": ai_available,
        },
        user_id=resolve_user_id(authorization),
    )

    return JobAnalyzeResponse(
        risk_score=composite.final_score,
        risk_category=composite.category,
        explanation=explanation,
        signal_breakdown=signal_breakdown,
        ai_available=ai_available,
        scan_id=scan_id,
    )
