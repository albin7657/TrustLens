"""
Internal-database lookup signal.

Checks whether a domain, company, or recruiter is already known to us — from
prior verifications or the curated scam_websites list. This is the
highest-confidence signal in the scoring engine: it's ground truth from a
previously confirmed determination, not an inference like WHOIS age or an
LLM's read of free text. A `suspicious` or scam-list match is marked as an
override so it dominates the composite score rather than being averaged
away by softer signals; a `verified` match carries a large weight so it
strongly (but not absolutely) pulls the score toward low risk.
"""

import re

from app.services.scoring import Signal
from app.supabase_client import get_supabase_admin_client

_EMAIL_RE = re.compile(r"[\w.+-]+@([\w-]+\.[\w.-]+)")
_DOMAIN_RE = re.compile(r"\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b", re.IGNORECASE)

# Large relative to a single Gemini sub-signal (10-20) or rule-based check (20)
# so a known verdict dominates the weighted average without being an
# absolute override in the "verified" / plain "unverified" cases.
KNOWN_RECORD_WEIGHT = 100
UNVERIFIED_RECORD_WEIGHT = 5


def _status_to_signal(name: str, status: str) -> Signal:
    if status == "suspicious":
        return Signal(
            name=name,
            score=95.0,
            weight=KNOWN_RECORD_WEIGHT,
            explanation="Already flagged as suspicious in our internal database.",
            is_override=True,
        )
    if status == "verified":
        return Signal(
            name=name,
            score=5.0,
            weight=KNOWN_RECORD_WEIGHT,
            explanation="Verified in our internal database.",
        )
    return Signal(
        name=name,
        score=50.0,
        weight=UNVERIFIED_RECORD_WEIGHT,
        explanation="Present in our database but not yet verified either way.",
    )


def check_domain(domain: str) -> Signal | None:
    """Look up a domain against scam_websites, then companies. None if unknown."""
    if not domain:
        return None
    client = get_supabase_admin_client()

    scam = (
        client.table("scam_websites")
        .select("domain, reason")
        .eq("domain", domain)
        .limit(1)
        .execute()
    )
    if scam.data:
        reason = scam.data[0].get("reason") or "reported scam website"
        return Signal(
            name="internal_db:scam_website",
            score=98.0,
            weight=KNOWN_RECORD_WEIGHT,
            explanation=f"Domain is on our scam website list: {reason}",
            is_override=True,
        )

    company = (
        client.table("companies")
        .select("status")
        .eq("domain", domain)
        .limit(1)
        .execute()
    )
    if company.data:
        return _status_to_signal("internal_db:company", company.data[0].get("status", "unverified"))

    return None


def check_recruiter_email(email: str) -> Signal | None:
    """Look up a recruiter email against the recruiters table. None if unknown."""
    if not email:
        return None
    client = get_supabase_admin_client()
    recruiter = (
        client.table("recruiters")
        .select("status")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if recruiter.data:
        return _status_to_signal("internal_db:recruiter", recruiter.data[0].get("status", "unverified"))
    return None


def extract_domain(text: str) -> str | None:
    """Best-effort extraction of an email domain or bare domain from free text."""
    email_match = _EMAIL_RE.search(text)
    if email_match:
        return email_match.group(1).lower()
    domain_match = _DOMAIN_RE.search(text)
    if domain_match:
        return domain_match.group(1).lower()
    return None
