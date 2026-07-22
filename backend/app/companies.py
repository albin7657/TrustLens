"""
Modules 3 & 4 — Company Verification & Website Trust Assessment.

Both modules inspect the same underlying domain signals (WHOIS, SSL,
security headers, typosquatting) plus our internal database, so they share
this one verification endpoint; the frontend presents the same result under
two different pages/framings.
"""

import re

from fastapi import APIRouter, HTTPException, status

from app.schemas_common import SignalBreakdownItem
from app.schemas_companies import CompanyVerifyRequest, CompanyVerifyResponse
from app.services import domain_trust, internal_db
from app.services.scoring import combine
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/companies", tags=["Company & Website Trust"])

_SCHEME_RE = re.compile(r"^https?://", re.IGNORECASE)


def _normalize_domain(raw: str) -> str:
    domain = _SCHEME_RE.sub("", raw.strip().lower())
    return domain.split("/")[0]


@router.post(
    "/verify",
    response_model=CompanyVerifyResponse,
    summary="Assess a company/website's trust score",
)
async def verify_company(payload: CompanyVerifyRequest):
    domain = _normalize_domain(payload.domain)
    if not domain:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid domain is required.")

    signals = domain_trust.assess_domain(domain)

    db_signal = internal_db.check_domain(domain)
    if db_signal:
        signals.append(db_signal)

    composite = combine(signals)
    trust_score = round(100 - composite.final_score, 2)
    status_label = (
        "suspicious" if composite.category == "high"
        else "unverified" if composite.category == "medium"
        else "verified"
    )

    try:
        get_supabase_admin_client().table("companies").upsert(
            {
                "domain": domain,
                "name": payload.name or domain,
                "status": status_label,
                "trust_score": trust_score,
            },
            on_conflict="domain",
        ).execute()
    except Exception:
        pass  # persistence is best-effort; never fail the verification response over it

    return CompanyVerifyResponse(
        domain=domain,
        trust_score=trust_score,
        status=status_label,
        signal_breakdown=[
            SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
            for s in composite.breakdown
        ],
    )
