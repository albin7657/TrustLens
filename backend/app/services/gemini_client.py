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


# ── Scam similarity explanation (Milestone P2-4) ────────────────────────────
# Unlike the old analyze_scam_similarity this replaced, Gemini never invents
# matches here — `app/similarity.py` finds real matches via pgvector first
# and this only narrates *those* in plain language.
_SIMILARITY_EXPLANATION_PROMPT = """You are a threat intelligence analyst. A user submitted the \
text below. Our database found the following previously confirmed scam reports/postings that \
are semantically similar to it (similarity is 0-1, closer to 1 is more similar).

Explain in 2-3 sentences, in plain language a user would understand, why this input resembles \
these known cases. Only reference the matches provided below — do not invent additional cases \
or details that aren't present in the matches or the submitted text.

Submitted text:
\"\"\"
{text}
\"\"\"

Matches found (most similar first):
{matches_block}

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{"analysis": "<2-3 sentence explanation>"}}
"""


def explain_similarity_matches(text: str, matches: list[dict]) -> str:
    """Ask Gemini to explain already-found pgvector matches. Raises
    GeminiUnavailableError if the call fails — callers should fall back to
    a templated explanation rather than block the response on this."""
    _ensure_configured()

    matches_block = "\n".join(
        f"- [{m['source_table']}] category={m.get('category') or 'unknown'} "
        f"similarity={m['similarity']:.2f}: {m['excerpt']}"
        for m in matches
    )

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _SIMILARITY_EXPLANATION_PROMPT.format(text=text[:4000], matches_block=matches_block),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini similarity explanation failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    return str(data.get("analysis", "")).strip()
