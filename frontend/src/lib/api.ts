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
export type TrustStatus = 'verified' | 'suspicious' | 'unverified';

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
  scan_id?: string | null;
}

export function analyzeJob(description: string, companyName?: string) {
  return postJSON<JobAnalyzeResult>('/jobs/analyze', {
    description,
    company_name: companyName || undefined,
  });
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
