"""
Module 6 — Trust Intelligence Repository.

Search/lookup across everything we've verified or been told about:
companies, recruiters, the curated scam website list, and community/admin
fraud reports. With no query, browse everything newest-first instead of
requiring a search term first.
"""

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas_repository import RepositorySearchResponse, RepositorySearchResult
from app.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/repository", tags=["Trust Repository"])

_BROWSE_LIMIT = 50


def search_repository_records(q: Optional[str] = None, limit: int = _BROWSE_LIMIT) -> list[RepositorySearchResult]:
    """Shared lookup used by the HTTP route and the RAG assistant."""
    client = get_supabase_admin_client()
    like = f"%{q}%" if q else None
    results: list[RepositorySearchResult] = []

    companies_query = client.table("companies").select("id, name, domain, status")
    companies_query = (
        companies_query.or_(f"name.ilike.{like},domain.ilike.{like}") if like else companies_query
    )
    companies = companies_query.order("created_at", desc=True).limit(limit).execute()
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

    recruiters_query = client.table("recruiters").select("id, name, email, status")
    recruiters_query = (
        recruiters_query.or_(f"name.ilike.{like},email.ilike.{like}") if like else recruiters_query
    )
    recruiters = recruiters_query.order("created_at", desc=True).limit(limit).execute()
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

    scam_sites_query = client.table("scam_websites").select("id, domain, reason")
    scam_sites_query = scam_sites_query.ilike("domain", like) if like else scam_sites_query
    scam_sites = scam_sites_query.order("reported_at", desc=True).limit(limit).execute()
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

    reports_query = client.table("fraud_reports").select("id, report_type, target_reference, status")
    reports_query = reports_query.ilike("target_reference", like) if like else reports_query
    reports = reports_query.order("created_at", desc=True).limit(limit).execute()
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

    return results


@router.get(
    "/search",
    response_model=RepositorySearchResponse,
    summary="Search the trust intelligence repository, or browse it with no query",
)
async def search_repository(q: Optional[str] = Query(None, min_length=1)):
    results = search_repository_records(q)
    return RepositorySearchResponse(query=q or "", results=results)
