"""Request/response schemas for Modules 3 & 4 — Company & Website Trust Assessment."""

from typing import Optional

from pydantic import BaseModel

from app.schemas_common import SignalBreakdownItem


class CompanyVerifyRequest(BaseModel):
    domain: str
    name: Optional[str] = None


class CompanyVerifyResponse(BaseModel):
    domain: str
    trust_score: float
    status: str
    signal_breakdown: list[SignalBreakdownItem]
