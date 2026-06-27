'use client';

import { useState } from 'react';

export default function WebsiteScanner() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setResults({
        ssl: '✅',
        whois: '✅',
        securityHeaders: '⚠️',
        typosquatting: '❌',
        brandRisk: '⚠️',
        trustScore: 78
      });
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Website Trust Assessment</h1>
        <p className="text-slate-400 mb-8">Scan websites for security threats and trust indicators</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <label className="block text-sm font-medium text-white mb-3">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com"
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none mb-4"
              />
              <button
                onClick={handleScan}
                disabled={isScanning || !url}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? 'Scanning...' : 'Scan Website'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Security Report</h3>
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-slate-300">SSL</td>
                        <td className="py-3 text-right text-green-400">{results.ssl} Valid</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-slate-300">WHOIS</td>
                        <td className="py-3 text-right text-green-400">{results.whois} Verified</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-slate-300">Security Headers</td>
                        <td className="py-3 text-right text-yellow-400">{results.securityHeaders} Partial</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-slate-300">Typosquatting</td>
                        <td className="py-3 text-right text-green-400">{results.typosquatting} Clean</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-300">Brand Risk</td>
                        <td className="py-3 text-right text-yellow-400">{results.brandRisk} Low Risk</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Final Trust Score</h3>
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
                        className="text-yellow-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{results.trustScore}%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">🌐</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Scan Yet</h3>
                <p className="text-slate-400">Enter a website URL and click "Scan Website" to see the security report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
