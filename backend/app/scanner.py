"""
FastAPI router for image OCR text extraction and DistilBERT model inference.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel
import torch
import easyocr
import io
from PIL import Image
import numpy as np

from app import similarity
from app.services import domain_trust, email_checks, gemini_client, rule_checks, internal_db
from app.services.local_models import load_email_model, load_job_model
from app.services.scan_log import log_scan, resolve_user_id
from app.services.scoring import combine

router = APIRouter(prefix="/scanner", tags=["Scanner"])

# Global placeholder for the lazy-loaded OCR reader (job/email model loaders
# now live in app.services.local_models, shared with app/jobs.py)
_easyocr_reader = None


def get_easyocr_reader():
    """Lazily initialize and return the EasyOCR reader."""
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            # Initialize easyocr reader for English
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize EasyOCR: {str(e)}"
            )
    return _easyocr_reader


class AnalysisRequest(BaseModel):
    text: str


@router.post("/ocr")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Extract text from an uploaded image file using EasyOCR."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image."
        )
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        # Convert PIL image to numpy array for easyocr
        image_np = np.array(image)
        
        reader = get_easyocr_reader()
        results = reader.readtext(image_np)
        
        # Join detected text boxes with spaces
        extracted_text = " ".join([res[1] for res in results])
        return {"text": extracted_text}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error performing OCR text extraction: {str(e)}"
        )


@router.post("/analyze-job")
async def analyze_job(payload: AnalysisRequest, authorization: Optional[str] = Header(None)):
    """Analyze job posting text for fraud using DistilBERT model."""
    text = payload.text
    if not text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")
    
    tokenizer, model = load_job_model()
    
    try:
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        )
        
        with torch.no_grad():
            outputs = model(**inputs)
            
        probs = torch.softmax(outputs.logits, dim=1)
        prediction = torch.argmax(probs, dim=1).item()
        confidence = probs[0][prediction].item()
        
        label = "Fraudulent" if prediction == 1 else "Legitimate"
        
        # Calculate risk score
        if prediction == 1:
            risk_score = int(confidence * 100)
            risk_level = "High Risk" if risk_score >= 75 else "Medium Risk"
        else:
            risk_score = int((1 - confidence) * 100)
            risk_level = "Low Risk"
            
        # Scan for red flags to show as issues
        detected_issues = []
        text_lower = text.lower()
        if "whatsapp" in text_lower or "telegram" in text_lower:
            detected_issues.append("Urgent Social Media Communication")
        if any(kw in text_lower for kw in ["registration fee", "pay ", "fee", "deposit"]):
            detected_issues.append("Advance Payment/Fee Requested")
        if any(kw in text_lower for kw in ["earn", "per week", "weekly", "salary"]):
            detected_issues.append("Unrealistic Earnings Claim")
        if any(kw in text_lower for kw in ["no experience", "freshers welcome", "work from home"]):
            detected_issues.append("Low Barriers to Entry")
        if any(kw in text_lower for kw in ["urgent", "immediate", "asap"]):
            detected_issues.append("Urgent Hiring Pressure")
            
        if prediction == 1 and not detected_issues:
            detected_issues.append("Suspicious Job Description Patterns")
        elif prediction == 0:
            detected_issues = []  # Clear issues for legitimate postings
            
        # Dynamic AI explanation
        if prediction == 1:
            explanation = (
                f"This job posting exhibits suspicious patterns and was flagged as Fraudulent by our "
                f"DistilBERT model with {confidence*100:.2f}% confidence. Key indicators include "
                f"unusual contact methods, unrealistic compensation claims, or high hiring pressure."
            )
        else:
            explanation = (
                f"This job posting appears to be Legitimate (confidence: {confidence*100:.2f}%). "
                f"Our AI analysis did not identify significant high-risk patterns or structural anomalies."
            )
            
        local_result = {
            "prediction": prediction,
            "label": label,
            "confidence": round(confidence * 100, 2),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "detectedIssues": detected_issues,
            "aiExplanation": explanation
        }

        # Gemini logic — Milestone P2-6b folds Modules 2/3/4 into this same
        # paste: any domain/email mentioned gets the full company/recruiter
        # cross-check, not just the bare internal-DB lookup.
        signals = [rule_checks.check_red_flag_phrases(text), rule_checks.check_internship_fee_phrases(text)]
        domain = internal_db.extract_domain(text)
        email = internal_db.extract_email(text)
        email_domain = email.split("@")[-1] if email else None

        if domain:
            db_signal = internal_db.check_domain(domain)
            if db_signal:
                signals.append(db_signal)
            signals.extend(domain_trust.assess_domain(domain))

        if email_domain:
            recruiter_signal = internal_db.check_recruiter_email(email)
            if recruiter_signal:
                signals.append(recruiter_signal)
            claimed = domain if (domain and domain != email_domain) else None
            signals.extend(email_checks.assess_email(email_domain, claimed))

        gemini_summary = ""
        ai_available = True
        posting_type = "job"
        predatory_score = 0.0
        try:
            gemini_signals, gemini_summary, posting_type, predatory_score = gemini_client.analyze_job_posting(text)
            signals.extend(gemini_signals)
        except gemini_client.GeminiUnavailableError:
            ai_available = False

        composite = combine(signals)
        gemini_explanation = gemini_summary or "Assessment based on rule-based checks and internal database records."

        # Milestone P2-6a: distinct verdict for a pay-for-certificate posting,
        # regardless of the overall risk category.
        internship_fee_signal = next((s for s in signals if s.name == "rules:internship_fee_phrases"), None)
        rule_based_predatory = bool(internship_fee_signal and internship_fee_signal.score >= 66.0)
        gemini_predatory = (
            posting_type == "internship" and predatory_score >= gemini_client.PREDATORY_INTERNSHIP_THRESHOLD
        )
        verdict_label = "predatory_internship" if (rule_based_predatory or gemini_predatory) else None

        gemini_result = {
            "riskScore": composite.final_score,
            "riskCategory": composite.category,
            "explanation": gemini_explanation,
            "signalBreakdown": [
                {
                    "name": s.name,
                    "score": s.score,
                    "weight": s.weight,
                    "explanation": s.explanation,
                    "is_override": s.is_override
                }
                for s in composite.breakdown
            ],
            "aiAvailable": ai_available,
            "verdictLabel": verdict_label,
            "postingType": posting_type,
        }

        scan_id = log_scan(
            "job_image",
            text,
            {**gemini_result, "local_model": local_result},
            user_id=resolve_user_id(authorization),
        )

        return {
            "localModel": local_result,
            "gemini": gemini_result,
            "scan_id": scan_id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error: {str(e)}"
        )


@router.post("/analyze-email")
async def analyze_email(payload: AnalysisRequest, authorization: Optional[str] = Header(None)):
    """Analyze email text for phishing using DistilBERT model."""
    text = payload.text
    if not text.strip():
        raise HTTPException(status_code=400, detail="Email content cannot be empty.")
        
    tokenizer, model = load_email_model()
    
    try:
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )
        
        with torch.no_grad():
            outputs = model(**inputs)
            
        probs = torch.softmax(outputs.logits, dim=1)
        prediction = torch.argmax(probs, dim=1).item()
        confidence = probs[0][prediction].item()
        
        label = "Phishing Email" if prediction == 1 else "Legitimate Email"
        
        # Calculate threat level
        if prediction == 1:
            threat_level = "High" if confidence >= 0.75 else "Medium"
            detected = ["Phishing", "Social Engineering"]
            text_lower = text.lower()
            if any(kw in text_lower for kw in ["click", "link", "url", "http"]):
                detected.append("Suspicious Hyperlink")
            if any(kw in text_lower for kw in ["password", "credential", "login", "account"]):
                detected.append("Credential Theft Attempt")
            if any(kw in text_lower for kw in ["urgent", "hurry", "suspended", "expire"]):
                detected.append("Urgency/Threat Tactics")
        else:
            threat_level = "Low"
            detected = []
            
        explanation = (
            f"This message was classified as a {label} with {confidence*100:.2f}% confidence by "
            f"the DistilBERT model."
        )
        
        local_result = {
            "prediction": prediction,
            "label": label,
            "confidence": round(confidence * 100, 2),
            "threatLevel": threat_level,
            "detected": detected,
            "explanation": explanation
        }
        
        # Gemini logic
        gemini_summary = ""
        ai_available = True
        signals = []
        try:
            gemini_signals, gemini_summary = gemini_client.analyze_email_phishing(text)
            signals.extend(gemini_signals)
        except gemini_client.GeminiUnavailableError as gemini_err:
            ai_available = False
            gemini_summary = str(gemini_err)

        if signals:
            composite = combine(signals)
            gemini_result = {
                "riskScore": composite.final_score,
                "riskCategory": composite.category,
                "explanation": gemini_summary,
                "signalBreakdown": [
                    {
                        "name": s.name,
                        "score": s.score,
                        "weight": s.weight,
                        "explanation": s.explanation,
                        "is_override": s.is_override
                    }
                    for s in composite.breakdown
                ],
                "aiAvailable": ai_available
            }
        else:
            gemini_result = {
                "riskScore": 0,
                "riskCategory": "low",
                "explanation": f"Gemini AI was unavailable: {gemini_summary or 'unknown error'}. Result based on DistilBERT model only.",
                "signalBreakdown": [],
                "aiAvailable": False
            }

        scan_id = log_scan(
            "email",
            text,
            {**gemini_result, "local_model": local_result},
            user_id=resolve_user_id(authorization),
        )

        return {
            "localModel": local_result,
            "gemini": gemini_result,
            "scan_id": scan_id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error: {str(e)}"
        )


@router.post("/analyze-similarity")
async def analyze_similarity(payload: AnalysisRequest, authorization: Optional[str] = Header(None)):
    """Legacy route, kept only for backward compatibility — the frontend
    should call POST /similarity/check directly. Delegates entirely to that
    real pgvector search (Milestone P2-4) instead of the old behavior of
    asking Gemini to recall "known scams" from training memory, which just
    hallucinated matches instead of finding real ones."""
    text = payload.text
    if not text.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")

    result = similarity.run_similarity_check(text, user_id=resolve_user_id(authorization))

    return {
        "gemini": {
            "similarityScore": round(result.matches[0].similarity * 100) if result.matches else 0,
            "matchedCases": [
                {"id": m.id, "type": m.category or m.source_table, "similarity": round(m.similarity * 100)}
                for m in result.matches
            ],
            "explanation": result.analysis,
            "aiAvailable": True,
        },
        "matches": [m.model_dump() for m in result.matches],
        "scan_id": result.scan_id,
    }
