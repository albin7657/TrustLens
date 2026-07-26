"""Request/response schemas for Module 6 — Trust Intelligence Repository."""

from typing import Optional

from pydantic import BaseModel


class RepositorySearchResult(BaseModel):
    type: str  # company | recruiter | fraud_report | scam_website
    id: str
    label: str
    status: Optional[str] = None
    detail: Optional[str] = None


class RepositorySearchResponse(BaseModel):
    query: str
    results: list[RepositorySearchResult]
