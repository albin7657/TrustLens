"""
TrustLens Backend — FastAPI Application Entry Point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth import router as auth_router
from app.jobs import router as jobs_router
from app.companies import router as companies_router
from app.recruiters import router as recruiters_router
from app.repository import router as repository_router

app = FastAPI(
    title="TrustLens API",
    description="AI-Powered scam, fraud, and fake job detection platform",
    version="0.1.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow localhost on ports 3000-3010 so Next.js auto-port-switching never breaks CORS
_localhost_origins = [f"http://localhost:{port}" for port in range(3000, 3011)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL] + _localhost_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(companies_router)
app.include_router(recruiters_router)
app.include_router(repository_router)


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "TrustLens API",
        "version": "0.1.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY),
        "google_oauth_configured": bool(settings.GOOGLE_CLIENT_ID),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
    }
