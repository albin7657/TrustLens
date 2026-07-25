"""Request/response schemas for scan history + feedback (Milestone P2-3)."""

from typing import Any, Optional

from pydantic import BaseModel


class HistoryItem(BaseModel):
    id: str
    scan_type: str
    input_summary: str
    input_ref: Optional[str] = None
    risk_score: Optional[float] = None
    risk_category: Optional[str] = None
    signal_breakdown: Optional[list[dict[str, Any]]] = None
    result_payload: Optional[dict[str, Any]] = None
    feedback_accurate: Optional[bool] = None
    feedback_comment: Optional[str] = None
    created_at: str


class HistoryListResponse(BaseModel):
    results: list[HistoryItem]
    total: int


class HistoryFeedbackRequest(BaseModel):
    accurate: bool
    comment: Optional[str] = None
