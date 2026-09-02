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
    "salary_plausibility": 15,
    "advance_fee_risk": 20,
    "urgency_pressure": 10,
    "vague_or_generic": 10,
    "contact_legitimacy": 10,
    "predatory_internship_pattern": 25,
}

# A posting is "predatory-dominated" (Milestone P2-6a) when Gemini's own
# pattern-match sub-signal is this severe, regardless of the overall
# risk_category — that's what earns the distinct verdict_label.
PREDATORY_INTERNSHIP_THRESHOLD = 60.0

_JOB_POSTING_PROMPT = """You are a recruitment-fraud analyst. Score the following job posting \
on each of these red flags, using a 0-100 scale where 0 means "no concern" and 100 means \
"severe red flag":

- salary_plausibility: is the offered compensation wildly high for the role/effort described \
(classic lure), OR is a "stipend" actually a fee charged to the candidate in disguise?
- advance_fee_risk: does it ask the candidate to pay money, buy equipment, or send fees/deposits?
- urgency_pressure: does it use artificial urgency or high-pressure hiring tactics?
- vague_or_generic: does it lack specific detail about the role, responsibilities, or company?
- contact_legitimacy: are contact details unprofessional (personal email domains, no verifiable company info)?
- predatory_internship_pattern: does this match a pay-for-certificate / internship-mill scheme — \
an unpaid or low-value role, ANY fee charged to the candidate, a certificate or letter of \
recommendation positioned as the main deliverable, and trivial work (watching videos, filling \
forms) rather than real responsibilities?

Also classify:
- posting_type: is this posting for a "job" or an "internship"? One of exactly: job, internship.

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "posting_type": "<job or internship>",
  "salary_plausibility": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "advance_fee_risk": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "urgency_pressure": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "vague_or_generic": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "contact_legitimacy": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "predatory_internship_pattern": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "summary": "<2-3 sentence overall explanation a job seeker would understand>"
}}

Job posting:
\"\"\"
{text}
\"\"\"
"""


def analyze_job_posting(text: str) -> tuple[list[Signal], str, str, float]:
    """Run the job posting through Gemini and return
    (signals, summary, posting_type, predatory_pattern_score).

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
    predatory_score = 0.0
    for key, weight in JOB_POSTING_SUB_SIGNALS.items():
        item = data.get(key)
        if not isinstance(item, dict) or "score" not in item:
            continue
        try:
            score = float(item["score"])
        except (TypeError, ValueError):
            continue
        score = max(0.0, min(100.0, score))
        if key == "predatory_internship_pattern":
            predatory_score = score
        is_override = (
            (key == "advance_fee_risk" and score >= 85.0)
            or (key == "predatory_internship_pattern" and score >= PREDATORY_INTERNSHIP_THRESHOLD)
        )
        signals.append(
            Signal(
                name=f"gemini:{key}",
                score=score,
                weight=weight,
                explanation=str(item.get("reason", "")),
                is_override=is_override,
            )
        )

    if not signals:
        raise GeminiUnavailableError("Gemini response contained no usable sub-signals.")

    posting_type = data.get("posting_type") if data.get("posting_type") in ("job", "internship") else "job"
    summary = str(data.get("summary", "")).strip()
    return signals, summary, posting_type, predatory_score


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


# ── Communication analysis (Milestone P2-5) ─────────────────────────────────
COMMUNICATION_SUB_SIGNALS = {
    "payment_or_fee_request": 30,
    "urgency_or_threat": 20,
    "impersonation_or_authority": 20,
    "credential_or_personal_info_request": 20,
}

# Severity if Gemini's stage/lure classification should shift the score even
# when the sub-signals above don't fully capture it (e.g. a bare "pay now"
# demand with none of the softer manipulation tactics).
_STAGE_SEVERITY = {
    "contact": 15.0,
    "trust_building": 35.0,
    "urgency": 60.0,
    "payment_request": 90.0,
    "credential_theft": 95.0,
}
_LURE_SEVERITY = {
    "none": 5.0,
    "registration_fee": 80.0,
    "equipment_fee": 80.0,
    "training_deposit": 80.0,
    "crypto": 85.0,
    "gift_card": 85.0,
    "phishing_link": 85.0,
    "credential_theft": 90.0,
}

_COMMUNICATION_PROMPT = """You are a scam-communication analyst. Below is a message thread over \
{channel} — each line is prefixed with who sent it: "them" is the other party, "me" is the \
person who received it. Classify it and score red flags.

Classify:
- scam_stage: which stage of a scam does this thread currently sit at? One of exactly: \
contact, trust_building, urgency, payment_request, credential_theft.
- lure_type: the specific lure/ask present, if any. One of exactly: registration_fee, \
equipment_fee, training_deposit, crypto, gift_card, phishing_link, credential_theft, none.

Score each of these red flags on a 0-100 scale where 0 means "no concern" and 100 means \
"severe red flag":
- payment_or_fee_request: does "them" ask for money, fees, deposits, or purchases?
- urgency_or_threat: does it use artificial urgency, deadlines, or threats?
- impersonation_or_authority: does it claim to represent a company/authority without verifiable proof?
- credential_or_personal_info_request: does it ask for passwords, OTPs, bank details, or ID documents?

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "scam_stage": "<one of the exact values above>",
  "lure_type": "<one of the exact values above>",
  "payment_or_fee_request": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "urgency_or_threat": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "impersonation_or_authority": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "credential_or_personal_info_request": {{"score": <0-100 int>, "reason": "<one sentence>"}},
  "summary": "<2-3 sentence overall explanation a user would understand>"
}}

Thread:
\"\"\"
{thread}
\"\"\"
"""


def analyze_communication(thread: str, channel: str) -> tuple[list[Signal], str, str, str]:
    """Run a message thread through Gemini and return
    (signals, scam_stage, lure_type, summary).

    Raises GeminiUnavailableError if the call fails or the response can't be
    parsed — callers should degrade gracefully (rule-based + internal-DB
    signals only, stage/lure left at safe defaults).
    """
    _ensure_configured()

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _COMMUNICATION_PROMPT.format(channel=channel, thread=thread[:8000]),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini communication analysis failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    scam_stage = data.get("scam_stage") if data.get("scam_stage") in _STAGE_SEVERITY else "contact"
    lure_type = data.get("lure_type") if data.get("lure_type") in _LURE_SEVERITY else "none"

    signals: list[Signal] = []
    for key, weight in COMMUNICATION_SUB_SIGNALS.items():
        item = data.get(key)
        if not isinstance(item, dict) or "score" not in item:
            continue
        try:
            score = float(item["score"])
        except (TypeError, ValueError):
            continue
        score = max(0.0, min(100.0, score))
        signals.append(
            Signal(name=f"gemini:{key}", score=score, weight=weight, explanation=str(item.get("reason", "")))
        )

    if not signals:
        raise GeminiUnavailableError("Gemini response contained no usable sub-signals.")

    signals.append(
        Signal(
            name="gemini:scam_stage",
            score=_STAGE_SEVERITY[scam_stage],
            weight=20,
            explanation=f"Classified communication stage: {scam_stage.replace('_', ' ')}.",
            is_override=(scam_stage in ("credential_theft", "payment_request")),
        )
    )
    signals.append(
        Signal(
            name="gemini:lure_type",
            score=_LURE_SEVERITY[lure_type],
            weight=20,
            explanation=f"Detected lure type: {lure_type.replace('_', ' ')}.",
            is_override=(lure_type in ("phishing_link", "credential_theft", "crypto", "gift_card")),
        )
    )

    summary = str(data.get("summary", "")).strip()
    return signals, scam_stage, lure_type, summary


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


# ── Fraud Complaint Generation (Milestone P2-9) ─────────────────────────────
_COMPLAINT_PROMPT = """You are a legal & cybercrime reporting assistant. Analyze the following fraud scan / report record and generate a formal, structured incident report suitable for submission to cybercrime reporting portals (e.g. India Cybercrime Portal, FTC, IC3).

Record details:
Type: {type}
Target / Reference: {target}
Risk / Status: {risk}
Summary / Text: {summary}
Signal breakdown / Details: {details}

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "incident_summary": "<2-4 sentence formal narrative summary of what occurred and why it is fraudulent>",
  "entity_details": {{
    "entity_name": "<company name or person claimed, if known>",
    "domain_or_url": "<domain or URL involved, if any>",
    "contact_email_or_phone": "<email or contact phone involved, if any>"
  }},
  "evidence_list": [
    "<specific evidence point 1>",
    "<specific evidence point 2>",
    "<specific evidence point 3>"
  ],
  "recommended_channels": [
    "<recommended portal 1 e.g. National Cyber Crime Reporting Portal (cybercrime.gov.in)>",
    "<recommended portal 2 e.g. Federal Trade Commission (reportfraud.ftc.gov)>",
    "<recommended portal 3 e.g. Local Police Cyber Cell>"
  ]
}}
"""


def generate_fraud_complaint(record: dict) -> dict:
    """Generate a structured fraud complaint from a scan_history or fraud_reports record.
    Falls back gracefully to a templated dict if Gemini is unavailable.
    """
    try:
        _ensure_configured()
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _COMPLAINT_PROMPT.format(
                type=record.get("type", "fraud_scan"),
                target=record.get("target", "N/A"),
                risk=record.get("risk", "High Risk"),
                summary=str(record.get("summary", ""))[:2000],
                details=json.dumps(record.get("details", []), default=str)[:2000],
            ),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
        if isinstance(data, dict) and "incident_summary" in data:
            return data
    except Exception as exc:
        logger.warning("Gemini complaint generation failed: %s", exc)

    # Fallback structure if Gemini fails
    signals = record.get("details", [])
    ev_list = []
    if isinstance(signals, list):
        for s in signals:
            if isinstance(s, dict) and "explanation" in s:
                ev_list.append(s["explanation"])
    if not ev_list:
        ev_list = [
            f"Automated risk classification: {record.get('risk', 'High Risk')}",
            f"Identified reference: {record.get('target', 'N/A')}",
        ]

    return {
        "incident_summary": f"Incident involving {record.get('target', 'unspecified target')} flagged with risk status '{record.get('risk', 'High Risk')}'. {str(record.get('summary', ''))[:300]}",
        "entity_details": {
            "entity_name": str(record.get("target", "Unknown")),
            "domain_or_url": str(record.get("target", "N/A")),
            "contact_email_or_phone": "N/A",
        },
        "evidence_list": ev_list,
        "recommended_channels": [
            "National Cyber Crime Reporting Portal (cybercrime.gov.in)",
            "Federal Trade Commission (reportfraud.ftc.gov)",
            "Internet Crime Complaint Center (ic3.gov)",
        ],
    }


# ── Company reputation: reviews + public registration records ──────────────
# Neither Trustpilot nor India's MCA offer a usable free/cheap API, so this
# reads web-search snippets (Tavily, see app/services/reputation_checks.py)
# instead of hitting either service directly — Gemini only narrates what the
# search actually found, it never invents a rating or registration number.
COMPANY_REPUTATION_SUB_SIGNALS = {
    "review_sentiment": 15,
    "registration_confidence": 15,
}

_COMPANY_REPUTATION_PROMPT = """You are a due-diligence analyst. A user is checking whether \
"{company_name}" is a legitimate company. Below are web search results about (1) its reviews/reputation \
and (2) its public company registration record (India MCA/CIN or equivalent).

Only use what's in the search results below — do not invent a rating, review count, or registration \
number that isn't explicitly present in the text.

Score each of these on a 0-100 scale where 0 means "no concern" and 100 means "severe red flag":
- review_sentiment: based on the review snippets, do reviews/complaints suggest a scam, non-payment, or \
fraud (high score), a normal mix of workplace complaints (low-medium), or is there no review data at all \
(treat as mild/neutral — absence of reviews is not itself proof of fraud, small or new legitimate \
companies often have little online footprint)?
- registration_confidence: is there credible evidence of a real company registration (CIN, incorporation \
record) matching this name (low score = found and matches), or no registration record found at all for a \
company claiming to be a registered business (higher score)?

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "review_sentiment": {{"score": <0-100 int>, "reason": "<one sentence, cite what was actually found>"}},
  "registration_confidence": {{"score": <0-100 int>, "reason": "<one sentence, cite CIN/registration if found>"}},
  "summary": "<2-3 sentence overall reputation summary a job seeker would understand>"
}}

Review/reputation search results:
\"\"\"
{review_context}
\"\"\"

Company registration search results:
\"\"\"
{registration_context}
\"\"\"
"""


def analyze_company_reputation(
    company_name: str, review_context: str, registration_context: str
) -> tuple[list[Signal], str]:
    """Run Tavily search context through Gemini and return (signals, summary).

    Raises GeminiUnavailableError if the call fails or the response can't be
    parsed — the caller should just skip this signal, not fail the whole
    company verification over it.
    """
    _ensure_configured()

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            _COMPANY_REPUTATION_PROMPT.format(
                company_name=company_name,
                review_context=review_context[:4000] or "(no search results found)",
                registration_context=registration_context[:4000] or "(no search results found)",
            ),
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini company reputation analysis failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    signals: list[Signal] = []
    for key, weight in COMPANY_REPUTATION_SUB_SIGNALS.items():
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
                name=f"reputation:{key}",
                score=score,
                weight=weight,
                explanation=str(item.get("reason", "")),
            )
        )

    if not signals:
        raise GeminiUnavailableError("Gemini response contained no usable sub-signals.")

    summary = str(data.get("summary", "")).strip()
    return signals, summary


# ── RAG chat assistant ───────────────────────────────────────────────────────
_RAG_ANSWER_PROMPT = """{system_prompt}

Answer the user's question using ONLY the retrieved context below. If the context \
doesn't contain enough information to answer confidently, say so clearly and provide \
general, practical safety advice about recruitment and internship scams.

Do NOT invent company names, report IDs, fraud cases, ratings, or registration numbers \
that aren't explicitly present in the context.

User question:
\"\"\"
{question}
\"\"\"

Semantic similarity matches (confirmed fraud reports and analyzed job postings):
{vector_block}

Trust repository records (companies, recruiters, scam websites, community reports):
{repo_block}

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{{
  "answer": "<clear, helpful 2-5 paragraph answer written for a job seeker>",
  "confidence": <0-100 int reflecting how well the context supports your answer>,
  "sources": ["<short human-readable source label>", "..."]
}}
"""


def _format_vector_block(matches: list[dict]) -> str:
    if not matches:
        return "(no similar fraud reports or job postings found)"
    return "\n".join(
        f"- [{m['source_table']}] category={m.get('category') or 'unknown'} "
        f"similarity={m['similarity']:.2f}: {m['excerpt']}"
        for m in matches
    )


def _format_repo_block(records: list[dict]) -> str:
    if not records:
        return "(no matching companies, recruiters, or reports found)"
    lines = []
    for r in records:
        detail = f" detail={r['detail']}" if r.get("detail") else ""
        lines.append(
            f"- [{r['type']}] {r['label']} status={r.get('status') or 'unknown'}{detail}"
        )
    return "\n".join(lines)


def answer_rag_question(
    question: str,
    matches: list[dict],
    repo_records: list[dict],
    *,
    system_prompt: str | None = None,
) -> dict:
    """Generate a grounded RAG answer from retrieved vector + repository context.

    Returns {"answer": str, "confidence": int, "sources": list[str]}.
    Raises GeminiUnavailableError on API failure.
    """
    _ensure_configured()

    prompt = _RAG_ANSWER_PROMPT.format(
        system_prompt=system_prompt
        or "You are TrustLens AI, a specialized assistant for recruitment fraud detection.",
        question=question[:2000],
        vector_block=_format_vector_block(matches),
        repo_block=_format_repo_block(repo_records),
    )

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        data = json.loads(response.text)
    except Exception as exc:
        logger.warning("Gemini RAG answer failed: %s", exc)
        raise GeminiUnavailableError(str(exc)) from exc

    answer = str(data.get("answer", "")).strip()
    if not answer:
        raise GeminiUnavailableError("Gemini returned an empty RAG answer.")

    try:
        confidence = int(data.get("confidence", 50))
    except (TypeError, ValueError):
        confidence = 50
    confidence = max(0, min(100, confidence))

    sources = data.get("sources")
    if not isinstance(sources, list):
        sources = []
    sources = [str(s).strip() for s in sources if str(s).strip()]

    return {"answer": answer, "confidence": confidence, "sources": sources}


def fallback_rag_answer(
    question: str,
    matches: list[dict],
    repo_records: list[dict],
) -> dict:
    """Template response when Gemini is unavailable — still grounded in retrieval."""
    parts: list[str] = []
    sources: list[str] = []

    if repo_records:
        parts.append("Trust repository matches:")
        for r in repo_records[:5]:
            line = f"- {r['label']} ({r['type']}, status: {r.get('status') or 'unknown'})"
            parts.append(line)
            sources.append(f"{r['type'].replace('_', ' ').title()}: {r['label']}")

    if matches:
        parts.append(
            f"\nFound {len(matches)} semantically similar case(s) in our records "
            f"(top match: {round(matches[0]['similarity'] * 100)}% similar)."
        )
        for m in matches[:3]:
            sources.append(
                f"{m['source_table'].replace('_', ' ').title()} "
                f"({round(m['similarity'] * 100)}% match)"
            )

    if not parts:
        answer = (
            "I couldn't find specific records in TrustLens related to your question. "
            "As a general rule: never pay upfront fees for a job or internship, verify "
            "company domains and recruiter emails independently, and be cautious of "
            "unsolicited offers with unusually high pay or urgent deadlines."
        )
        confidence = 20
    else:
        answer = (
            f"AI narration is temporarily unavailable, but here's what our database shows "
            f"for your question about \"{question[:120]}\":\n\n"
            + "\n".join(parts)
            + "\n\nCross-check these findings with official company registries before proceeding."
        )
        confidence = 55 if matches else 40

    return {"answer": answer, "confidence": confidence, "sources": sources}

