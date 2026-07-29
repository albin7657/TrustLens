"""
Authentication routes — email/password and Google OAuth.

All Supabase auth is handled server-side; the frontend never talks
directly to Supabase for auth.
"""

from fastapi import APIRouter, HTTPException, Header, Query, status
from fastapi.responses import RedirectResponse
from typing import Optional
from gotrue.errors import AuthApiError

from app.supabase_client import get_supabase_client, get_supabase_admin_client
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


# ── Helpers ──────────────────────────────────────────────────────────────────

def _upsert_profile(user, role: Optional[str] = None) -> None:
    """Best-effort `profiles` row so role-based access has something to read."""
    try:
        payload = {
            "id": user.id,
            "email": (user.email or "").lower(),  # normalize for reliable lookups
            "full_name": (user.user_metadata or {}).get("full_name"),
        }
        if role:
            payload["role"] = role
        get_supabase_admin_client().table("profiles").upsert(
            payload,
            on_conflict="id",
        ).execute()
    except Exception:
        pass  # profile sync is best-effort; never fail the auth flow over it



def _check_existing_email(email: str) -> None:
    """Raise a descriptive HTTPException when the email is already registered.

    Strategy (two layers, belt-and-suspenders):
      Layer 1 — profiles table lookup:
        Query profiles by email to get the user ID, then call
        admin.get_user_by_id() to read app_metadata.provider.
        This is fast and reliable for users who have previously
        called /auth/me (all Google OAuth users do this).

      Layer 2 — paginated admin.list_users() fallback:
        If no profile row is found (edge case: user somehow bypassed
        /auth/me), iterate all pages of auth users and match by email.

    Raises HTTP 409 with a structured error code so the frontend can
    render a contextual banner instead of a generic error.
    """
    try:
        admin_client = get_supabase_admin_client()

        # ── Layer 1: profiles table lookup (fast path) ──────────────────────
        row = (
            admin_client
            .table("profiles")
            .select("id")
            .ilike("email", email)  # case-insensitive match
            .limit(1)
            .execute()
        )

        if row.data:
            user_id = row.data[0]["id"]
            auth_user = admin_client.auth.admin.get_user_by_id(user_id)
            user = getattr(auth_user, "user", auth_user)
            app_meta = (user.app_metadata or {}) if user else {}
            _raise_for_provider(app_meta)

        # ── Layer 2: paginated admin list_users fallback (slow path) ────────
        # Handles the edge case where the profile row was never created.
        page = 1
        per_page = 200
        while True:
            result = admin_client.auth.admin.list_users(
                page=page, per_page=per_page
            )
            # gotrue-py returns either a list or an object with .users
            user_list = result if isinstance(result, list) else getattr(result, "users", [])
            if not user_list:
                break
            for u in user_list:
                if (u.email or "").lower() == email.lower():
                    _raise_for_provider(u.app_metadata or {})
            if len(user_list) < per_page:
                break  # last page reached
            page += 1

    except HTTPException:
        raise
    except Exception:
        # If both lookups fail, fall through — Supabase will return its own error.
        pass


def _raise_for_provider(app_meta: dict) -> None:
    """Raise the appropriate 409 based on app_metadata provider info."""
    provider = app_meta.get("provider", "email")
    providers = app_meta.get("providers", [])
    google_only = provider == "google" or (
        providers and all(p == "google" for p in providers)
    )
    if google_only:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "PROVIDER_MISMATCH:google|An account with this email already exists, "
                "but it was created using Google Sign-In. "
                'Please go to the Login page and use "Continue with Google" instead.'
            ),
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "ACCOUNT_EXISTS:email|An account with this email already exists. "
                "Please go to the Login page and sign in with your email and password."
            ),
        )


def get_role(authorization: Optional[str]) -> str:
    """Resolve the caller's role from `profiles`. Returns 'user' on any
    failure (missing/invalid token, no profile row, DB error) — this is
    the only gate `/reports/{id}/review` and future admin endpoints need.
    """
    if not authorization:
        return "user"
    try:
        token = authorization.replace("Bearer ", "")
        resp = get_supabase_client().auth.get_user(token)
        if resp.user is None:
            return "user"
        row = (
            get_supabase_admin_client()
            .table("profiles")
            .select("role")
            .eq("id", resp.user.id)
            .limit(1)
            .execute()
        )
        if row.data:
            return row.data[0].get("role", "user")
        return "user"
    except Exception:
        return "user"


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

    Performs a pre-flight check to detect duplicate accounts and provider
    mismatches before delegating to Supabase, so we can return a clear,
    actionable error message instead of a generic Supabase error.
    Optionally accepts `full_name` which is stored in user_metadata.
    """
    # ── Pre-flight: detect duplicate / provider mismatch ─────────────────────
    _check_existing_email(payload.email)

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

        assigned_role = "admin" if (payload.requested_role or "").lower() in ("institution", "admin") else None
        _upsert_profile(response.user, role=assigned_role)


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

    except HTTPException:
        raise
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
    """Authenticate an existing user with email + password.

    Detects Google-only accounts that try to use password login and returns
    a helpful provider-mismatch error instead of a generic auth failure.
    """
    # ── Pre-flight: detect Google-only account trying password login ──────────
    try:
        admin_client = get_supabase_admin_client()

        # Look up by email in profiles — case-insensitive, reliable for all providers
        row = (
            admin_client
            .table("profiles")
            .select("id")
            .ilike("email", payload.email)  # case-insensitive match
            .limit(1)
            .execute()
        )

        if row.data:
            user_id = row.data[0]["id"]
            auth_user = admin_client.auth.admin.get_user_by_id(user_id)
            user = getattr(auth_user, "user", auth_user)
            app_meta = (user.app_metadata or {}) if user else {}
            provider = app_meta.get("provider", "email")
            providers = app_meta.get("providers", [])
            google_only = provider == "google" or (
                providers and all(p == "google" for p in providers)
            )
            if google_only:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "PROVIDER_MISMATCH:google|This account was created using Google Sign-In. "
                        "Please use \"Continue with Google\" to sign in instead of email and password."
                    ),
                )
    except HTTPException:
        raise
    except Exception:
        pass  # Admin lookup failure is non-fatal; let Supabase return the auth error

    try:
        response = get_supabase_client().auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )

        if response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or email not confirmed.",
            )

        _upsert_profile(response.session.user)
        return _build_auth_response(response.session)

    except HTTPException:
        raise
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

        _upsert_profile(response.session.user)
        return _build_auth_response(response.session)

    except HTTPException:
        raise
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

        # Ensure a profiles row always exists for this user.
        # This is critical for Google OAuth users who arrive via the implicit
        # (hash fragment) flow — they never hit /auth/exchange-code, so
        # _upsert_profile() would not have been called otherwise.
        _upsert_profile(user)

        role = "user"
        try:
            row = (
                get_supabase_admin_client()
                .table("profiles")
                .select("role")
                .eq("id", user.id)
                .limit(1)
                .execute()
            )
            if row.data:
                role = row.data[0].get("role", "user")
        except Exception:
            pass

        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=(user.user_metadata or {}).get("full_name"),
            avatar_url=(user.user_metadata or {}).get("avatar_url"),
            provider=user.app_metadata.get("provider", "email") if user.app_metadata else "email",
            created_at=str(user.created_at) if user.created_at else None,
            role=role,
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

# ── Admin Bootstrap Note ─────────────────────────────────────────────────────
# To grant admin access to an account, update the `role` column directly in
# the Supabase `profiles` table:
#   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
# Or use the Admin Dashboard → Users Management → Edit Role.
