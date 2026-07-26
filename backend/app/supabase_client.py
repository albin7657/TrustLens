"""
Supabase client initialization with lazy loading.

Provides two client getters:
  - `get_supabase_client()` : uses the anon key (for user-facing operations)
  - `get_supabase_admin_client()` : uses the service-role key (for admin operations)

Note: A custom httpx client with a 30-second timeout is injected into the
gotrue auth layer. The default httpx timeout is only 5 seconds, which is not
enough when SMTP email dispatch makes the /auth/v1/signup response take 4-6s.
"""

import httpx
from supabase import create_client, Client, ClientOptions
from app.config import settings

_supabase: Client | None = None
_supabase_admin: Client | None = None

# Use a generous timeout so SMTP-backed signups never time out
_HTTP_TIMEOUT = httpx.Timeout(30.0)


def _make_client(url: str, key: str) -> Client:
    """Create a Supabase client with a custom long-timeout httpx client."""
    client = create_client(url, key)
    # Patch the internal gotrue http client timeout
    try:
        auth_client = client.auth
        if hasattr(auth_client, "_http_client") and auth_client._http_client is not None:
            auth_client._http_client.timeout = _HTTP_TIMEOUT
    except Exception:
        pass  # If patching fails, fall back to default (non-fatal)
    return client


def get_supabase_client() -> Client:
    """Return a Supabase client using the anonymous (public) key. Lazily initialized."""
    global _supabase
    if _supabase is None:
        _supabase = _make_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase


def get_supabase_admin_client() -> Client:
    """Return a Supabase client using the service-role (admin) key. Lazily initialized."""
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = _make_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin
