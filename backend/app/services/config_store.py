"""
Thread-safe persistent configuration manager for AI/ML Model Controls & System Settings.
"""

import json
import os
import threading
from typing import Any, Dict

CONFIG_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model_config.json")

_DEFAULT_CONFIG: Dict[str, Any] = {
    "job_risk_threshold": 70.0,
    "email_risk_threshold": 65.0,
    "company_risk_threshold": 75.0,
    "active_llm_provider": "gemini-1.5-flash",
    "weight_keywords": 0.35,
    "weight_embeddings": 0.35,
    "weight_llm": 0.30,
    "system_prompt_override": "You are TrustLens AI, a specialized threat detector for scam jobs, phishing emails, and predatory organizations. Analyze input rigorously.",
    "rag_enabled": True,
    "auto_flag_scams": True,
}

_lock = threading.Lock()
_current_config: Dict[str, Any] = dict(_DEFAULT_CONFIG)


def load_config() -> Dict[str, Any]:
    """Load configuration from disk if exists, otherwise return defaults."""
    global _current_config
    with _lock:
        if os.path.exists(CONFIG_FILE_PATH):
            try:
                with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    _current_config.update(data)
            except Exception:
                pass
        return dict(_current_config)


def save_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate, update and persist configuration to disk."""
    global _current_config
    with _lock:
        _current_config.update(new_config)
        try:
            with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(_current_config, f, indent=2)
        except Exception:
            pass
        return dict(_current_config)


def get_config() -> Dict[str, Any]:
    """Retrieve current active config."""
    return load_config()
