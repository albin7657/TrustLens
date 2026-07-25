"""Request/response schemas for Modules 3 & 4 — Company & Website Trust Assessment."""

from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas_common import SignalBreakdownItem


class CompanyVerifyRequest(BaseModel):
    domain: str
    name: Optional[str] = None
    # The two frontend pages (company-verification, website-scanner) share this
    # one endpoint; this only distinguishes which scan_history bucket a call
    # lands in, not the verification logic itself.
    scan_type: Literal["company", "website"] = "company"


class CompanyVerifyResponse(BaseModel):
    domain: str
    trust_score: float
    status: str
    signal_breakdown: list[SignalBreakdownItem]
    scan_id: Optional[str] = None
