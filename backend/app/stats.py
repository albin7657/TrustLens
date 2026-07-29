"""
Milestone P2-8 — Stats endpoints powering the two dashboards.

GET /stats/me   → user's personal activity summary (no auth restriction; filters by user_id)
GET /stats/admin → full platform intelligence (role=admin only)
"""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.auth import get_role
from app.services.scan_log import resolve_user_id
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/stats", tags=["Stats / Dashboards"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_count(table: str, filters: list[tuple] = ()) -> int:
    """Return the exact row count for a table with optional eq-filters."""
    try:
        admin = get_supabase_admin_client()
        q = admin.table(table).select("id", count="exact")
        for col, val in filters:
            q = q.eq(col, val)
        r = q.execute()
        return r.count or 0
    except Exception:
        return 0


def _safe_query(table: str, select: str = "*", filters: list[tuple] = (), limit: int = 100) -> list:
    try:
        admin = get_supabase_admin_client()
        q = admin.table(table).select(select)
        for col, val in filters:
            q = q.eq(col, val)
        r = q.order("created_at", desc=True).limit(limit).execute()
        return r.data or []
    except Exception:
        return []


def _to_history_summary(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "scan_type": row.get("scan_type"),
        "input_summary": row.get("input_summary"),
        "risk_score": row.get("risk_score"),
        "risk_category": row.get("risk_category"),
        "created_at": str(row.get("created_at", "")),
    }


# ── GET /stats/me ─────────────────────────────────────────────────────────────

@router.get("/me", summary="User personal dashboard stats")
async def stats_me(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Personal stats for the requesting user.
    Filters scan_history and fraud_reports by user_id (from query param or bearer token).
    """
    resolved_user_id = user_id or resolve_user_id(authorization)
    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (pass user_id or a bearer token).",
        )

    admin = get_supabase_admin_client()

    # ── scan totals ────────────────────────────────────────────────────────────
    try:
        scan_r = (
            admin.table("scan_history")
            .select("id,risk_category", count="exact")
            .eq("user_id", resolved_user_id)
            .execute()
        )
        all_scans = scan_r.data or []
        total_scans = scan_r.count or 0
        high_risk_found = sum(
            1 for s in all_scans
            if (s.get("risk_category") or "").lower() in ("high", "suspicious")
        )
    except Exception:
        total_scans = 0
        high_risk_found = 0

    # ── report totals ──────────────────────────────────────────────────────────
    try:
        rep_r = (
            admin.table("fraud_reports")
            .select("id,status", count="exact")
            .eq("reporter_id", resolved_user_id)
            .execute()
        )
        all_reports = rep_r.data or []
        reports_submitted = rep_r.count or 0
        reports_approved = sum(1 for r in all_reports if r.get("status") == "approved")
    except Exception:
        reports_submitted = 0
        reports_approved = 0

    # ── recent 5 scans ─────────────────────────────────────────────────────────
    try:
        recent_r = (
            admin.table("scan_history")
            .select("id,scan_type,input_summary,risk_score,risk_category,created_at")
            .eq("user_id", resolved_user_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        recent_scans = [_to_history_summary(r) for r in (recent_r.data or [])]
    except Exception:
        recent_scans = []

    # ── my report statuses ─────────────────────────────────────────────────────
    try:
        my_rep_r = (
            admin.table("fraud_reports")
            .select("id,title,status,report_type,created_at")
            .eq("reporter_id", resolved_user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        my_report_statuses = [
            {
                "id": r.get("id"),
                "title": r.get("title") or "(no title)",
                "report_type": r.get("report_type"),
                "status": r.get("status"),
                "created_at": str(r.get("created_at", "")),
            }
            for r in (my_rep_r.data or [])
        ]
    except Exception:
        my_report_statuses = []

    return {
        "my_totals": {
            "scans": total_scans,
            "high_risk_found": high_risk_found,
            "reports_submitted": reports_submitted,
            "reports_approved": reports_approved,
        },
        "recent_scans": recent_scans,
        "my_report_statuses": my_report_statuses,
    }


# ── GET /stats/admin ──────────────────────────────────────────────────────────

@router.get("/admin", summary="Admin platform intelligence stats")
async def stats_admin(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Full platform intelligence for admins (role=admin required).
    Reads live table data — no hardcoded numbers.
    """
    if get_role(authorization) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")

    admin = get_supabase_admin_client()

    # ── aggregate totals ───────────────────────────────────────────────────────
    try:
        scan_all_r = admin.table("scan_history").select("id,risk_category", count="exact").execute()
        scan_all = scan_all_r.data or []
        total_scans = scan_all_r.count or 0
        scans_high_risk = sum(
            1 for s in scan_all
            if (s.get("risk_category") or "").lower() in ("high", "suspicious")
        )
    except Exception:
        total_scans = 0
        scans_high_risk = 0

    reports_pending = _safe_count("fraud_reports", [("status", "pending")])
    reports_approved = _safe_count("fraud_reports", [("status", "approved")])
    companies_tracked = _safe_count("companies")
    companies_suspicious = _safe_count("companies", [("status", "suspicious")])
    companies_predatory = _safe_count("companies", [("status", "predatory")])
    scam_websites = _safe_count("scam_websites")

    try:
        rec_r = (
            admin.table("recruiters")
            .select("id", count="exact")
            .eq("status", "suspicious")
            .execute()
        )
        recruiters_flagged = rec_r.count or 0
    except Exception:
        recruiters_flagged = 0

    # ── scans_by_type ──────────────────────────────────────────────────────────
    try:
        type_rows = admin.table("scan_history").select("scan_type").execute().data or []
        type_counts: Dict[str, int] = defaultdict(int)
        for row in type_rows:
            st = row.get("scan_type") or "unknown"
            type_counts[st] += 1
        scans_by_type: List[Dict] = [
            {"scan_type": k, "count": v}
            for k, v in sorted(type_counts.items(), key=lambda x: -x[1])
        ]
    except Exception:
        scans_by_type = []

    # ── lure_breakdown (from communication scans) ──────────────────────────────
    try:
        comm_rows = (
            admin.table("scan_history")
            .select("result_payload")
            .eq("scan_type", "communication")
            .execute()
            .data or []
        )
        lure_counts: Dict[str, int] = defaultdict(int)
        for row in comm_rows:
            payload = row.get("result_payload") or {}
            lt = payload.get("lure_type")
            if lt and lt != "none":
                lure_counts[str(lt)] += 1
        lure_breakdown: List[Dict] = [
            {"lure_type": k, "count": v}
            for k, v in sorted(lure_counts.items(), key=lambda x: -x[1])
        ]
    except Exception:
        lure_breakdown = []

    # ── top_flagged_domains ────────────────────────────────────────────────────
    try:
        link_rows = (
            admin.table("entity_links")
            .select("target_type,target_id")
            .in_("target_type", ["domain", "company"])
            .execute()
            .data or []
        )
        domain_hits: Dict[str, int] = defaultdict(int)
        for row in link_rows:
            domain_hits[row.get("target_id", "")] += 1

        # Get status from companies/scam_websites
        company_rows = admin.table("companies").select("domain,status").execute().data or []
        scam_rows = admin.table("scam_websites").select("domain").execute().data or []
        company_status: Dict[str, str] = {r["domain"]: r["status"] for r in company_rows if r.get("domain")}
        scam_set = {r["domain"] for r in scam_rows if r.get("domain")}

        top_flagged_domains: List[Dict] = []
        for domain, hits in sorted(domain_hits.items(), key=lambda x: -x[1])[:20]:
            st = company_status.get(domain)
            if not st and domain in scam_set:
                st = "scam_website"
            if st in ("suspicious", "predatory", "scam_website") or hits >= 2:
                top_flagged_domains.append({"domain": domain, "hits": hits, "status": st or "unknown"})
        top_flagged_domains = top_flagged_domains[:15]
    except Exception:
        top_flagged_domains = []

    # ── 30-day trend (group by day in Python) ────────────────────────────────
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        trend_rows = (
            admin.table("scan_history")
            .select("created_at,risk_category")
            .gte("created_at", cutoff)
            .execute()
            .data or []
        )
        day_scans: Dict[str, int] = defaultdict(int)
        day_high: Dict[str, int] = defaultdict(int)
        for row in trend_rows:
            try:
                d = str(row["created_at"])[:10]
                day_scans[d] += 1
                if (row.get("risk_category") or "").lower() in ("high", "suspicious"):
                    day_high[d] += 1
            except Exception:
                pass
        # fill last 30 days
        today = date.today()
        trend: List[Dict] = []
        for i in range(29, -1, -1):
            d = str(today - timedelta(days=i))
            trend.append({"date": d, "scans": day_scans.get(d, 0), "high_risk": day_high.get(d, 0)})
    except Exception:
        trend = []

    # ── recent feedback ────────────────────────────────────────────────────────
    try:
        fb_rows = (
            admin.table("scan_history")
            .select("id,scan_type,input_summary,feedback_accurate,feedback_comment,created_at")
            .not_.is_("feedback_accurate", "null")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
            .data or []
        )
        recent_feedback = [
            {
                "id": r.get("id"),
                "scan_type": r.get("scan_type"),
                "input_summary": r.get("input_summary"),
                "accurate": r.get("feedback_accurate"),
                "comment": r.get("feedback_comment"),
                "created_at": str(r.get("created_at", "")),
            }
            for r in fb_rows
        ]
    except Exception:
        recent_feedback = []

    # ── row counts (data health) ───────────────────────────────────────────────
    row_counts = {
        "companies": _safe_count("companies"),
        "recruiters": _safe_count("recruiters"),
        "scam_websites": _safe_count("scam_websites"),
        "fraud_reports": _safe_count("fraud_reports"),
        "scan_history": total_scans,
    }

    return {
        "totals": {
            "scans": total_scans,
            "scans_high_risk": scans_high_risk,
            "reports_pending": reports_pending,
            "reports_approved": reports_approved,
            "companies_tracked": companies_tracked,
            "companies_suspicious": companies_suspicious,
            "companies_predatory": companies_predatory,
            "scam_websites": scam_websites,
            "recruiters_flagged": recruiters_flagged,
        },
        "scans_by_type": scans_by_type,
        "lure_breakdown": lure_breakdown,
        "top_flagged_domains": top_flagged_domains,
        "trend": trend,
        "recent_feedback": recent_feedback,
        "row_counts": row_counts,
    }
