"""Request/response schemas for Module 1 — Job Fraud Detection."""

from typing import Optional

from pydantic import BaseModel

from app.schemas_common import SignalBreakdownItem


class JobAnalyzeRequest(BaseModel):
    description: str
    company_name: Optional[str] = None


class JobAnalyzeResponse(BaseModel):
    risk_score: float
    risk_category: str
    explanation: str
    signal_breakdown: list[SignalBreakdownItem]
    ai_available: bool
    scan_id: Optional[str] = None
