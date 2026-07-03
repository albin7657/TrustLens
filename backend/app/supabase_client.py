"""
Supabase client initialization with lazy loading.

Provides two client getters:
  - `get_supabase_client()` : uses the anon key (for user-facing operations)
  - `get_supabase_admin_client()` : uses the service-role key (for admin operations)
"""

from supabase import create_client, Client
from app.config import settings

_supabase: Client | None = None
_supabase_admin: Client | None = None


def get_supabase_client() -> Client:
    """Return a Supabase client using the anonymous (public) key. Lazily initialized."""
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase


def get_supabase_admin_client() -> Client:
    """Return a Supabase client using the service-role (admin) key. Lazily initialized."""
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin
