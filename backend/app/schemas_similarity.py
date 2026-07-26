"""Request/response schemas for Module 7 — Real scam similarity (pgvector)."""

from typing import Optional

from pydantic import BaseModel


class SimilarityCheckRequest(BaseModel):
    text: str


class SimilarityMatch(BaseModel):
    source_table: str
    id: str
    similarity: float
    category: Optional[str] = None
    excerpt: str


class SimilarityCheckResponse(BaseModel):
    matches: list[SimilarityMatch]
    analysis: str
    scan_id: Optional[str] = None
