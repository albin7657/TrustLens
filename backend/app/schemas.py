"""
Pydantic request / response schemas for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


# ── Request Schemas ──────────────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    """Email + password sign-up request."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    requested_role: Optional[str] = None



class LoginRequest(BaseModel):
    """Email + password login request."""
    email: EmailStr
    password: str


# ── Response Schemas ─────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    """Successful authentication response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class GoogleOAuthURLResponse(BaseModel):
    """Response containing the Google OAuth redirect URL."""
    url: str


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    detail: Optional[str] = None


class UserResponse(BaseModel):
    """Current authenticated user info."""
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: Optional[str] = None
    created_at: Optional[str] = None
    role: str = "user"


# ── Admin Schemas ─────────────────────────────────────────────────────────────

class UserAdminItem(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "user"
    status: str = "active"
    created_at: Optional[str] = None
    scan_count: int = 0
    report_count: int = 0


class UserRoleUpdate(BaseModel):
    role: str


class UserStatusUpdate(BaseModel):
    status: str


class ModelConfigSchema(BaseModel):
    job_risk_threshold: float = 70.0
    email_risk_threshold: float = 65.0
    company_risk_threshold: float = 75.0
    active_llm_provider: str = "gemini-3.5-flash"
    weight_keywords: float = 0.35
    weight_embeddings: float = 0.35
    weight_llm: float = 0.30
    system_prompt_override: Optional[str] = None
    rag_enabled: bool = True
    auto_flag_scams: bool = True


class ModelTestRequest(BaseModel):
    text: str
    scan_type: str = "job"


class ModelTestResponse(BaseModel):
    risk_score: float
    risk_category: str
    explanation: str
    breakdown: dict
    active_provider: str

