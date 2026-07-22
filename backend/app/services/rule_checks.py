"""
Deterministic rule-based red-flag checks for job postings — fast, offline,
and don't depend on the LLM being available. Runs alongside Gemini's
semantic sub-signals and the internal-database signal in the composite
score for Module 1 (Job Fraud Detection).
"""

from app.services.scoring import Signal

_RED_FLAG_PHRASES = {
    "advance_fee": [
        "processing fee", "registration fee", "training fee", "equipment fee",
        "security deposit", "refundable deposit", "send money", "gift card",
        "wire transfer", "western union",
    ],
    "urgency": [
        "immediate joining", "urgent hiring", "limited slots", "apply within 24 hours",
        "act now", "hurry up", "only few seats left",
    ],
    "unrealistic_pay": [
        "guaranteed income", "easy money", "unlimited earning potential",
        "no experience needed high pay", "earn from home instantly",
    ],
    "vague_role": [
        "work from home no interview", "no interview required", "instant hiring",
        "no resume needed",
    ],
}


def check_red_flag_phrases(text: str) -> Signal:
    lowered = text.lower()
    matched: list[str] = []
    categories_hit = 0

    for phrases in _RED_FLAG_PHRASES.values():
        hits = [p for p in phrases if p in lowered]
        if hits:
            categories_hit += 1
            matched.extend(hits)

    score = round((categories_hit / len(_RED_FLAG_PHRASES)) * 100, 2)

    if matched:
        explanation = f"Matched {len(matched)} known scam phrase(s): {', '.join(matched[:5])}."
    else:
        explanation = "No known scam phrases detected."

    return Signal(name="rules:red_flag_phrases", score=score, weight=20, explanation=explanation)
