'use client';

import { useState } from 'react';

export default function CompanyVerification() {
  const [website, setWebsite] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setResults({
        trustScore: 92,
        domainAge: 8,
        sslStatus: 'Valid',
        ownership: 'Verified'
      });
      setIsVerifying(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Company Verification</h1>
        <p className="text-slate-400 mb-8">Verify company authenticity and trustworthiness</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <label className="block text-sm font-medium text-white mb-3">Company Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.company.com"
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none mb-4"
              />
              <button
                onClick={handleVerify}
                disabled={isVerifying || !website}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify Company'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Company Trust Score</h3>
                  <div className="relative h-32">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-800"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${results.trustScore * 3.52} 352`}
                        className="text-green-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{results.trustScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Verification Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">Domain Age</span>
                      <span className="font-semibold text-white">{results.domainAge} Years</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">SSL Status</span>
                      <span className={`font-semibold ${results.sslStatus === 'Valid' ? 'text-green-400' : 'text-red-400'}`}>
                        {results.sslStatus === 'Valid' ? '✅ Valid' : '❌ Invalid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">Ownership</span>
                      <span className={`font-semibold ${results.ownership === 'Verified' ? 'text-green-400' : 'text-red-400'}`}>
                        {results.ownership === 'Verified' ? '✅ Verified' : '❌ Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Verification Yet</h3>
                <p className="text-slate-400">Enter company website and click "Verify Company" to see the results</p>
              </div>
            )}
          </div>
        </div>

        {/* Visual Components */}
        {results && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Trust Meter</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 rounded-full bg-slate-800">
                    <div className="h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: `${results.trustScore}%` }}></div>
                  </div>
                  <span className="text-sm font-semibold text-white">{results.trustScore}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Low Trust</span>
                  <span>High Trust</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Domain Age Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-12">0-2yr</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-12">2-5yr</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: '25%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-12">5-10yr</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-12">10yr+</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-green-400" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                  <span className="text-green-400">✅</span>
                  <span className="text-white">Business Registration</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                  <span className="text-green-400">✅</span>
                  <span className="text-white">Contact Information</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-yellow-500/10 px-4 py-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-white">Social Media Presence</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                  <span className="text-green-400">✅</span>
                  <span className="text-white">Physical Address</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
