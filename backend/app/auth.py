"""
Authentication routes — email/password and Google OAuth.

All Supabase auth is handled server-side; the frontend never talks
directly to Supabase for auth.
"""

from fastapi import APIRouter, HTTPException, Header, Query, status
from fastapi.responses import RedirectResponse
from typing import Optional
from gotrue.errors import AuthApiError

from app.supabase_client import get_supabase_client
from app.config import settings
from app.schemas import (
    SignUpRequest,
    LoginRequest,
    AuthResponse,
    GoogleOAuthURLResponse,
    MessageResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper ───────────────────────────────────────────────────────────────────

def _build_auth_response(session) -> AuthResponse:
    """Convert a Supabase session into our standard AuthResponse."""
    user = session.user
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": (user.user_metadata or {}).get("full_name"),
            "avatar_url": (user.user_metadata or {}).get("avatar_url"),
            "provider": user.app_metadata.get("provider", "email") if user.app_metadata else "email",
            "created_at": str(user.created_at) if user.created_at else None,
        },
    )


# ── Email / Password ────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up with email and password",
)
async def signup(payload: SignUpRequest):
    """
    Create a new user account using email + password.

    Optionally accepts `full_name` which is stored in user_metadata.
    Supabase will send a confirmation email if email confirmations are
    enabled in the dashboard.
    """
    try:
        metadata = {}
        if payload.full_name:
            metadata["full_name"] = payload.full_name

        response = get_supabase_client().auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": metadata,
                    "email_redirect_to": f"{settings.FRONTEND_URL}/auth/callback",
                },
            }
        )

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign-up failed. The email may already be registered.",
            )

        # If email confirmation is required, session may be None
        if response.session is None:
            return AuthResponse(
                access_token="",
                refresh_token="",
                token_type="bearer",
                expires_in=0,
                user={
                    "id": response.user.id,
                    "email": response.user.email,
                    "full_name": (response.user.user_metadata or {}).get("full_name"),
                    "avatar_url": None,
                    "provider": "email",
                    "created_at": str(response.user.created_at) if response.user.created_at else None,
                },
            )

        return _build_auth_response(response.session)

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in with email and password",
)
async def login(payload: LoginRequest):
    """Authenticate an existing user with email + password."""
    try:
        response = get_supabase_client().auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )

        if response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or email not confirmed.",
            )

        return _build_auth_response(response.session)

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


# ── Google OAuth ─────────────────────────────────────────────────────────────

@router.get(
    "/google",
    response_model=GoogleOAuthURLResponse,
    summary="Get Google OAuth sign-in URL",
)
async def google_oauth():
    """
    Returns the Supabase-generated Google OAuth URL.

    The frontend should redirect the user to this URL. After Google
    authentication, the user is redirected back to
    `{BACKEND_URL}/auth/google/callback`.
    """
    try:
        response = get_supabase_client().auth.sign_in_with_oauth(
            {
                "provider": "google",
                "options": {
                    # Redirect directly to the frontend callback — Supabase sends
                    # tokens as URL hash fragments which the backend cannot read.
                    "redirect_to": f"{settings.FRONTEND_URL}/auth/callback",
                },
            }
        )
        return GoogleOAuthURLResponse(url=response.url)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google OAuth: {str(e)}",
        )


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
)
async def google_callback(code: Optional[str] = Query(None)):
    """
    Handles the redirect from Google OAuth.

    Supabase handles the token exchange. This endpoint redirects the
    user back to the frontend with the auth code so the frontend can
    exchange it for a session.
    """
    if code:
        # Redirect to frontend with the code for token exchange
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?code={code}"
    else:
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?error=no_code"

    return RedirectResponse(url=redirect_url)


@router.post(
    "/exchange-code",
    response_model=AuthResponse,
    summary="Exchange OAuth code for session",
)
async def exchange_code(code: str = Query(...)):
    """
    Exchange an OAuth authorization code for a Supabase session.

    The frontend calls this after receiving the code from the
    Google OAuth callback redirect.
    """
    try:
        response = get_supabase_client().auth.exchange_code_for_session({"auth_code": code})

        if response.session is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for session.",
            )

        return _build_auth_response(response.session)

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


# ── Session Management ───────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Refresh an access token",
)
async def refresh_token(refresh_token: str):
    """Use a refresh token to obtain a new access token."""
    try:
        response = get_supabase_client().auth.refresh_session(refresh_token)

        if response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        return _build_auth_response(response.session)

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out the current user",
)
async def logout(authorization: str = Header(...)):
    """
    Sign out the user. Expects `Authorization: Bearer <access_token>`.
    """
    try:
        token = authorization.replace("Bearer ", "")
        get_supabase_client().auth.sign_out(token)
        return MessageResponse(message="Successfully logged out.")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}",
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
async def get_current_user(authorization: str = Header(...)):
    """
    Returns the profile of the currently authenticated user.
    Expects `Authorization: Bearer <access_token>`.
    """
    try:
        token = authorization.replace("Bearer ", "")
        response = get_supabase_client().auth.get_user(token)

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )

        user = response.user
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=(user.user_metadata or {}).get("full_name"),
            avatar_url=(user.user_metadata or {}).get("avatar_url"),
            provider=user.app_metadata.get("provider", "email") if user.app_metadata else "email",
            created_at=str(user.created_at) if user.created_at else None,
        )

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )
