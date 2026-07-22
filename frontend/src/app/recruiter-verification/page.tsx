'use client';

import { useState } from 'react';
import { UserRound, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { verifyRecruiter, RecruiterVerifyResult } from '@/lib/api';
import SignalBreakdown from '@/components/SignalBreakdown';

const STATUS_STYLES = {
  verified: { label: 'High Trust', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck },
  suspicious: { label: 'High Risk', text: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: ShieldAlert },
  unverified: { label: 'Moderate Trust', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: ShieldQuestion },
} as const;

export default function RecruiterVerification() {
  const [recruiterName, setRecruiterName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<RecruiterVerifyResult | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');
    try {
      const result = await verifyRecruiter(email, recruiterName || undefined, company || undefined);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify recruiter.');
    } finally {
      setIsVerifying(false);
    }
  };

  const status = results ? STATUS_STYLES[results.status] : null;
  const StatusIcon = status?.icon ?? UserRound;
  const stars = results ? Math.max(1, Math.round(results.trust_rating / 20)) : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Recruiter Verification</h1>
        <p className="mb-8 text-slate-600">Verify recruiter authenticity against company domain and prior records.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Recruiter Name</label>
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="Enter recruiter name"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Claimed Company Domain</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="company.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : null}

                <button
                  onClick={handleVerify}
                  disabled={isVerifying || !email.trim()}
                  className="w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Recruiter'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results && status ? (
              <>
                <div className={`rounded-2xl border p-6 shadow-sm ${status.bg}`}>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Recruiter Trust Rating</h3>
                  <div className="mb-2 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-3xl ${star <= stars ? 'text-amber-400' : 'text-slate-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <p className={`flex items-center gap-2 font-semibold ${status.text}`}>
                    <StatusIcon className="h-5 w-5" />
                    {status.label} — {Math.round(results.trust_rating)}/100
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Signal Breakdown</h3>
                  <SignalBreakdown signals={results.signal_breakdown} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mb-4 text-6xl">👤</div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">No Verification Yet</h3>
                <p className="text-slate-500">Enter recruiter details and click &quot;Verify Recruiter&quot; to see the results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
