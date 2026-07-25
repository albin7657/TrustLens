'use client';

import { useState } from 'react';
import { Building2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { verifyCompany, CompanyVerifyResult } from '@/lib/api';
import SignalBreakdown from '@/components/SignalBreakdown';
import FeedbackStrip from '@/components/FeedbackStrip';

const STATUS_STYLES = {
  verified: { label: 'Verified', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck },
  suspicious: { label: 'Suspicious', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: ShieldAlert },
  unverified: { label: 'Unverified', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: ShieldQuestion },
} as const;

export default function CompanyVerification() {
  const [website, setWebsite] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<CompanyVerifyResult | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');
    try {
      const result = await verifyCompany(website);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify company.');
    } finally {
      setIsVerifying(false);
    }
  };

  const status = results ? STATUS_STYLES[results.status] : null;
  const StatusIcon = status?.icon ?? Building2;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Company Verification</h1>
        <p className="mb-8 text-slate-600">Verify company authenticity using domain, WHOIS, and SSL trust signals.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-slate-900">Company Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.company.com"
                className="mb-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />

              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              <button
                onClick={handleVerify}
                disabled={isVerifying || !website.trim()}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify Company'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results && status ? (
              <>
                <div className={`rounded-2xl border p-6 shadow-sm ${status.bg}`}>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Company Trust Score</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32">
                      <svg className="h-32 w-32 -rotate-90 transform">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle
                          cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                          strokeDasharray={`${results.trust_score * 3.52} 352`}
                          className={status.ring}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{Math.round(results.trust_score)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <p className={`flex items-center gap-2 text-2xl font-bold ${status.text}`}>
                        <StatusIcon className="h-6 w-6" />
                        {status.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{results.domain}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Signal Breakdown</h3>
                  <p className="mb-4 text-xs text-slate-500">
                    WHOIS domain age, SSL certificate validity, security headers, typosquatting risk, and any
                    internal database record — each scored independently and combined into the trust score above.
                  </p>
                  <SignalBreakdown signals={results.signal_breakdown} />
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <FeedbackStrip scanId={results.scan_id} />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mb-4 text-6xl">🏢</div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">No Verification Yet</h3>
                <p className="text-slate-500">Enter a company website and click &quot;Verify Company&quot; to see the results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
