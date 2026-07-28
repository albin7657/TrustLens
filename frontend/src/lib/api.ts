/**
 * Typed client helpers for the Phase 1 detection/verification endpoints.
 * Auth calls stay inline in their own pages/components — untouched here.
 */

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface SignalBreakdownItem {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}

export type RiskCategory = 'low' | 'medium' | 'high';
export type TrustStatus = 'verified' | 'suspicious' | 'unverified' | 'predatory';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Request failed. Please try again.');
  }
  return data as T;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { headers: { ...authHeaders() } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Request failed. Please try again.');
  }
  return data as T;
}

// ── Module 1: Job Fraud Detection ──────────────────────────────────────────

export interface JobAnalyzeResult {
  risk_score: number;
  risk_category: RiskCategory;
  explanation: string;
  signal_breakdown: SignalBreakdownItem[];
  ai_available: boolean;
  verdict_label?: string | null;
  posting_type?: string | null;
  scan_id?: string | null;
}

export function analyzeJob(description: string, companyName?: string) {
  return postJSON<JobAnalyzeResult>('/jobs/analyze', {
    description,
    company_name: companyName || undefined,
  });
}

export interface JobUrlFetchFailedResult {
  fetch_failed: true;
  reason: 'site_blocks_bots' | 'page_unreadable';
  domain_analysis: {
    domain: string;
    trust_score: number;
    risk_category: RiskCategory;
    signal_breakdown: SignalBreakdownItem[];
  };
}

export function analyzeJobByUrl(url: string) {
  return postJSON<JobAnalyzeResult | JobUrlFetchFailedResult>('/jobs/analyze-url', { url });
}

// ── Module 7: Real Scam Similarity ──────────────────────────────────────────

export interface SimilarityMatch {
  source_table: string;
  id: string;
  similarity: number;
  category: string | null;
  excerpt: string;
}

export interface SimilarityCheckResult {
  matches: SimilarityMatch[];
  analysis: string;
  scan_id?: string | null;
}

export function checkSimilarity(text: string) {
  return postJSON<SimilarityCheckResult>('/similarity/check', { text });
}

// ── Modules 3 & 4: Company / Website Trust ─────────────────────────────────

export interface CompanyVerifyResult {
  domain: string;
  trust_score: number;
  status: TrustStatus;
  signal_breakdown: SignalBreakdownItem[];
  scan_id?: string | null;
}

export function verifyCompany(domain: string, name?: string, scanType: 'company' | 'website' = 'company') {
  return postJSON<CompanyVerifyResult>('/companies/verify', {
    domain,
    name: name || undefined,
    scan_type: scanType,
  });
}

// ── Module 2: Recruiter Verification ───────────────────────────────────────

export interface RecruiterVerifyResult {
  email: string;
  trust_rating: number;
  status: TrustStatus;
  signal_breakdown: SignalBreakdownItem[];
  scan_id?: string | null;
}

export function verifyRecruiter(email: string, name?: string, claimedCompanyDomain?: string) {
  return postJSON<RecruiterVerifyResult>('/recruiters/verify', {
    email,
    name: name || undefined,
    claimed_company_domain: claimedCompanyDomain || undefined,
  });
}

// ── Module 6: Trust Intelligence Repository ────────────────────────────────

export interface RepositorySearchResult {
  type: 'company' | 'recruiter' | 'fraud_report' | 'scam_website';
  id: string;
  label: string;
  status?: string | null;
  detail?: string | null;
}

export async function searchRepository(query?: string): Promise<RepositorySearchResult[]> {
  const qs = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const res = await fetch(`${BACKEND_URL}/repository/search${qs}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Search failed. Please try again.');
  }
  return data.results as RepositorySearchResult[];
}

// ── Module 7: Minimal Trust Graph ───────────────────────────────────────────

export type GraphEntityType = 'company' | 'recruiter' | 'domain' | 'report' | 'job_posting' | 'scan';

export interface GraphNode {
  type: GraphEntityType;
  id: string;
  label: string;
  status: string | null;
}

export interface GraphEdgeEndpoint {
  type: GraphEntityType;
  id: string;
}

export interface GraphEdge {
  source: GraphEdgeEndpoint;
  target: GraphEdgeEndpoint;
  relationship: string;
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getGraph(entityType: GraphEntityType, entityId: string, depth: 1 | 2 = 1) {
  return getJSON<GraphResult>(
    `/graph/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?depth=${depth}`
  );
}

// ── Module 8: Community Reporting ──────────────────────────────────────────

export type ReportType =
  | 'recruiter'
  | 'company'
  | 'website'
  | 'job_posting'
  | 'phishing_message'
  | 'predatory_internship';

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'company', label: 'Company' },
  { value: 'website', label: 'Website' },
  { value: 'job_posting', label: 'Job posting' },
  { value: 'phishing_message', label: 'Phishing message' },
  { value: 'predatory_internship', label: 'Predatory internship / certificate mill' },
];

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface ReportItem {
  id: string;
  report_type: ReportType;
  title: string | null;
  target_reference: string;
  description: string;
  status: ReportStatus;
  evidence_paths: string[];
  reporter_id: string | null;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface ReportListResult {
  results: ReportItem[];
  total: number;
}

export interface ReportSubmitResult {
  id: string;
  status: string;
  created_at: string;
}

export function submitReport(input: {
  report_type: ReportType;
  title: string;
  target_reference: string;
  description: string;
}) {
  return postJSON<ReportSubmitResult>('/reports', input);
}

export async function uploadReportEvidence(reportId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BACKEND_URL}/reports/${reportId}/evidence`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Evidence upload failed. Please try again.');
  }
  return data as { id: string; evidence_paths: string[] };
}

export function getMyReports() {
  return getJSON<ReportListResult>('/reports/mine');
}

// ── Scan History + Feedback (Milestone P2-3) ───────────────────────────────

export type ScanType =
  | 'job_text'
  | 'job_url'
  | 'job_image'
  | 'email'
  | 'communication'
  | 'company'
  | 'website'
  | 'recruiter'
  | 'similarity';

export interface ScanHistoryItem {
  id: string;
  scan_type: ScanType;
  input_summary: string;
  input_ref: string | null;
  risk_score: number | null;
  risk_category: string | null;
  signal_breakdown: SignalBreakdownItem[] | null;
  result_payload: Record<string, unknown> | null;
  feedback_accurate: boolean | null;
  feedback_comment: string | null;
  created_at: string;
}

export interface ScanHistoryListResult {
  results: ScanHistoryItem[];
  total: number;
}

export function getHistory(params: { scanType?: ScanType; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.scanType) query.set('scan_type', params.scanType);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  return getJSON<ScanHistoryListResult>(`/history${qs ? `?${qs}` : ''}`);
}

export function submitScanFeedback(scanId: string, accurate: boolean, comment?: string) {
  return postJSON<ScanHistoryItem>(`/history/${scanId}/feedback`, { accurate, comment: comment || undefined });
}

// ── Module 5: Communication Analyzer ────────────────────────────────────────

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'telegram' | 'other';

export const CHANNEL_OPTIONS: { value: CommunicationChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'Other' },
];

export type ScamStage = 'contact' | 'trust_building' | 'urgency' | 'payment_request' | 'credential_theft';

export const SCAM_STAGES: { value: ScamStage; label: string }[] = [
  { value: 'contact', label: 'Contact' },
  { value: 'trust_building', label: 'Trust building' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'payment_request', label: 'Payment request' },
  { value: 'credential_theft', label: 'Credential theft' },
];

export type LureType =
  | 'registration_fee'
  | 'equipment_fee'
  | 'training_deposit'
  | 'crypto'
  | 'gift_card'
  | 'phishing_link'
  | 'credential_theft'
  | 'none';

export interface CommunicationMessage {
  sender: 'them' | 'me';
  text: string;
}

export interface ExtractedLink {
  url: string | null;
  domain: string;
  internal_db_hit: string | null;
}

export interface CommunicationAnalyzeResult {
  risk_score: number;
  risk_category: RiskCategory;
  scam_stage: ScamStage;
  lure_type: LureType;
  explanation: string;
  signal_breakdown: SignalBreakdownItem[];
  extracted_links: ExtractedLink[];
  ai_available: boolean;
  scan_id?: string | null;
}

export function analyzeCommunication(channel: CommunicationChannel, messages: CommunicationMessage[]) {
  return postJSON<CommunicationAnalyzeResult>('/communications/analyze', { channel, messages });
}
