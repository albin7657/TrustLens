"""
Module 5 — Communication Analyzer.

Scores a message thread (email/SMS/WhatsApp/Telegram/other) the same way
every other module does: rule-based red-flag phrases + an internal-database
check on every mentioned domain/email (a scam-list hit is an override
signal) + Gemini's scam-stage/lure-type classification, combined into one
auditable score. A screenshot is handled entirely on the frontend, which
calls the existing `POST /scanner/ocr` first and feeds the extracted text
in as a message — no new backend endpoint needed for that.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas_common import SignalBreakdownItem
from app.schemas_communications import (
    CommunicationAnalyzeRequest,
    CommunicationAnalyzeResponse,
    ExtractedLink,
)
from app.services import gemini_client, graph, internal_db, rule_checks
from app.services.scan_log import log_scan, resolve_user_id
from app.services.scoring import combine

router = APIRouter(prefix="/communications", tags=["Communication Analyzer"])


def _build_thread_text(payload: CommunicationAnalyzeRequest) -> str:
    return "\n".join(f"[{m.sender}] {m.text}" for m in payload.messages)


@router.post(
    "/analyze",
    response_model=CommunicationAnalyzeResponse,
    summary="Analyze a message thread for scam stage, lure type, and risk",
)
async def analyze_communication(
    payload: CommunicationAnalyzeRequest, authorization: Optional[str] = Header(None)
):
    if not payload.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one message is required.")

    thread_text = _build_thread_text(payload)
    if not thread_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot all be empty.")

    signals = [rule_checks.check_red_flag_phrases(thread_text)]

    extracted_links: list[ExtractedLink] = []
    for item in internal_db.extract_links(thread_text):
        db_signal = internal_db.check_domain(item["domain"])
        if db_signal:
            signals.append(db_signal)
        extracted_links.append(
            ExtractedLink(
                url=item["url"],
                domain=item["domain"],
                internal_db_hit=db_signal.name.split(":", 1)[-1] if db_signal else None,
            )
        )

    ai_available = True
    scam_stage = "contact"
    lure_type = "none"
    gemini_summary = ""
    try:
        gemini_signals, scam_stage, lure_type, gemini_summary = gemini_client.analyze_communication(
            thread_text, payload.channel
        )
        signals.extend(gemini_signals)
    except gemini_client.GeminiUnavailableError:
        ai_available = False

    composite = combine(signals)

    explanation = gemini_summary or "Assessment based on rule-based checks and internal database records."
    if not ai_available:
        explanation += (
            " (AI semantic analysis was unavailable for this request — score reflects "
            "rule-based and database signals only, and the scam stage/lure type could not be classified.)"
        )

    signal_breakdown = [
        SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
        for s in composite.breakdown
    ]

    scan_id = log_scan(
        "communication",
        thread_text,
        {
            "risk_score": composite.final_score,
            "risk_category": composite.category,
            "scam_stage": scam_stage,
            "lure_type": lure_type,
            "explanation": explanation,
            "signal_breakdown": [s.model_dump() for s in signal_breakdown],
            "extracted_links": [link.model_dump() for link in extracted_links],
            "ai_available": ai_available,
        },
        user_id=resolve_user_id(authorization),
    )

    # Milestone P2-7: record every mentioned domain against this scan in the
    # trust graph — best-effort, after scan_id exists to link against.
    if scan_id:
        for link in extracted_links:
            graph.link("scan", scan_id, "domain", link.domain, "mentions_domain", "communications.analyze")

    return CommunicationAnalyzeResponse(
        risk_score=composite.final_score,
        risk_category=composite.category,
        scam_stage=scam_stage,
        lure_type=lure_type,
        explanation=explanation,
        signal_breakdown=signal_breakdown,
        extracted_links=extracted_links,
        ai_available=ai_available,
        scan_id=scan_id,
    )
