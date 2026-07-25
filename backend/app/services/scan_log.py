"""
Best-effort persistence of every analysis into `scan_history`.

This is the raw data collection behind two things that don't exist without
it: the `my-scans` history/feedback UI (Milestone P2-3) and, later, the
training set for re-training the frozen DistilBERT models (Phase 3). No
analysis endpoint should return a result without also calling `log_scan`.
"""

from typing import Any, Optional

from app.supabase_client import get_supabase_admin_client, get_supabase_client

_VALID_SCAN_TYPES = {
    "job_text",
    "job_url",
    "job_image",
    "email",
    "communication",
    "company",
    "website",
    "recruiter",
    "similarity",
}

# Every module names its own score/category fields differently (risk_score
# vs trust_score vs riskScore, risk_category vs status vs riskLevel) — try
# each in order rather than forcing every call site to remap keys.
_SCORE_KEYS = ("risk_score", "trust_score", "trust_rating", "riskScore", "similarityScore")
_CATEGORY_KEYS = ("risk_category", "status", "riskCategory", "riskLevel")
_SIGNAL_KEYS = ("signal_breakdown", "signalBreakdown")


def _first(result: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if result.get(key) is not None:
            return result[key]
    return None


def resolve_user_id(authorization: Optional[str]) -> Optional[str]:
    """Best-effort bearer-token -> user id resolution shared by every
    analysis endpoint. None on any failure (missing/invalid token)."""
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "")
        resp = get_supabase_client().auth.get_user(token)
        return resp.user.id if resp.user else None
    except Exception:
        return None


def log_scan(
    scan_type: str,
    input_summary: str,
    result: dict[str, Any],
    *,
    input_ref: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """Best-effort insert into scan_history. Never raises. Returns row id or None."""
    if scan_type not in _VALID_SCAN_TYPES:
        return None
    try:
        row = {
            "scan_type": scan_type,
            "input_summary": (input_summary or "")[:500],
            "input_ref": input_ref,
            "risk_score": _first(result, _SCORE_KEYS),
            "risk_category": _first(result, _CATEGORY_KEYS),
            "signal_breakdown": _first(result, _SIGNAL_KEYS),
            "result_payload": result,
            "user_id": user_id,
        }
        inserted = get_supabase_admin_client().table("scan_history").insert(row).execute()
        return inserted.data[0]["id"] if inserted.data else None
    except Exception:
        return None
