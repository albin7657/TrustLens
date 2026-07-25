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
