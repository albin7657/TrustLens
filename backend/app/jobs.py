"""
Module 1 — Job Fraud Detection.

Risk is a weighted composite of independent signals (see
app/services/scoring.py): rule-based red-flag phrases (including the
pay-for-certificate / internship-mill pattern, Milestone P2-6a), an
internal-database match on any domain/email found in the text, full
domain-trust and recruiter-email cross-checks (Milestone P2-6b, folding
Modules 2/3/4 into one paste), and Gemini's structured semantic
sub-signals. No single source is treated as the final verdict.
"""

from typing import Any, Optional
from urllib.parse import urlparse

import logging
import httpx
import trafilatura
from fastapi import APIRouter, Header, HTTPException, status

logger = logging.getLogger(__name__)

from app.schemas_common import SignalBreakdownItem
from app.schemas_jobs import (
    JobAnalyzeRequest,
    JobAnalyzeResponse,
    JobAnalyzeUrlRequest,
    JobUrlFetchFailedResponse,
    LocalModelResult,
)
from app.services import domain_trust, email_checks, gemini_client, graph, internal_db, rule_checks
from app.services.embeddings import embed_text
from app.services.local_models import predict_job_fraud
from app.services.scan_log import log_scan, resolve_user_id
from app.services.scoring import Signal, combine
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/jobs", tags=["Job Fraud Detection"])

# Milestone P2-6c: sites whose ToS prohibit scraping / that reliably block
# bots. No evasion attempted for these or anyone else — see _fetch_page_text.
BLOCKED_JOB_BOARDS = {
    "linkedin.com", "indeed.com", "naukri.com", "glassdoor.com", "monster.com",
    "ziprecruiter.com", "shine.com", "foundit.in", "ambitionbox.com", "timesjobs.com",
}
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_MIN_EXTRACTED_CHARS = 300
_UNREADABLE_MARKERS = (
    "enable javascript", "captcha", "verify you are human", "access denied", "are you human",
)


def _link_job_posting(job_posting_id: str, domain: Optional[str], email: Optional[str]) -> None:
    """Best-effort entity_links rows for the trust graph (Milestones P2-6b/P2-7)."""
    if domain:
        graph.link("job_posting", job_posting_id, "domain", domain, "mentions_domain", "jobs.analyze")
    if email:
        graph.link("job_posting", job_posting_id, "recruiter", email, "mentions_recruiter", "jobs.analyze")


async def _run_job_analysis(
    text: str,
    company_name: Optional[str],
    *,
    scan_type: str,
    input_ref: Optional[str],
    authorization: Optional[str],
) -> JobAnalyzeResponse:
    signals = [
        rule_checks.check_red_flag_phrases(text),
        rule_checks.check_internship_fee_phrases(text),
    ]

    # Local, frozen DistilBERT classifier — an independent signal alongside
    # Gemini's, not a replacement for it (see module docstring: no single
    # source is the final verdict). Best-effort: a missing/broken model
    # checkpoint just means this one signal is skipped, not a failed scan.
    local_model: Optional[LocalModelResult] = None
    try:
        local_prediction = predict_job_fraud(text)
        local_model = LocalModelResult(
            label=local_prediction["label"],
            confidence=local_prediction["confidence"],
            risk_level=local_prediction["risk_level"],
        )
        is_fraud = bool(local_prediction.get("prediction") == 1 and local_prediction.get("confidence", 0) >= 85.0)
        signals.append(
            Signal(
                name="local_model:distilbert",
                score=float(local_prediction["risk_score"]),
                weight=25,
                explanation=(
                    f"Local DistilBERT classifier: {local_prediction['label']} "
                    f"({local_prediction['confidence']}% confidence)."
                ),
                is_override=is_fraud,
            )
        )
    except Exception as exc:
        logger.warning("Local DistilBERT model prediction failed: %s", exc)

    # Milestone P2-6b: fold Modules 2/3/4 into this one paste — cross-check
    # any domain/email mentioned in the posting the same way a standalone
    # company/recruiter verification would, instead of just the bare
    # internal-DB lookup this endpoint used to do.
    domain = internal_db.extract_domain(text)
    email = internal_db.extract_email(text)
    email_domain = email.split("@")[-1] if email else None

    if domain:
        db_signal = internal_db.check_domain(domain)
        if db_signal:
            signals.append(db_signal)
        signals.extend(domain_trust.assess_domain(domain))

    if email_domain:
        recruiter_signal = internal_db.check_recruiter_email(email)
        if recruiter_signal:
            signals.append(recruiter_signal)
        claimed = domain if (domain and domain != email_domain) else None
        signals.extend(email_checks.assess_email(email_domain, claimed))

    ai_available = True
    gemini_summary = ""
    posting_type = "job"
    predatory_score = 0.0
    try:
        gemini_signals, gemini_summary, posting_type, predatory_score = gemini_client.analyze_job_posting(text)
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

    # Milestone P2-6a: a pay-for-certificate posting earns a distinct
    # verdict_label regardless of the overall risk_category — either the
    # rule-based phrase check is confident on its own, or Gemini classified
    # it as an internship with a severe predatory-pattern score.
    internship_fee_signal = next((s for s in signals if s.name == "rules:internship_fee_phrases"), None)
    rule_based_predatory = bool(internship_fee_signal and internship_fee_signal.score >= 66.0)
    gemini_predatory = (
        posting_type == "internship" and predatory_score >= gemini_client.PREDATORY_INTERNSHIP_THRESHOLD
    )
    verdict_label = "predatory_internship" if (rule_based_predatory or gemini_predatory) else None

    job_posting_id: Optional[str] = None
    try:
        result = (
            get_supabase_admin_client()
            .table("job_postings")
            .insert(
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
                    "embedding": embed_text(text),
                }
            )
            .execute()
        )
        if result.data:
            job_posting_id = result.data[0]["id"]
    except Exception:
        pass  # persistence is best-effort; never fail the analysis response over it

    if job_posting_id:
        _link_job_posting(job_posting_id, domain, email)

    signal_breakdown = [
        SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
        for s in composite.breakdown
    ]

    scan_id = log_scan(
        scan_type,
        text,
        {
            "risk_score": composite.final_score,
            "risk_category": composite.category,
            "explanation": explanation,
            "signal_breakdown": [s.model_dump() for s in signal_breakdown],
            "ai_available": ai_available,
            "verdict_label": verdict_label,
            "posting_type": posting_type,
            "local_model": local_model.model_dump() if local_model else None,
        },
        input_ref=input_ref,
        user_id=resolve_user_id(authorization),
    )

    return JobAnalyzeResponse(
        risk_score=composite.final_score,
        risk_category=composite.category,
        explanation=explanation,
        signal_breakdown=signal_breakdown,
        ai_available=ai_available,
        verdict_label=verdict_label,
        posting_type=posting_type,
        local_model=local_model,
        scan_id=scan_id,
    )


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
    return await _run_job_analysis(
        text, payload.company_name, scan_type="job_text", input_ref=None, authorization=authorization
    )


# ── Analyze by URL (Milestone P2-6c) ────────────────────────────────────────

def _domain_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":")[0]
    return host[4:] if host.startswith("www.") else host


def _is_blocked_board(domain: str) -> bool:
    return any(domain == d or domain.endswith(f".{d}") for d in BLOCKED_JOB_BOARDS)


def _fetch_page_text(url: str) -> tuple[Optional[str], Optional[str]]:
    """Generic extraction, no selector scraping — site redesigns can't break
    this. Returns (extracted_text, fail_reason); fail_reason is None on
    success. No retries, no proxies, no stealth browsers: one user-initiated
    fetch per URL, and a hard failure just means "paste the text instead"."""
    try:
        resp = httpx.get(url, headers={"User-Agent": _USER_AGENT}, timeout=10.0, follow_redirects=True)
    except Exception:
        return None, "page_unreadable"

    if resp.status_code in (403, 429) or resp.status_code >= 400:
        return None, "page_unreadable"

    extracted = trafilatura.extract(resp.text) or ""
    if len(extracted) < _MIN_EXTRACTED_CHARS:
        return None, "page_unreadable"

    # Check markers against the *extracted* text, not the raw HTML — the raw
    # source is full of JS config blobs and cookie-banner strings that
    # coincidentally contain words like "captcha" on completely legitimate
    # pages (e.g. Wikipedia's edit-captcha feature flag).
    if any(marker in extracted.lower() for marker in _UNREADABLE_MARKERS):
        return None, "page_unreadable"

    return extracted, None


def _domain_analysis(domain: str) -> dict[str, Any]:
    """Run domain_trust + internal_db against a bare domain — used both as
    the fetch_failed fallback and as part of the full URL analysis. Often
    the whole verdict by itself when the page can't be read."""
    signals = domain_trust.assess_domain(domain)
    db_signal = internal_db.check_domain(domain)
    if db_signal:
        signals.append(db_signal)
    composite = combine(signals)
    return {
        "domain": domain,
        "trust_score": round(100 - composite.final_score, 2),
        "risk_category": composite.category,
        "signal_breakdown": [
            SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation).model_dump()
            for s in composite.breakdown
        ],
    }


@router.post("/analyze-url", summary="Analyze a job posting by URL")
async def analyze_job_by_url(payload: JobAnalyzeUrlRequest, authorization: Optional[str] = Header(None)):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A URL is required.")

    domain = _domain_from_url(url)
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Could not parse a domain from this URL."
        )

    if _is_blocked_board(domain):
        return JobUrlFetchFailedResponse(
            reason="site_blocks_bots", domain_analysis=_domain_analysis(domain)
        ).model_dump()

    extracted_text, fail_reason = _fetch_page_text(url)
    if fail_reason:
        return JobUrlFetchFailedResponse(reason=fail_reason, domain_analysis=_domain_analysis(domain)).model_dump()

    result = await _run_job_analysis(
        extracted_text, None, scan_type="job_url", input_ref=url, authorization=authorization
    )
    return result.model_dump()
