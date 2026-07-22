"""
Gemini-backed semantic analysis.

Gemini is deliberately scoped to ONE signal source among several (see
`app/services/scoring.py`) — it never returns a final verdict on its own.
Instead of asking "what's the risk score", we ask it to score a handful of
named, human-interpretable red flags, each with a short justification. That
keeps its contribution auditable and combinable with rule-based and
internal-database signals rather than being an opaque black box.
"""

import json
import logging

import google.generativeai as genai

from app.config import settings
from app.services.scoring import Signal

logger = logging.getLogger(__name__)

_configured = False


class GeminiUnavailableError(Exception):
    """Raised when the Gemini API call fails or returns unusable output."""


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise GeminiUnavailableError("GEMINI_API_KEY is not configured.")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


# ── Job posting sub-signals ─────────────────────────────────────────────────
# name -> (weight within the Gemini portion of the composite score, prompt label)
JOB_POSTING_SUB_SIGNALS = {
    "salary_realism": 15,
    "advance_fee_risk": 20,
    "urgency_pressure": 10,
    "vague_or_generic": 10,
    "contact_legitimacy": 10,
}

_JOB_POSTING_PROMPT = """You are a recruitment-fraud analyst. Score the following job posting \
on each of these red flags, using a 0-100 scale where 0 means "no concern" and 100 means \
"severe red flag":

- salary_realism: is the offered compensation unrealistically high for the role/effort described?
- advance_fee_risk: does it ask the candidate to pay money, buy equipment, or send fees/deposits?
- urgency_pressure: does it use artificial urgency or high-pressure hiring tactics?
- vague_or_generic: does it lack specific detail about the role, responsibilities, or company?
- contact_legitimacy: are contact details unprofessional (personal email domains, no verifiable company info)?

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "salary_realism": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "advance_fee_risk": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "urgency_pressure": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "vague_or_generic": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "contact_legitimacy": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "summary": "<2-3 sentence overall explanation a job seeker would understand>"
}}

Job posting:
\"\"\"
{text}
\"\"\"
"""


def analyze_job_posting(text: str) -> tuple[list[Signal], str]:
    """Run the job posting through Gemini and return (signals, summary).

    Raises GeminiUnavailableError if the call fails or the response can't
    be parsed — callers should degrade gracefully (fall back to rule-based
    signals only) rather than fail the whole request.
    """
    _ensure_configured()

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _JOB_POSTING_PROMPT.format(text=text[:8000]),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:  # network error, API error, bad JSON, etc.
        logger.warning("Gemini job posting analysis failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    signals: list[Signal] = []
    for key, weight in JOB_POSTING_SUB_SIGNALS.items():
        item = data.get(key)
        if not isinstance(item, dict) or "score" not in item:
            continue
        try:
            score = float(item["score"])
        except (TypeError, ValueError):
            continue
        score = max(0.0, min(100.0, score))
        signals.append(
            Signal(
                name=f"gemini:{key}",
                score=score,
                weight=weight,
                explanation=str(item.get("reason", "")),
            )
        )

    if not signals:
        raise GeminiUnavailableError("Gemini response contained no usable sub-signals.")

    summary = str(data.get("summary", "")).strip()
    return signals, summary


# ── Email phishing sub-signals ──────────────────────────────────────────────
EMAIL_PHISHING_SUB_SIGNALS = {
    "urgency_threats": 25,
    "suspicious_links": 25,
    "credential_theft": 25,
    "sender_impersonation": 25,
}

_EMAIL_PHISHING_PROMPT = """You are a cybersecurity phishing analyst. Score the following email \
on each of these red flags, using a 0-100 scale where 0 means "no concern" and 100 means \
"severe red flag":

- urgency_threats: does it use artificial urgency, threats of account suspension, or immediate action requirements?
- suspicious_links: does it contain suspicious URLs, hidden links, or requests to click unfamiliar links?
- credential_theft: does it ask for passwords, login credentials, or sensitive personal information?
- sender_impersonation: does it attempt to spoof a legitimate organization or authority figure?

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "urgency_threats": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "suspicious_links": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "credential_theft": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "sender_impersonation": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "summary": "<2-3 sentence overall explanation a user would understand>"
}}

Email content:
\"\"\"
{text}
\"\"\"
"""


def analyze_email_phishing(text: str) -> tuple[list[Signal], str]:
    """Run the email through Gemini and return (signals, summary).
    
    Raises GeminiUnavailableError if the call fails.
    """
    _ensure_configured()

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _EMAIL_PHISHING_PROMPT.format(text=text[:8000]),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini email analysis failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    signals: list[Signal] = []
    for key, weight in EMAIL_PHISHING_SUB_SIGNALS.items():
        item = data.get(key)
        if not isinstance(item, dict) or "score" not in item:
            continue
        try:
            score = float(item["score"])
        except (TypeError, ValueError):
            continue
        score = max(0.0, min(100.0, score))
        signals.append(
            Signal(
                name=f"gemini:{key}",
                score=score,
                weight=weight,
                explanation=str(item.get("reason", "")),
            )
        )

    if not signals:
        raise GeminiUnavailableError("Gemini response contained no usable sub-signals.")

    summary = str(data.get("summary", "")).strip()
    return signals, summary


# ── Scam Similarity matching ──────────────────────────────────────────────
_SCAM_SIMILARITY_PROMPT = """You are a threat intelligence engine. Analyze the following text \
(likely a job posting, email, or message) and compare it against historical scam patterns \
and campaigns (e.g., "Advance Fee Scam", "Identity Theft", "Fake Check Scam", "Crypto Investment Scam").

Provide an overall semantic similarity score (0-100) indicating how strongly it matches known fraud patterns, \
and list up to 3 specific historical scam cases/types it matches.

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "similarityScore": <0-100 int>,
  "matchedCases": [
    {{
      "id": <random 3-digit int for UI mockup purposes>,
      "type": "<Name of the Scam Pattern>",
      "similarity": <0-100 int>
    }}
  ],
  "summary": "<2-3 sentence overall explanation of the similarity matches>"
}}

Text content:
\"\"\"
{text}
\"\"\"
"""

def analyze_scam_similarity(text: str) -> dict:
    """Run the text through Gemini to find similar historical scams.
    
    Raises GeminiUnavailableError if the call fails.
    """
    _ensure_configured()

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _SCAM_SIMILARITY_PROMPT.format(text=text[:8000]),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini scam similarity analysis failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    return data
