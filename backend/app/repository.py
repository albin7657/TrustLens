"""
Module 6 — Trust Intelligence Repository.

Search/lookup across everything we've verified or been told about:
companies, recruiters, the curated scam website list, and community/admin
fraud reports.
"""

from fastapi import APIRouter, Query

from app.schemas_repository import RepositorySearchResponse, RepositorySearchResult
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/repository", tags=["Trust Repository"])


@router.get(
    "/search",
    response_model=RepositorySearchResponse,
    summary="Search the trust intelligence repository",
)
async def search_repository(q: str = Query(..., min_length=1)):
    client = get_supabase_admin_client()
    like = f"%{q}%"
    results: list[RepositorySearchResult] = []

    companies = (
        client.table("companies")
        .select("id, name, domain, status")
        .or_(f"name.ilike.{like},domain.ilike.{like}")
        .limit(20)
        .execute()
    )
    for row in companies.data or []:
        results.append(
            RepositorySearchResult(
                type="company",
                id=row["id"],
                label=row.get("name") or row.get("domain") or "",
                status=row.get("status"),
                detail=row.get("domain"),
            )
        )

    recruiters = (
        client.table("recruiters")
        .select("id, name, email, status")
        .or_(f"name.ilike.{like},email.ilike.{like}")
        .limit(20)
        .execute()
    )
    for row in recruiters.data or []:
        results.append(
            RepositorySearchResult(
                type="recruiter",
                id=row["id"],
                label=row.get("name") or row.get("email") or "",
                status=row.get("status"),
                detail=row.get("email"),
            )
        )

    scam_sites = (
        client.table("scam_websites").select("id, domain, reason").ilike("domain", like).limit(20).execute()
    )
    for row in scam_sites.data or []:
        results.append(
            RepositorySearchResult(
                type="scam_website",
                id=row["id"],
                label=row.get("domain") or "",
                status="suspicious",
                detail=row.get("reason"),
            )
        )

    reports = (
        client.table("fraud_reports")
        .select("id, report_type, target_reference, status")
        .ilike("target_reference", like)
        .limit(20)
        .execute()
    )
    for row in reports.data or []:
        results.append(
            RepositorySearchResult(
                type="fraud_report",
                id=row["id"],
                label=row.get("target_reference") or "",
                status=row.get("status"),
                detail=row.get("report_type"),
            )
        )

    return RepositorySearchResponse(query=q, results=results)
