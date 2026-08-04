"""Request/response schemas for Module 1 — Job Fraud Detection."""

from typing import Optional

from pydantic import BaseModel

from app.schemas_common import SignalBreakdownItem


class JobAnalyzeRequest(BaseModel):
    description: str
    company_name: Optional[str] = None


class LocalModelResult(BaseModel):
    """Raw output of the local, frozen DistilBERT classifier — shown
    alongside the Gemini-driven composite so it's visible that both models
    ran, not just the cloud one. Its score is also folded into
    signal_breakdown as `local_model:distilbert`, so this is a convenience
    duplicate for a dedicated UI panel, not a second source of truth."""

    label: str
    confidence: float
    risk_level: str


class JobAnalyzeResponse(BaseModel):
    risk_score: float
    risk_category: str
    explanation: str
    signal_breakdown: list[SignalBreakdownItem]
    ai_available: bool
    # Milestone P2-6a: a pay-for-certificate / internship-mill posting gets a
    # distinct verdict_label alongside the normal risk_category, so the UI
    # can show that specific warning instead of the generic scam banner.
    verdict_label: Optional[str] = None
    posting_type: Optional[str] = None
    local_model: Optional[LocalModelResult] = None
    scan_id: Optional[str] = None


class JobAnalyzeUrlRequest(BaseModel):
    url: str


class JobUrlFetchFailedResponse(BaseModel):
    fetch_failed: bool = True
    reason: str  # "site_blocks_bots" | "page_unreadable"
    domain_analysis: dict
