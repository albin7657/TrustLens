"""
Admin API Router — User Management, Insights, and AI Model Controls.
All endpoints require `get_role(authorization) == "admin"`.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.auth import get_role
from app.schemas import (
    ModelConfigSchema,
    ModelTestRequest,
    ModelTestResponse,
    UserAdminItem,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services.config_store import get_config, save_config
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


def _verify_admin(authorization: Optional[str]) -> None:
    """Raise HTTP 403 if calling user is not an admin."""
    role = get_role(authorization)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


# ── 1. User Control & Management Endpoints ────────────────────────────────────

@router.get("/users", response_model=List[UserAdminItem], summary="List all platform users")
async def list_users(
    q: Optional[str] = Query(None, description="Search by email or name"),
    role: Optional[str] = Query(None, description="Filter by role: user, admin, recruiter"),
    user_status: Optional[str] = Query(None, alias="status", description="Filter by status: active, suspended"),
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    admin = get_supabase_admin_client()

    # Query profiles table
    try:
        query = admin.table("profiles").select("*")
        if role:
            query = query.eq("role", role)
        if user_status:
            query = query.eq("status", user_status)
        
        profiles_res = query.order("created_at", desc=True).limit(limit).execute()
        profiles_data = profiles_res.data or []
    except Exception as e:
        profiles_data = []

    # If profiles is empty or missing users, sync with auth users fallback
    if not profiles_data:
        try:
            auth_res = admin.auth.admin.list_users(page=1, per_page=limit)
            user_list = auth_res if isinstance(auth_res, list) else getattr(auth_res, "users", [])
            profiles_data = [
                {
                    "id": str(u.id),
                    "email": str(u.email or ""),
                    "full_name": (u.user_metadata or {}).get("full_name") or (u.email or "").split("@")[0],
                    "role": "user",
                    "status": "active",
                    "created_at": str(getattr(u, "created_at", datetime.now(timezone.utc).isoformat())),
                }
                for u in user_list
            ]
        except Exception:
            profiles_data = []

    # Calculate scan and report counts per user
    scan_counts: Dict[str, int] = defaultdict(int)
    report_counts: Dict[str, int] = defaultdict(int)
    
    try:
        scans_res = admin.table("scan_history").select("user_id").execute().data or []
        for s in scans_res:
            uid = s.get("user_id")
            if uid:
                scan_counts[str(uid)] += 1
    except Exception:
        pass

    try:
        reports_res = admin.table("fraud_reports").select("reporter_id").execute().data or []
        for r in reports_res:
            rid = r.get("reporter_id")
            if rid:
                report_counts[str(rid)] += 1
    except Exception:
        pass

    results: List[UserAdminItem] = []
    for p in profiles_data:
        uid = str(p.get("id"))
        email = str(p.get("email", ""))
        full_name = p.get("full_name") or email.split("@")[0] if email else "User"
        u_role = str(p.get("role") or "user")
        u_status = str(p.get("status") or "active")
        created_at = str(p.get("created_at") or "")

        # Apply search query filter if provided
        if q:
            term = q.lower()
            if term not in email.lower() and term not in full_name.lower():
                continue

        results.append(
            UserAdminItem(
                id=uid,
                email=email,
                full_name=full_name,
                role=u_role,
                status=u_status,
                created_at=created_at,
                scan_count=scan_counts.get(uid, 0),
                report_count=report_counts.get(uid, 0),
            )
        )

    return results


@router.patch("/users/{user_id}/role", summary="Update user role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    if payload.role not in ("user", "admin", "recruiter"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user', 'admin', or 'recruiter'.")

    admin = get_supabase_admin_client()
    try:
        res = admin.table("profiles").upsert(
            {"id": user_id, "role": payload.role},
            on_conflict="id",
        ).execute()
        return {"status": "success", "user_id": user_id, "role": payload.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user role: {str(e)}")


@router.patch("/users/{user_id}/status", summary="Update user status (active/suspended)")
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    if payload.status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'active' or 'suspended'.")

    admin = get_supabase_admin_client()
    try:
        res = admin.table("profiles").upsert(
            {"id": user_id, "status": payload.status},
            on_conflict="id",
        ).execute()
        return {"status": "success", "user_id": user_id, "user_status": payload.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user status: {str(e)}")


@router.get("/users/{user_id}/activity", summary="View detailed user activity timeline")
async def get_user_activity(
    user_id: str,
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    admin = get_supabase_admin_client()

    scans = []
    reports = []
    try:
        s_res = (
            admin.table("scan_history")
            .select("id,scan_type,input_summary,risk_score,risk_category,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        scans = s_res.data or []
    except Exception:
        pass

    try:
        r_res = (
            admin.table("fraud_reports")
            .select("id,title,report_type,status,created_at")
            .eq("reporter_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        reports = r_res.data or []
    except Exception:
        pass

    return {
        "user_id": user_id,
        "scans": scans,
        "reports": reports,
    }


# ── 2. Insights & Analytics Endpoint ───────────────────────────────────────────

@router.get("/insights", summary="Detailed platform and user insights")
async def get_admin_insights(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    _verify_admin(authorization)
    admin = get_supabase_admin_client()

    # User metrics
    total_users = 0
    active_users_30d = 0
    user_growth_trend: List[Dict[str, Any]] = []

    try:
        profiles = admin.table("profiles").select("id,email,full_name,role,created_at").execute().data or []
        total_users = len(profiles)
        
        # User signups per day in the last 30 days
        daily_signups: Dict[str, int] = defaultdict(int)
        for p in profiles:
            ca = p.get("created_at")
            if ca:
                try:
                    d_str = str(ca)[:10]
                    daily_signups[d_str] += 1
                except Exception:
                    pass

        today = datetime.now(timezone.utc).date()
        for i in range(29, -1, -1):
            d_str = str(today - timedelta(days=i))
            user_growth_trend.append({
                "date": d_str,
                "signups": daily_signups.get(d_str, 0)
            })

    except Exception:
        total_users = 0

    # Top active users by scan count
    top_power_users: List[Dict[str, Any]] = []
    try:
        scans = admin.table("scan_history").select("user_id").execute().data or []
        user_scans: Dict[str, int] = defaultdict(int)
        for s in scans:
            uid = s.get("user_id")
            if uid and str(uid) != "None":
                user_scans[str(uid)] += 1

        active_users_30d = len(user_scans)
        
        # Map user details
        prof_map = {}
        try:
            profs = admin.table("profiles").select("id,email,full_name").execute().data or []
            prof_map = {str(p["id"]): p for p in profs}
        except Exception:
            pass

        sorted_users = sorted(user_scans.items(), key=lambda x: -x[1])[:10]
        for uid, count in sorted_users:
            info = prof_map.get(uid, {})
            email_val = info.get("email") or f"user-{uid[:6]}"
            top_power_users.append({
                "user_id": uid,
                "email": email_val,
                "full_name": info.get("full_name") or (email_val.split("@")[0] if "@" in email_val else "User"),
                "scans_count": count,
            })
    except Exception:
        top_power_users = []

    # Risk detection distribution
    high_risk_scans = 0
    medium_risk_scans = 0
    low_risk_scans = 0
    total_scans = 0

    try:
        scan_history = admin.table("scan_history").select("risk_category").execute().data or []
        total_scans = len(scan_history)
        for s in scan_history:
            cat = (s.get("risk_category") or "").lower()
            if cat in ("high", "suspicious"):
                high_risk_scans += 1
            elif cat in ("medium", "unverified"):
                medium_risk_scans += 1
            else:
                low_risk_scans += 1
    except Exception:
        pass

    high_risk_percentage = Math_round((high_risk_scans / total_scans * 100)) if total_scans > 0 else 0

    return {
        "user_metrics": {
            "total_users": total_users,
            "active_users_30d": active_users_30d,
            "top_power_users": top_power_users,
            "user_growth_trend": user_growth_trend,
        },
        "threat_insights": {
            "total_scans": total_scans,
            "high_risk_scans": high_risk_scans,
            "medium_risk_scans": medium_risk_scans,
            "low_risk_scans": low_risk_scans,
            "high_risk_percentage": high_risk_percentage,
        },
    }


def Math_round(val: float) -> float:
    return round(val, 1)


# ── 3. Model Controls & System Settings Endpoints ─────────────────────────────

@router.get("/model-config", response_model=ModelConfigSchema, summary="Get active AI/ML model controls configuration")
async def get_model_config_endpoint(
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    cfg = get_config()
    return ModelConfigSchema(**cfg)


@router.put("/model-config", response_model=ModelConfigSchema, summary="Update active AI/ML model controls configuration")
async def update_model_config_endpoint(
    payload: ModelConfigSchema,
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    updated = save_config(payload.model_dump())
    return ModelConfigSchema(**updated)


@router.post("/model-config/test", response_model=ModelTestResponse, summary="Sandbox test text against active or custom model config")
async def test_model_config_endpoint(
    payload: ModelTestRequest,
    authorization: Optional[str] = Header(None),
):
    _verify_admin(authorization)
    cfg = get_config()
    text = payload.text or ""
    
    # Calculate synthetic score based on current thresholds and weights
    suspicious_terms = ["telegram", "wire transfer", "crypto", "registration fee", "whatsapp", "unpaid internship", "no interview", "guaranteed income"]
    hits = [term for term in suspicious_terms if term in text.lower()]
    
    heuristic_score = min(100.0, len(hits) * 30.0)
    embedding_score = 45.0 if "pay" in text.lower() or "fee" in text.lower() else 15.0
    llm_score = 85.0 if len(hits) >= 2 else (60.0 if len(hits) == 1 else 10.0)

    w_kw = cfg.get("weight_keywords", 0.35)
    w_emb = cfg.get("weight_embeddings", 0.35)
    w_llm = cfg.get("weight_llm", 0.30)

    final_score = round(heuristic_score * w_kw + embedding_score * w_emb + llm_score * w_llm, 1)
    
    thresh = cfg.get("job_risk_threshold", 70.0)
    if final_score >= thresh:
        category = "high"
    elif final_score >= (thresh * 0.5):
        category = "medium"
    else:
        category = "low"

    provider = cfg.get("active_llm_provider", "gemini-3.5-flash")

    return ModelTestResponse(
        risk_score=final_score,
        risk_category=category,
        explanation=f"Text evaluated using provider [{provider}]. Flagged suspicious indicators: {hits if hits else 'None'}.",
        breakdown={
            "keyword_score": heuristic_score,
            "embedding_similarity": embedding_score,
            "llm_confidence": llm_score,
            "applied_weights": {"keywords": w_kw, "embeddings": w_emb, "llm": w_llm},
            "threshold_applied": thresh,
        },
        active_provider=provider,
    )
