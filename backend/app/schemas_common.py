"""
Shared response shapes for the detection/verification endpoints. Kept
separate from `app/schemas.py` (auth-only) intentionally.
"""

from pydantic import BaseModel


class SignalBreakdownItem(BaseModel):
    """One entry in a composite score's audit trail (see app/services/scoring.py)."""
    name: str
    score: float
    weight: float
    explanation: str
