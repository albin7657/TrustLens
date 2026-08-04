"""
Company reputation checks: reviews (Trustpilot/Glassdoor/Google) and public
registration records (India MCA/CIN or equivalent).

Neither Trustpilot nor India's MCA offer a usable free/cheap API, so this
uses Tavily (a search API) to find whatever is actually indexed about a
company, then hands the raw snippets to Gemini to narrate — Gemini never
invents a rating or registration number, it only reads what Tavily found.
Best-effort throughout: a missing API key or a failed search just means
this signal is skipped, never a failed verification.
"""

import logging

import httpx

from app.config import settings
from app.services import gemini_client
from app.services.scoring import Signal

logger = logging.getLogger(__name__)

_TAVILY_URL = "https://api.tavily.com/search"
_TIMEOUT = 10.0
_MAX_RESULTS = 4


def _tavily_search(query: str) -> str | None:
    """Best-effort Tavily search. Returns concatenated result snippets, or
    None if the API key is missing, the call fails, or nothing came back."""
    if not settings.TAVILY_API_KEY:
        return None
    try:
        resp = httpx.post(
            _TAVILY_URL,
            json={
                "api_key": settings.TAVILY_API_KEY,
                "query": query,
                "search_depth": "basic",
                "max_results": _MAX_RESULTS,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Tavily search failed for %r: %s", query, exc)
        return None

    results = data.get("results") or []
    if not results:
        return None

    return "\n\n".join(
        f"[{r.get('title', '')}] ({r.get('url', '')})\n{r.get('content', '')}"
        for r in results
        if r.get("content")
    )


def check_company_reputation(company_name: str, domain: str) -> list[Signal]:
    """Search for reviews + public registration records on `company_name`
    and return whatever Signals Gemini could produce from real results.
    Empty list if Tavily isn't configured, both searches come up empty, or
    Gemini is unavailable — never raises."""
    name = (company_name or domain).strip()
    if not name:
        return []

    review_context = _tavily_search(f'"{name}" reviews trustpilot glassdoor complaints scam')
    registration_context = _tavily_search(
        f'"{name}" company registration CIN "Ministry of Corporate Affairs" India'
    )

    if review_context is None and registration_context is None:
        return []

    try:
        signals, _summary = gemini_client.analyze_company_reputation(
            name, review_context or "", registration_context or ""
        )
        return signals
    except gemini_client.GeminiUnavailableError:
        return []
