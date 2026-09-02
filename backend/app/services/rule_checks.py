"""
Deterministic rule-based red-flag checks for job postings and communication threads.

Fast, offline, and don't depend on the LLM being available. Runs alongside Gemini's
semantic sub-signals and the internal-database signal in the composite score.
"""

from app.services.scoring import Signal

# ── Job Fraud Patterns ────────────────────────────────────────────────────────
_JOB_RED_FLAG_PHRASES = {
    "advance_fee": [
        "processing fee", "registration fee", "training fee", "equipment fee",
        "security deposit", "refundable deposit", "send money", "gift card",
        "wire transfer", "western union", "pay upfront", "purchase materials",
        "starter kit fee", "id card fee", "laptop fee", "visa processing fee",
    ],
    "urgency_pressure": [
        "immediate joining", "urgent hiring", "limited slots", "apply within 24 hours",
        "act now", "hurry up", "only few seats left", "instant placement",
        "direct joining without test", "spot offer",
    ],
    "unrealistic_pay": [
        "guaranteed income", "easy money", "unlimited earning potential",
        "no experience needed high pay", "earn from home instantly",
        "earn 5000 daily", "earn 10000 daily", "part time 50k",
        "earn without effort", "daily payout guaranteed",
    ],
    "vague_or_suspicious_process": [
        "work from home no interview", "no interview required", "instant hiring",
        "no resume needed", "contact on telegram", "contact on whatsapp",
        "send message on telegram", "dm on telegram", "reach out via telegram",
        "send screenshot to get paid", "task based earning", "like videos earn money",
    ],
}

# ── Communication & Phishing Patterns ─────────────────────────────────────────
_COMMUNICATION_RED_FLAG_PHRASES = {
    "account_security_threats": [
        "account suspended", "account has been suspended", "account locked",
        "account will be deleted", "account terminated", "suspicious activity",
        "unauthorized access", "unusual login", "security alert", "security violation",
        "temporary block", "temporarily blocked", "access restricted", "account compromised",
        "fraud detected", "risk alert",
    ],
    "credential_harvesting": [
        "verify your password", "confirm your identity", "verify your account",
        "update your credentials", "reset password", "click here to verify",
        "click link to restore", "login immediately", "update payment details",
        "submit your kyc", "re-authenticate", "verify now", "fill this form to unlock",
        "enter your otp", "validate your profile",
    ],
    "urgency_and_intimidation": [
        "within 24 hours", "within 12 hours", "within 1 hour", "within 2 hours",
        "immediate action required", "act immediately", "will be closed permanently",
        "last warning", "final notice", "before it is too late", "urgent response required",
        "legal action will be taken", "failure to do so will result",
    ],
    "financial_and_payment_lures": [
        "send otp", "share otp", "share your pin", "send money", "wire transfer",
        "western union", "gift card", "processing fee", "registration fee",
        "crypto deposit", "bitcoin transfer", "claim your prize", "lottery winner",
        "inheritance fund", "selected for grant", "customs clearance fee",
        "courier release fee",
    ],
    "suspicious_channels_and_tasks": [
        "contact our manager on telegram", "reach manager on whatsapp",
        "join telegram channel", "send screenshot for payment", "task completion reward",
        "hotel review task", "youtube subscribe task", "crypto task",
    ],
}

# ── Internship Fee Patterns ───────────────────────────────────────────────────
_INTERNSHIP_FEE_PHRASES = [
    "registration fee", "training fee", "certificate fee", "security deposit",
    "pay for internship", "stipend based on performance", "certificate + lor",
    "certificate and lor", "guaranteed certificate", "limited seats",
    "msme registered", "no interview required", "offer letter fee",
    "domain training fee",
]


def check_red_flag_phrases(text: str) -> Signal:
    """Evaluate job posting text against known recruitment fraud phrases."""
    lowered = text.lower()
    matched: list[str] = []
    categories_hit = 0

    for phrases in _JOB_RED_FLAG_PHRASES.values():
        hits = [p for p in phrases if p in lowered]
        if hits:
            categories_hit += 1
            matched.extend(hits)

    score = round((categories_hit / len(_JOB_RED_FLAG_PHRASES)) * 100, 2)

    if matched:
        distinct_matches = list(dict.fromkeys(matched))
        explanation = f"Matched {len(distinct_matches)} known recruitment scam phrase(s): {', '.join(distinct_matches[:5])}."
    else:
        explanation = "No recruitment scam phrases detected in phrase catalog."

    return Signal(name="rules:job_red_flag_phrases", score=score, weight=20, explanation=explanation)


def check_communication_red_flag_phrases(text: str) -> Signal:
    """Evaluate message threads, emails, and SMS for phishing and scam indicators."""
    lowered = text.lower()
    matched: list[str] = []
    categories_hit = 0

    for phrases in _COMMUNICATION_RED_FLAG_PHRASES.values():
        hits = [p for p in phrases if p in lowered]
        if hits:
            categories_hit += 1
            matched.extend(hits)

    score = round((categories_hit / len(_COMMUNICATION_RED_FLAG_PHRASES)) * 100, 2)

    if matched:
        distinct_matches = list(dict.fromkeys(matched))
        explanation = f"Matched {len(distinct_matches)} phishing / scam indicator(s): {', '.join(distinct_matches[:5])}."
    else:
        explanation = "No known phishing or social engineering threat keywords detected."

    return Signal(name="rules:communication_threat_phrases", score=score, weight=25, explanation=explanation)


def check_internship_fee_phrases(text: str) -> Signal:
    """Pay-for-certificate / internship-mill phrase check (Milestone P2-6a)."""
    lowered = text.lower()
    matched = [p for p in _INTERNSHIP_FEE_PHRASES if p in lowered]

    score = round(min(len(matched) / 3, 1.0) * 100, 2)

    if matched:
        distinct_matches = list(dict.fromkeys(matched))
        explanation = f"Matched {len(distinct_matches)} pay-for-certificate phrase(s): {', '.join(distinct_matches[:5])}."
    else:
        explanation = "No pay-for-certificate / internship-mill phrases detected."

    return Signal(name="rules:internship_fee_phrases", score=score, weight=25, explanation=explanation)
