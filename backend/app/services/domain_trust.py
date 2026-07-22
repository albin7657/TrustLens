"""
Domain trust checks — WHOIS age, SSL certificate validity, security headers,
and typosquatting distance against our own verified-company domains.

Each check is an independent Signal feeding the composite score used by
company and website trust assessment (Modules 3 & 4 share this service
since they inspect the same underlying domain signals). Network calls are
individually try/excepted so one failing check (e.g. WHOIS rate limits)
degrades that signal rather than failing the whole assessment.
"""

import difflib
import socket
import ssl
from datetime import datetime, timezone

import httpx
import whois

from app.services.scoring import Signal
from app.supabase_client import get_supabase_admin_client

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Content-Security-Policy",
]


def check_domain_age(domain: str) -> Signal:
    try:
        record = whois.whois(domain)
        creation = record.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation is None:
            return Signal(
                name="whois:age", score=60.0, weight=15,
                explanation="Could not determine domain registration date from WHOIS.",
            )
        if creation.tzinfo is None:
            creation = creation.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - creation).days

        if age_days < 30:
            score = 90.0
        elif age_days < 180:
            score = 60.0
        elif age_days < 365:
            score = 35.0
        else:
            score = 10.0

        return Signal(
            name="whois:age", score=score, weight=20,
            explanation=f"Domain registered {age_days} days ago.",
        )
    except Exception as exc:
        return Signal(
            name="whois:age", score=55.0, weight=8,
            explanation=f"WHOIS lookup failed, treating as neutral: {exc}",
        )


def check_ssl(domain: str) -> Signal:
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()

        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(
            tzinfo=timezone.utc
        )
        days_left = (not_after - datetime.now(timezone.utc)).days

        if days_left < 0:
            return Signal(
                name="ssl:validity", score=95.0, weight=15,
                explanation="SSL certificate has expired.",
            )

        issuer = dict(x[0] for x in cert.get("issuer", []))
        issuer_name = issuer.get("organizationName", "unknown issuer")
        return Signal(
            name="ssl:validity", score=5.0, weight=15,
            explanation=f"Valid SSL certificate issued by {issuer_name}, expires in {days_left} days.",
        )
    except Exception as exc:
        return Signal(
            name="ssl:validity", score=80.0, weight=15,
            explanation=f"Could not establish a valid SSL connection: {exc}",
        )


def check_security_headers(domain: str) -> Signal:
    try:
        resp = httpx.get(f"https://{domain}", timeout=6, follow_redirects=True)
        present = [h for h in SECURITY_HEADERS if h in resp.headers]
        missing = [h for h in SECURITY_HEADERS if h not in resp.headers]
        score = round((len(missing) / len(SECURITY_HEADERS)) * 70, 2)

        explanation = f"{len(present)}/{len(SECURITY_HEADERS)} recommended security headers present."
        if missing:
            explanation += f" Missing: {', '.join(missing)}."

        return Signal(name="headers:security", score=score, weight=10, explanation=explanation)
    except Exception as exc:
        return Signal(
            name="headers:security", score=40.0, weight=5,
            explanation=f"Could not fetch site to inspect headers: {exc}",
        )


def check_typosquatting(domain: str) -> Signal | None:
    """Flag domains that closely resemble one of our own verified-company domains."""
    client = get_supabase_admin_client()
    verified = client.table("companies").select("domain").eq("status", "verified").execute()
    known_domains = [
        row["domain"] for row in (verified.data or []) if row.get("domain") and row["domain"] != domain
    ]
    if not known_domains:
        return None

    closest = difflib.get_close_matches(domain, known_domains, n=1, cutoff=0.75)
    if not closest:
        return Signal(
            name="typosquat:check", score=5.0, weight=10,
            explanation="No close resemblance to known verified brand domains.",
        )

    similarity = difflib.SequenceMatcher(None, domain, closest[0]).ratio()
    score = round(similarity * 100, 2)
    return Signal(
        name="typosquat:check", score=score, weight=15,
        explanation=(
            f"Domain closely resembles verified brand '{closest[0]}' "
            f"({round(similarity * 100)}% similar) — possible typosquatting."
        ),
    )


def assess_domain(domain: str) -> list[Signal]:
    """Run every domain trust check and return the full signal list."""
    signals = [check_domain_age(domain), check_ssl(domain), check_security_headers(domain)]
    typosquat = check_typosquatting(domain)
    if typosquat is not None:
        signals.append(typosquat)
    return signals
