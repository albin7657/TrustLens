"""Request/response schemas for Module 5 — Communication Analyzer."""

from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas_common import SignalBreakdownItem

Channel = Literal["email", "sms", "whatsapp", "telegram", "other"]
ScamStage = Literal["contact", "trust_building", "urgency", "payment_request", "credential_theft"]
LureType = Literal[
    "registration_fee",
    "equipment_fee",
    "training_deposit",
    "crypto",
    "gift_card",
    "phishing_link",
    "credential_theft",
    "none",
]


class CommunicationMessage(BaseModel):
    sender: Literal["them", "me"]
    text: str


class CommunicationAnalyzeRequest(BaseModel):
    channel: Channel
    messages: list[CommunicationMessage]


class ExtractedLink(BaseModel):
    url: Optional[str] = None
    domain: str
    internal_db_hit: Optional[str] = None


class CommunicationAnalyzeResponse(BaseModel):
    risk_score: float
    risk_category: str
    scam_stage: ScamStage
    lure_type: LureType
    explanation: str
    signal_breakdown: list[SignalBreakdownItem]
    extracted_links: list[ExtractedLink]
    ai_available: bool
    scan_id: Optional[str] = None
