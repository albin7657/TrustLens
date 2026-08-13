"""Request/response schemas for the RAG chat assistant."""

from pydantic import BaseModel, Field


class RagChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class RagSourceItem(BaseModel):
    label: str
    type: str
    similarity: float | None = None


class RagChatResponse(BaseModel):
    answer: str
    confidence: int
    sources: list[str]
    source_details: list[RagSourceItem] = []
