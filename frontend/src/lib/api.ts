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

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
}

export function verifyCompany(domain: string, name?: string) {
  return postJSON<CompanyVerifyResult>('/companies/verify', { domain, name: name || undefined });
}

// ── Module 2: Recruiter Verification ───────────────────────────────────────

export interface RecruiterVerifyResult {
  email: string;
  trust_rating: number;
  status: TrustStatus;
  signal_breakdown: SignalBreakdownItem[];
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

export async function searchRepository(query: string): Promise<RepositorySearchResult[]> {
  const res = await fetch(`${BACKEND_URL}/repository/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Search failed. Please try again.');
  }
  return data.results as RepositorySearchResult[];
}
