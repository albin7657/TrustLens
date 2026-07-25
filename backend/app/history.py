"""
Read/feedback side of the `scan_history` flywheel (Milestone P2-3).

Every analysis endpoint across the other modules writes here via
`app.services.scan_log.log_scan`; this router just lists that data back
and records user feedback on it.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.schemas_history import HistoryFeedbackRequest, HistoryItem, HistoryListResponse
from app.services.scan_log import resolve_user_id
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/history", tags=["Scan History"])


def _to_history_item(row: dict) -> HistoryItem:
    return HistoryItem(
        id=row["id"],
        scan_type=row["scan_type"],
        input_summary=row["input_summary"],
        input_ref=row.get("input_ref"),
        risk_score=row.get("risk_score"),
        risk_category=row.get("risk_category"),
        signal_breakdown=row.get("signal_breakdown"),
        result_payload=row.get("result_payload"),
        feedback_accurate=row.get("feedback_accurate"),
        feedback_comment=row.get("feedback_comment"),
        created_at=str(row["created_at"]),
    )


@router.get("", response_model=HistoryListResponse, summary="List past scans, newest first")
async def list_history(
    scan_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    resolved_user_id = user_id or resolve_user_id(authorization)
    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view scan history.",
        )
    admin = get_supabase_admin_client()

    # Fetch scans belonging to this user
    user_query = admin.table("scan_history").select("*", count="exact")
    if scan_type:
        user_query = user_query.eq("scan_type", scan_type)
    user_result = (
        user_query.eq("user_id", resolved_user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    # Also fetch scans stored with no user_id (logged while token resolution failed / VPN issue)
    null_query = admin.table("scan_history").select("*", count="exact")
    if scan_type:
        null_query = null_query.eq("scan_type", scan_type)
    null_result = (
        null_query.is_("user_id", "null")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    # Merge, deduplicate, re-sort by created_at descending, apply limit
    seen_ids: set[str] = set()
    merged = []
    for row in (user_result.data or []) + (null_result.data or []):
        if row["id"] not in seen_ids:
            seen_ids.add(row["id"])
            merged.append(row)
    merged.sort(key=lambda r: r["created_at"], reverse=True)
    merged = merged[:limit]

    total = (user_result.count or 0) + (null_result.count or 0)

    return HistoryListResponse(
        results=[_to_history_item(r) for r in merged],
        total=total,
    )


@router.post(
    "/{scan_id}/feedback",
    response_model=HistoryItem,
    summary="Record accuracy feedback for a past scan",
)
async def submit_feedback(scan_id: str, payload: HistoryFeedbackRequest):
    admin = get_supabase_admin_client()
    existing = admin.table("scan_history").select("*").eq("id", scan_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    update = {"feedback_accurate": payload.accurate, "feedback_comment": payload.comment}
    admin.table("scan_history").update(update).eq("id", scan_id).execute()

    row = existing.data[0]
    row.update(update)
    return _to_history_item(row)
