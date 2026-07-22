'use client';

import { useState } from 'react';
import { Globe, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { verifyCompany, CompanyVerifyResult } from '@/lib/api';

function checkVisual(score: number) {
  if (score < 30) return { icon: CheckCircle2, className: 'text-emerald-500', label: 'Low risk' };
  if (score < 65) return { icon: AlertTriangle, className: 'text-amber-500', label: 'Caution' };
  return { icon: XCircle, className: 'text-red-500', label: 'High risk' };
}

function formatSignalLabel(name: string) {
  return name.replace(/^[a-z_]+:/, '').replace(/_/g, ' ');
}

export default function WebsiteScanner() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<CompanyVerifyResult | null>(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    setIsScanning(true);
    setError('');
    try {
      const result = await verifyCompany(url);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan website.');
    } finally {
      setIsScanning(false);
    }
  };

  const trustVisual = results ? checkVisual(100 - results.trust_score) : null;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Website Trust Assessment</h1>
        <p className="mb-8 text-slate-600">Scan websites for WHOIS, SSL, header, and typosquatting risk indicators.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-slate-900">Website URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="www.example.com"
                className="mb-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />

              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              <button
                onClick={handleScan}
                disabled={isScanning || !url.trim()}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : 'Scan Website'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Security Report</h3>
                  <div className="divide-y divide-slate-100">
                    {results.signal_breakdown.map((s) => {
                      const visual = checkVisual(s.score);
                      const Icon = visual.icon;
                      return (
                        <div key={s.name} className="flex items-center justify-between gap-4 py-3">
                          <div>
                            <p className="text-sm font-medium capitalize text-slate-700">{formatSignalLabel(s.name)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{s.explanation}</p>
                          </div>
                          <span className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${visual.className}`}>
                            <Icon className="h-4 w-4" />
                            {visual.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Final Trust Score</h3>
                  <div className="relative h-32">
                    <svg className="h-32 w-32 -rotate-90 transform">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                      <circle
                        cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                        strokeDasharray={`${results.trust_score * 3.52} 352`}
                        className={trustVisual?.className ?? 'text-emerald-500'}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{Math.round(results.trust_score)}%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <Globe className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="mb-2 text-xl font-semibold text-slate-900">No Scan Yet</h3>
                <p className="text-slate-500">Enter a website URL and click &quot;Scan Website&quot; to see the security report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
