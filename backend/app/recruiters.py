"""
Module 2 — Recruiter Verification.

Signals: any prior internal-database record on the recruiter's email, the
trust status of their email domain's company record, a domain-match rule
check against a claimed employer, email authenticity checks (MX records,
free-mail/disposable providers, lookalike domains — Milestone P2-6d, see
app/services/email_checks.py), and a trust-graph check for flagged
neighbors (Milestone P2-7, see app/services/graph.py).
"""

from typing import Optional

from fastapi import APIRouter, Header

from app.schemas_common import SignalBreakdownItem
from app.schemas_recruiters import RecruiterVerifyRequest, RecruiterVerifyResponse
from app.services import email_checks, graph, internal_db
from app.services.scan_log import log_scan, resolve_user_id
from app.services.scoring import Signal, combine
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/recruiters", tags=["Recruiter Verification"])


@router.post(
    "/verify",
    response_model=RecruiterVerifyResponse,
    summary="Assess a recruiter's trust rating",
)
async def verify_recruiter(payload: RecruiterVerifyRequest, authorization: Optional[str] = Header(None)):
    email = payload.email.strip().lower()
    email_domain = email.split("@")[-1] if "@" in email else ""

    signals: list[Signal] = []

    recruiter_signal = internal_db.check_recruiter_email(email)
    if recruiter_signal:
        signals.append(recruiter_signal)

    if email_domain:
        company_signal = internal_db.check_domain(email_domain)
        if company_signal:
            signals.append(
                Signal(
                    name="internal_db:recruiter_company",
                    score=company_signal.score,
                    weight=company_signal.weight,
                    explanation=f"Recruiter's email domain ({email_domain}): {company_signal.explanation}",
                    is_override=company_signal.is_override,
                )
            )

    claimed: Optional[str] = None
    if payload.claimed_company_domain:
        claimed = payload.claimed_company_domain.strip().lower()
        matches = bool(email_domain) and (email_domain == claimed or email_domain.endswith(f".{claimed}"))
        if matches:
            signals.append(
                Signal(
                    name="rules:domain_match",
                    score=5.0,
                    weight=15,
                    explanation="Recruiter's email domain matches the claimed company domain.",
                )
            )
        else:
            signals.append(
                Signal(
                    name="rules:domain_mismatch",
                    score=70.0,
                    weight=25,
                    explanation=(
                        f"Recruiter's email domain ({email_domain or 'none'}) does not match "
                        f"the claimed company domain ({claimed})."
                    ),
                )
            )

    if email_domain:
        signals.extend(email_checks.assess_email(email_domain, claimed))

    # Milestone P2-7: record this recruiter's relationships in the trust
    # graph, then check whether any of its neighbors are already flagged —
    # the "recruiter linked to a flagged domain/company" signal.
    if email_domain:
        graph.link("recruiter", email, "domain", email_domain, "same_email_domain", "recruiters.verify")
    if claimed:
        graph.link("recruiter", email, "company", claimed, "claims_company", "recruiters.verify")

    neighbor_signal = graph.flagged_neighbor_signal("recruiter", email)
    if neighbor_signal:
        signals.append(neighbor_signal)

    if not signals:
        signals.append(
            Signal(
                name="rules:no_history",
                score=45.0,
                weight=10,
                explanation="No prior record and no claimed company to cross-check — treated as unverified.",
            )
        )

    composite = combine(signals)
    trust_rating = round(100 - composite.final_score, 2)
    status_label = (
        "suspicious" if composite.category == "high"
        else "unverified" if composite.category == "medium"
        else "verified"
    )

    try:
        get_supabase_admin_client().table("recruiters").upsert(
            {
                "email": email,
                "name": payload.name,
                "status": status_label,
                "trust_rating": trust_rating,
            },
            on_conflict="email",
        ).execute()
    except Exception:
        pass  # persistence is best-effort; never fail the verification response over it

    signal_breakdown = [
        SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
        for s in composite.breakdown
    ]

    scan_id = log_scan(
        "recruiter",
        email,
        {
            "trust_rating": trust_rating,
            "status": status_label,
            "signal_breakdown": [s.model_dump() for s in signal_breakdown],
        },
        input_ref=email,
        user_id=resolve_user_id(authorization),
    )

    return RecruiterVerifyResponse(
        email=email,
        trust_rating=trust_rating,
        status=status_label,
        signal_breakdown=signal_breakdown,
        scan_id=scan_id,
    )
