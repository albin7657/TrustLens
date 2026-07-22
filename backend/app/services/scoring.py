"""
Shared weighted composite scoring engine.

Every detection/verification module (job fraud, company/website trust,
recruiter verification, ...) produces a set of independent `Signal`s and
combines them into one auditable score via `combine()`, instead of trusting
any single source (an LLM call, a WHOIS lookup, ...) as the final verdict.
Adding a new signal later — e.g. an in-house trained model — is just one
more `Signal` with a weight, no redesign of the module.
"""

from dataclasses import dataclass
from typing import Literal

RiskCategory = Literal["low", "medium", "high"]


@dataclass
class Signal:
    """One independent scored input into a composite score.

    `score` is 0-100 where 100 means maximum risk / minimum trust.
    `is_override` marks ground-truth signals (e.g. an internal-database
    match on a previously confirmed scam) that should dominate the result
    rather than being averaged away by softer, inferred signals.
    """

    name: str
    score: float
    weight: float
    explanation: str
    is_override: bool = False


@dataclass
class CompositeScore:
    final_score: float
    category: RiskCategory
    breakdown: list[Signal]


def _categorize(score: float) -> RiskCategory:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def combine(signals: list[Signal], override_threshold: float = 80.0) -> CompositeScore:
    """Combine independent signals into one weighted composite score.

    A signal with `is_override=True` and `score >= override_threshold`
    short-circuits the result to "high" risk at that signal's score —
    used for hard ground-truth matches (e.g. domain already flagged as
    scam in our own database) that shouldn't be diluted by averaging
    against softer, inferred signals like WHOIS age or LLM sentiment.
    """
    if not signals:
        raise ValueError("combine() requires at least one signal")

    for s in signals:
        if s.is_override and s.score >= override_threshold:
            return CompositeScore(final_score=s.score, category="high", breakdown=signals)

    total_weight = sum(s.weight for s in signals)
    if total_weight <= 0:
        raise ValueError("total signal weight must be positive")

    final_score = round(sum(s.score * s.weight for s in signals) / total_weight, 2)
    return CompositeScore(final_score=final_score, category=_categorize(final_score), breakdown=signals)
