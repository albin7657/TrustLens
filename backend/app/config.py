"""
Application configuration loaded from environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve backend root so relative model paths work from any working directory
_BACKEND_ROOT = Path(__file__).parent.parent.resolve()


def _resolve_model_path(env_value: str, default_relative: str) -> str:
    """Return an absolute path. If env_value is relative, resolve it from the backend root."""
    if env_value:
        p = Path(env_value)
        return str(p if p.is_absolute() else _BACKEND_ROOT / p)
    return str(_BACKEND_ROOT / default_relative)

# Load .env file from the backend root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


class Settings:
    """Application settings pulled from environment variables."""

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # Gemini (AI analysis — job fraud detection, communication analysis, etc.)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Tavily (web search — company reputation: reviews + public registration
    # records, since neither Trustpilot nor India's MCA offer a usable free API)
    TAVILY_API_KEY: str = os.getenv("TAVILY_API", "")

    # App
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "change-me")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")

    # Models — resolved to absolute paths so deployment works from any CWD
    FAKE_JOB_MODEL_PATH: str = _resolve_model_path(
        os.getenv("FAKE_JOB_MODEL_PATH", ""),
        "models/fake_job_model/fake_job_model"
    )
    EMAIL_MODEL_PATH: str = _resolve_model_path(
        os.getenv("EMAIL_MODEL_PATH", ""),
        "models/email_model/email_model"
    )



settings = Settings()
