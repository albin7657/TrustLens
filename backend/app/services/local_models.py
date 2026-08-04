"""
Lazy-loaded local DistilBERT models (frozen .safetensors checkpoints).

Shared by app/jobs.py (folds the local model's own verdict into the
weighted composite, alongside Gemini and every other signal) and the
legacy app/scanner.py endpoints (which predate that integration).
"""

import os

import torch
from fastapi import HTTPException
from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast

from app.config import settings

_job_tokenizer: DistilBertTokenizerFast | None = None
_job_model: DistilBertForSequenceClassification | None = None
_email_tokenizer: DistilBertTokenizerFast | None = None
_email_model: DistilBertForSequenceClassification | None = None


def load_job_model():
    """Lazily load and return the fake-job-posting classifier and tokenizer."""
    global _job_tokenizer, _job_model
    if _job_tokenizer is None or _job_model is None:
        model_path = settings.FAKE_JOB_MODEL_PATH
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=500,
                detail=f"Fake Job model path does not exist: {model_path}. Please check backend/.env",
            )
        try:
            _job_tokenizer = DistilBertTokenizerFast.from_pretrained(model_path)
            _job_model = DistilBertForSequenceClassification.from_pretrained(model_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load Fake Job model: {str(e)}")
    return _job_tokenizer, _job_model


def load_email_model():
    """Lazily load and return the phishing-email classifier and tokenizer."""
    global _email_tokenizer, _email_model
    if _email_tokenizer is None or _email_model is None:
        model_path = settings.EMAIL_MODEL_PATH
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=500,
                detail=f"Email model path does not exist: {model_path}. Please check backend/.env",
            )
        try:
            _email_tokenizer = DistilBertTokenizerFast.from_pretrained(model_path)
            _email_model = DistilBertForSequenceClassification.from_pretrained(model_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load Email model: {str(e)}")
    return _email_tokenizer, _email_model


def predict_job_fraud(text: str) -> dict:
    """Run the local DistilBERT job-fraud classifier on raw text.

    Returns {prediction, label, confidence, risk_score, risk_level}.
    risk_score is 0-100, higher = more fraud-risk (same convention as
    every other Signal in the composite scoring engine) — callers can feed
    it directly into a Signal without remapping.
    """
    tokenizer, model = load_job_model()
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    prediction = torch.argmax(probs, dim=1).item()
    confidence = probs[0][prediction].item()
    label = "Fraudulent" if prediction == 1 else "Legitimate"

    if prediction == 1:
        risk_score = int(confidence * 100)
        risk_level = "High Risk" if risk_score >= 75 else "Medium Risk"
    else:
        risk_score = int((1 - confidence) * 100)
        risk_level = "Low Risk"

    return {
        "prediction": prediction,
        "label": label,
        "confidence": round(confidence * 100, 2),
        "risk_score": risk_score,
        "risk_level": risk_level,
    }
