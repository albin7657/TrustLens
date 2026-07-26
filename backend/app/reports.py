"""
Module 8 — Community Reporting write path.

This is the flywheel's intake valve: a submitted report starts `pending` and
does nothing else on its own. An admin approval is what turns a report into
ground truth — `apply_report_side_effects` upserts the flagged entity into
`scam_websites` / `companies` / `recruiters`, which `internal_db.py` already
reads on every later scan. No extra wiring is needed elsewhere for the
override signal to show up.
"""

import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile, status

from app.auth import get_role
from app.schemas_reports import (
    REPORT_TYPES,
    EvidenceUploadResponse,
    ReportItem,
    ReportListResponse,
    ReportReviewRequest,
    ReportReviewResponse,
    ReportSubmitRequest,
    ReportSubmitResponse,
)
from app.services.embeddings import embed_text
from app.services.scan_log import resolve_user_id as _resolve_user_id
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/reports", tags=["Community Reporting"])

_SCHEME_RE = re.compile(r"^https?://", re.IGNORECASE)
_EMAIL_RE = re.compile(r"^[\w.+-]+@([\w-]+\.[\w.-]+)$")
_SAFE_FILENAME_RE = re.compile(r"[^\w.\-]")

_MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
_ALLOWED_EVIDENCE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"}
_EVIDENCE_BUCKET = "evidence"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _normalize_domain(raw: str) -> str:
    domain = _SCHEME_RE.sub("", raw.strip().lower())
    return domain.split("/")[0]


def _classify_target(report_type: str, target_reference: str) -> tuple[str, str]:
    """Map a report's free-text target to an entity_links node (best effort)."""
    ref = target_reference.strip()
    if _EMAIL_RE.match(ref):
        return ("recruiter", ref.lower())
    domain = _normalize_domain(ref)
    if "." in domain and " " not in domain:
        if report_type in ("company", "predatory_internship"):
            return ("company", domain)
        return ("domain", domain)
    if report_type == "recruiter":
        return ("recruiter", ref)
    if report_type == "job_posting":
        return ("job_posting", ref)
    return ("domain", ref)


def _link_report(report_id: str, target_reference: str, report_type: str) -> None:
    """Best-effort upsert into entity_links; never raises."""
    if not target_reference:
        return
    try:
        target_type, target_id = _classify_target(report_type, target_reference)
        get_supabase_admin_client().table("entity_links").upsert(
            {
                "source_type": "report",
                "source_id": report_id,
                "target_type": target_type,
                "target_id": target_id,
                "relationship": "reported_against",
                "created_from": "reports",
            },
            on_conflict="source_type,source_id,target_type,target_id,relationship",
        ).execute()
    except Exception:
        pass


def _embed_description(report_id: str, description: str) -> None:
    """Best-effort embedding write powering Module 7's pgvector similarity
    search (Milestone P2-4). Never raises — a failed embedding just means
    this report won't surface as a similarity match."""
    try:
        vector = embed_text(description)
        if vector:
            get_supabase_admin_client().table("fraud_reports").update(
                {"embedding": vector}
            ).eq("id", report_id).execute()
    except Exception:
        pass


def _to_report_item(row: dict) -> ReportItem:
    return ReportItem(
        id=row["id"],
        report_type=row["report_type"],
        title=row.get("title"),
        target_reference=row["target_reference"],
        description=row["description"],
        status=row["status"],
        evidence_paths=list(row.get("evidence_paths") or []),
        reporter_id=row.get("reporter_id"),
        resolution_note=row.get("resolution_note"),
        created_at=str(row["created_at"]),
        reviewed_at=str(row["reviewed_at"]) if row.get("reviewed_at") else None,
    )


def apply_report_side_effects(report: dict) -> None:
    """Runs on approval. Each upsert is independent/best-effort so one
    failure doesn't block the others from landing."""
    report_type = report["report_type"]
    target = (report.get("target_reference") or "").strip()
    title = report.get("title") or "Community-reported"
    admin = get_supabase_admin_client()

    if report_type in ("website", "phishing_message"):
        domain = _normalize_domain(target)
        if domain and "." in domain:
            try:
                admin.table("scam_websites").upsert(
                    {"domain": domain, "reason": title}, on_conflict="domain"
                ).execute()
            except Exception:
                pass

    elif report_type == "company":
        domain = _normalize_domain(target)
        if domain:
            try:
                admin.table("companies").upsert(
                    {"domain": domain, "name": target, "status": "suspicious"},
                    on_conflict="domain",
                ).execute()
            except Exception:
                pass

    elif report_type == "predatory_internship":
        domain = _normalize_domain(target)
        if domain:
            try:
                admin.table("companies").upsert(
                    {
                        "domain": domain,
                        "name": target,
                        "status": "predatory",
                        "predatory_notes": title,
                    },
                    on_conflict="domain",
                ).execute()
            except Exception:
                pass

    elif report_type == "recruiter":
        email = target.lower()
        if email:
            try:
                admin.table("recruiters").upsert(
                    {"email": email, "status": "suspicious"}, on_conflict="email"
                ).execute()
            except Exception:
                pass

    # job_posting: nothing extra to upsert — already embedded for similarity search.

    _link_report(report["id"], target, report_type)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a fraud/scam report",
)
async def submit_report(payload: ReportSubmitRequest, authorization: Optional[str] = Header(None)):
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"report_type must be one of {REPORT_TYPES}",
        )
    if not payload.title.strip() or not payload.target_reference.strip() or not payload.description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="title, target_reference, and description are required.",
        )

    reporter_id = payload.reporter_id or _resolve_user_id(authorization)

    row = {
        "report_type": payload.report_type,
        "title": payload.title.strip(),
        "target_reference": payload.target_reference.strip(),
        "description": payload.description.strip(),
        "reporter_id": reporter_id,
        "status": "pending",
    }
    try:
        result = get_supabase_admin_client().table("fraud_reports").insert(row).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit report: {e}",
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report insert returned no data.",
        )

    report = result.data[0]
    _link_report(report["id"], payload.target_reference, payload.report_type)
    _embed_description(report["id"], payload.description)

    return ReportSubmitResponse(id=report["id"], status=report["status"], created_at=str(report["created_at"]))


@router.post(
    "/{report_id}/evidence",
    response_model=EvidenceUploadResponse,
    summary="Attach an evidence file to a report",
)
async def upload_evidence(report_id: str, file: UploadFile = File(...)):
    if file.content_type not in _ALLOWED_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, PNG, JPG, or WEBP evidence files are accepted.",
        )

    contents = await file.read()
    if len(contents) > _MAX_EVIDENCE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence file exceeds the 10 MB limit.",
        )

    admin = get_supabase_admin_client()
    existing = admin.table("fraud_reports").select("evidence_paths").eq("id", report_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    safe_name = _SAFE_FILENAME_RE.sub("_", file.filename or "evidence")
    path = f"{report_id}/{safe_name}"
    try:
        admin.storage.from_(_EVIDENCE_BUCKET).upload(
            path, contents, {"content-type": file.content_type, "upsert": "true"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence upload failed: {e}",
        )

    paths = list(existing.data[0].get("evidence_paths") or [])
    paths.append(path)
    admin.table("fraud_reports").update({"evidence_paths": paths}).eq("id", report_id).execute()

    return EvidenceUploadResponse(id=report_id, evidence_paths=paths)


@router.get(
    "",
    response_model=ReportListResponse,
    summary="List reports (admin review queue / public browse of approved ones)",
)
async def list_reports(
    status_: Optional[str] = Query(None, alias="status"),
    report_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = get_supabase_admin_client().table("fraud_reports").select("*", count="exact")
    if status_:
        query = query.eq("status", status_)
    if report_type:
        query = query.eq("report_type", report_type)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    return ReportListResponse(
        results=[_to_report_item(r) for r in (result.data or [])],
        total=result.count or 0,
    )


@router.get(
    "/mine",
    response_model=ReportListResponse,
    summary="Current user's submitted reports",
)
async def my_reports(
    reporter_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    resolved_id = reporter_id or _resolve_user_id(authorization)
    if not resolved_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reporter_id or a bearer token is required.",
        )

    result = (
        get_supabase_admin_client()
        .table("fraud_reports")
        .select("*", count="exact")
        .eq("reporter_id", resolved_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return ReportListResponse(
        results=[_to_report_item(r) for r in (result.data or [])],
        total=result.count or 0,
    )


@router.post(
    "/{report_id}/review",
    response_model=ReportReviewResponse,
    summary="Approve or reject a report (admin only)",
)
async def review_report(
    report_id: str,
    payload: ReportReviewRequest,
    authorization: Optional[str] = Header(None),
):
    if get_role(authorization) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")
    if payload.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be 'approve' or 'reject'.",
        )

    admin = get_supabase_admin_client()
    existing = admin.table("fraud_reports").select("*").eq("id", report_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    report = existing.data[0]
    new_status = "approved" if payload.action == "approve" else "rejected"
    update = {
        "status": new_status,
        "resolution_note": payload.resolution_note,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": _resolve_user_id(authorization),
    }
    admin.table("fraud_reports").update(update).eq("id", report_id).execute()

    if new_status == "approved":
        report.update(update)
        apply_report_side_effects(report)

    return ReportReviewResponse(id=report_id, status=new_status)
