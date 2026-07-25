"""Request/response schemas for Module 8 — Community Reporting."""

from typing import Optional

from pydantic import BaseModel

REPORT_TYPES = (
    "recruiter",
    "company",
    "website",
    "job_posting",
    "phishing_message",
    "predatory_internship",
)


class ReportSubmitRequest(BaseModel):
    report_type: str
    title: str
    target_reference: str
    description: str
    reporter_id: Optional[str] = None


class ReportSubmitResponse(BaseModel):
    id: str
    status: str
    created_at: str


class ReportItem(BaseModel):
    id: str
    report_type: str
    title: Optional[str] = None
    target_reference: str
    description: str
    status: str
    evidence_paths: list[str] = []
    reporter_id: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: str
    reviewed_at: Optional[str] = None


class ReportListResponse(BaseModel):
    results: list[ReportItem]
    total: int


class ReportReviewRequest(BaseModel):
    action: str  # "approve" | "reject"
    resolution_note: Optional[str] = None


class ReportReviewResponse(BaseModel):
    id: str
    status: str


class EvidenceUploadResponse(BaseModel):
    id: str
    evidence_paths: list[str]
