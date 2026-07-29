"""
Modules 3 & 4 — Company Verification & Website Trust Assessment.

Both modules inspect the same underlying domain signals (WHOIS, SSL,
security headers, typosquatting) plus our internal database, so they share
this one verification endpoint; the frontend presents the same result under
two different pages/framings.
"""

import re
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas_common import SignalBreakdownItem
from app.schemas_companies import CompanyVerifyRequest, CompanyVerifyResponse
from app.services import domain_trust, graph, internal_db
from app.services.scan_log import log_scan, resolve_user_id
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
async def verify_company(payload: CompanyVerifyRequest, authorization: Optional[str] = Header(None)):
    domain = _normalize_domain(payload.domain)
    if not domain:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid domain is required.")

    signals = domain_trust.assess_domain(domain)

    db_signal = internal_db.check_domain(domain)
    if db_signal:
        signals.append(db_signal)

    # Milestone P2-7: bridge the "company" and "domain" node namespaces (both
    # identify the same domain string) so a report filed as report_type
    # 'website' — which links against the 'domain' type — is still visible
    # from a company/recruiter's neighbor traversal. Then check whether any
    # neighbor is already flagged.
    graph.link("company", domain, "domain", domain, "same_as", "companies.verify")
    neighbor_signal = graph.flagged_neighbor_signal("company", domain)
    if neighbor_signal:
        signals.append(neighbor_signal)

    composite = combine(signals)
    trust_score = round(100 - composite.final_score, 2)
    derived_status = (
        "suspicious" if composite.category == "high"
        else "unverified" if composite.category == "medium"
        else "verified"
    )

    admin = get_supabase_admin_client()
    current_status = None
    try:
        existing = admin.table("companies").select("status").eq("domain", domain).limit(1).execute()
        current_status = existing.data[0]["status"] if existing.data else None
    except Exception:
        pass  # best-effort; falls through to the derived status below

    # "predatory" is community-report ground truth (Milestone P2-2); an
    # automated re-scan's derived label must never downgrade it back to a
    # plain "suspicious" — only a future report/review can change it.
    # Milestone P2-6e: surface it as its own status (amber banner) rather
    # than folding it into the generic "suspicious" (red banner) label.
    status_label = "predatory" if current_status == "predatory" else derived_status

    try:
        admin.table("companies").upsert(
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

    signal_breakdown = [
        SignalBreakdownItem(name=s.name, score=s.score, weight=s.weight, explanation=s.explanation)
        for s in composite.breakdown
    ]

    scan_id = log_scan(
        payload.scan_type,
        domain,
        {
            "trust_score": trust_score,
            "status": status_label,
            "signal_breakdown": [s.model_dump() for s in signal_breakdown],
        },
        input_ref=domain,
        user_id=resolve_user_id(authorization),
    )

    return CompanyVerifyResponse(
        domain=domain,
        trust_score=trust_score,
        status=status_label,
        signal_breakdown=signal_breakdown,
        scan_id=scan_id,
    )
