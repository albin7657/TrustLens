"""
Recruiter email authenticity checks (Milestone P2-6d): MX records, free-mail
detection, disposable-email lists, and lookalike-domain comparison against a
claimed employer domain. Each is an independent Signal feeding the same
composite score as every other module.
"""

import re

import dns.resolver

from app.services.domain_trust import domain_similarity
from app.services.scoring import Signal

FREE_MAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com",
    "proton.me", "rediffmail.com", "aol.com", "icloud.com", "live.com",
    "yandex.com", "zoho.com", "gmx.com",
}

# Small bundled sample of well-known disposable/temporary mail domains — not
# exhaustive, but enough to catch the common ones without an external list.
DISPOSABLE_DOMAINS = {
    "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com",
    "trashmail.com", "yopmail.com", "throwawaymail.com", "getnada.com",
    "temp-mail.org", "fakeinbox.com", "sharklasers.com",
}

# Similarity ratio above which two domains are treated as a likely lookalike
# rather than a coincidental resemblance.
_LOOKALIKE_THRESHOLD = 0.75


def check_mx_records(domain: str) -> Signal | None:
    """No MX records on the claimed domain means it can't legitimately
    receive mail at all — a strong signal for a fabricated company domain.
    None (no signal) if MX records exist or DNS lookup fails for unrelated
    reasons — this check should never penalize on inconclusive data."""
    if not domain:
        return None
    try:
        dns.resolver.resolve(domain, "MX")
        return None
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        return Signal(
            name="email:no_mx_records",
            score=85.0,
            weight=40,
            explanation=f"The domain {domain} has no MX (mail) records — it cannot legitimately receive email.",
        )
    except Exception:
        return None


def check_free_mail(email_domain: str) -> Signal | None:
    """A recruiter claiming to represent a company but emailing from a free
    consumer provider (gmail, yahoo, ...) is a classic red flag."""
    if email_domain in FREE_MAIL_DOMAINS:
        return Signal(
            name="email:free_mail_provider",
            score=70.0,
            weight=30,
            explanation="Corporate recruiters use company domains — a free consumer email provider is a red flag.",
        )
    return None


def check_disposable(email_domain: str) -> Signal | None:
    """A known disposable/temporary mail domain is ground truth, not an
    inference — it dominates the composite score like any other override."""
    if email_domain in DISPOSABLE_DOMAINS:
        return Signal(
            name="email:disposable_domain",
            score=95.0,
            weight=100,
            explanation="This email domain is a known disposable/temporary mail service.",
            is_override=True,
        )
    return None


def _base_name(domain: str) -> str:
    """First label of the domain (drops the TLD), hyphens/underscores
    stripped — 'infosys-hr' from 'infosys-hr.in' becomes 'infosyshr'."""
    label = domain.split(".")[0]
    return re.sub(r"[-_]", "", label).lower()


def check_lookalike_domain(email_domain: str, claimed_domain: str) -> Signal | None:
    """Flags a recruiter domain that resembles the claimed company domain
    without being an exact match — e.g. 'infosys-hr.in' vs 'infosys.com'.

    Comparing the two full domain strings (including differing TLDs) with a
    plain character-similarity ratio misses this common pattern, since the
    strings mostly differ in the TLD and an added word. Instead: strip the
    TLD from both, and flag either (a) one brand name embedded in the other
    (catches "brand + extra word" lookalikes) or (b) a high fuzzy-match
    ratio on the base names (catches character-swap typosquats like
    'inf0sys' vs 'infosys').
    """
    if not email_domain or not claimed_domain or email_domain == claimed_domain:
        return None

    email_base = _base_name(email_domain)
    claimed_base = _base_name(claimed_domain)
    if not email_base or not claimed_base or email_base == claimed_base:
        return None

    contains = claimed_base in email_base or email_base in claimed_base
    similarity = domain_similarity(email_base, claimed_base)
    if not contains and similarity < _LOOKALIKE_THRESHOLD:
        return None

    score = round(max(similarity, 0.85 if contains else 0.0) * 100, 2)
    return Signal(
        name="email:lookalike_domain",
        score=score,
        weight=35,
        explanation=(
            f"Email domain '{email_domain}' closely resembles the claimed company domain "
            f"'{claimed_domain}' — possible impersonation."
        ),
    )


def assess_email(email_domain: str, claimed_company_domain: str | None = None) -> list[Signal]:
    """Run every email authenticity check and return the signals that fired."""
    signals: list[Signal] = []
    for check in (check_disposable, check_free_mail, check_mx_records):
        signal = check(email_domain)
        if signal:
            signals.append(signal)
    if claimed_company_domain:
        lookalike = check_lookalike_domain(email_domain, claimed_company_domain)
        if lookalike:
            signals.append(lookalike)
    return signals
