"""
Module 10 — Fraud Reporting Assistant (Milestone P2-9)
Generates structured complaint summaries and official evidence PDF documents from scan_history or fraud_reports.
"""

import io
import datetime
from typing import Optional, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.supabase_client import get_supabase_admin_client
from app.services.gemini_client import generate_fraud_complaint

router = APIRouter(prefix="/reporting", tags=["Reporting Assistant"])


class ReportingGenerateRequest(BaseModel):
    scan_id: Optional[str] = Field(None, description="UUID of scan_history row")
    report_id: Optional[str] = Field(None, description="UUID of fraud_reports row")


def _fetch_record(scan_id: Optional[str], report_id: Optional[str]) -> dict[str, Any]:
    client = get_supabase_admin_client()

    if scan_id:
        res = client.table("scan_history").select("*").eq("id", scan_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Scan history record not found.")
        row = res.data[0]
        return {
            "id": row["id"],
            "type": f"Scan ({row.get('scan_type', 'general')})",
            "target": row.get("input_ref") or row.get("input_summary", "")[:60],
            "risk": f"{row.get('risk_category', 'high').upper()} (Score: {row.get('risk_score', 'N/A')})",
            "summary": row.get("input_summary", ""),
            "details": row.get("signal_breakdown") or [],
            "created_at": row.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        }

    if report_id:
        res = client.table("fraud_reports").select("*").eq("id", report_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Fraud report record not found.")
        row = res.data[0]
        return {
            "id": row["id"],
            "type": f"Community Report ({row.get('report_type', 'general')})",
            "target": row.get("target_reference", "N/A"),
            "risk": f"Status: {row.get('status', 'pending').upper()}",
            "summary": f"{row.get('title', '')}\n{row.get('description', '')}",
            "details": [{"explanation": f"Reported target: {row.get('target_reference')}"}],
            "created_at": row.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        }

    raise HTTPException(status_code=400, detail="Either scan_id or report_id must be provided.")


@router.post("/generate-json")
def generate_complaint_json(req: ReportingGenerateRequest):
    """Generate structured JSON complaint summary for preview."""
    record = _fetch_record(req.scan_id, req.report_id)
    complaint = generate_fraud_complaint(record)
    return {
        "record_id": record["id"],
        "record_type": record["type"],
        "created_at": record["created_at"],
        "target": record["target"],
        "risk_status": record["risk"],
        "complaint": complaint,
    }


def _build_pdf(record: dict, complaint: dict) -> bytes:
    """Build a clean PDF using ReportLab."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="reportlab is required for PDF generation. Please install reportlab."
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15,
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=4,
    )
    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#94A3B8'),
        spaceBefore=15,
    )

    # Header
    story.append(Paragraph("TrustLens — Official Fraud Evidence Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.datetime.now().strftime('%B %d, %Y %H:%M UTC')} | Confidential Evidence Document", subtitle_style))

    # Record Info Table
    info_data = [
        [
            Paragraph("<b>Record ID:</b>", body_style),
            Paragraph(str(record["id"]), body_style),
            Paragraph("<b>Type:</b>", body_style),
            Paragraph(str(record["type"]), body_style),
        ],
        [
            Paragraph("<b>Target Reference:</b>", body_style),
            Paragraph(str(record["target"]), body_style),
            Paragraph("<b>Risk / Status:</b>", body_style),
            Paragraph(str(record["risk"]), body_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[110, 160, 90, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))

    # Executive Summary
    story.append(Paragraph("1. Executive Incident Summary", heading_style))
    summary_text = complaint.get("incident_summary", "No summary available.")
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 8))

    # Entity Details
    story.append(Paragraph("2. Subject / Entity Details", heading_style))
    entities = complaint.get("entity_details", {})
    entity_data = [
        [Paragraph("<b>Claimed Entity Name:</b>", body_style), Paragraph(str(entities.get("entity_name", "N/A")), body_style)],
        [Paragraph("<b>Associated Domain / URL:</b>", body_style), Paragraph(str(entities.get("domain_or_url", "N/A")), body_style)],
        [Paragraph("<b>Contact Details (Email/Phone):</b>", body_style), Paragraph(str(entities.get("contact_email_or_phone", "N/A")), body_style)],
    ]
    entity_table = Table(entity_data, colWidths=[160, 360])
    entity_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(entity_table)
    story.append(Spacer(1, 10))

    # Evidence List
    story.append(Paragraph("3. Detected Evidence & Technical Red Flags", heading_style))
    ev_list = complaint.get("evidence_list", [])
    if not ev_list:
        ev_list = ["Automated analysis flagged risk indicators in submission."]
    for ev in ev_list:
        story.append(Paragraph(f"• {ev}", bullet_style))
    story.append(Spacer(1, 10))

    # Recommended Reporting Channels
    story.append(Paragraph("4. Recommended Reporting Actions", heading_style))
    channels = complaint.get("recommended_channels", [])
    for ch in channels:
        story.append(Paragraph(f"• File formal report at: <b>{ch}</b>", bullet_style))

    # Disclaimer
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "<b>Disclaimer:</b> This document is an automated evidence summary produced by TrustLens AI for fraud reporting support. "
        "It does not constitute legal advice. Users should verify details before submitting to law enforcement authorities.",
        disclaimer_style
    ))

    doc.build(story)
    return buffer.getvalue()


@router.post("/generate")
def generate_complaint_pdf(req: ReportingGenerateRequest):
    """Generate and return a downloadable PDF complaint document."""
    record = _fetch_record(req.scan_id, req.report_id)
    complaint = generate_fraud_complaint(record)
    pdf_bytes = _build_pdf(record, complaint)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="TrustLens_Fraud_Report_{record["id"][:8]}.pdf"'},
    )
