"""Request/response schemas for Module 2 — Recruiter Verification."""

from typing import Optional

from pydantic import BaseModel, EmailStr

from app.schemas_common import SignalBreakdownItem


class RecruiterVerifyRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    claimed_company_domain: Optional[str] = None


class RecruiterVerifyResponse(BaseModel):
    email: str
    trust_rating: float
    status: str
    signal_breakdown: list[SignalBreakdownItem]
    scan_id: Optional[str] = None
