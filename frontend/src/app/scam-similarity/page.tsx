'use client';

import { useState } from 'react';

export default function ScamSimilarity() {
  const [jobPosting, setJobPosting] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleCompare = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setResults({
        similarityScore: 89,
        matchedCases: [
          { id: 145, type: 'Advance Fee Scam', similarity: 92 },
          { id: 212, type: 'Fake Job Posting', similarity: 87 },
          { id: 341, type: 'Identity Theft', similarity: 85 }
        ]
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Scam Similarity Detection</h1>
        <p className="text-slate-400 mb-8">Compare job postings against known scam patterns</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <label className="block text-sm font-medium text-white mb-3">Paste Job Posting</label>
              <textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="Paste the job posting to compare..."
                rows={10}
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none resize-none mb-4"
              />
              <button
                onClick={handleCompare}
                disabled={isAnalyzing || !jobPosting}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Similarity Score</h3>
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
                        strokeDasharray={`${results.similarityScore * 3.52} 352`}
                        className="text-red-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{results.similarityScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Matched Cases</h3>
                  <div className="space-y-3">
                    {results.matchedCases.map((caseItem: any, index: number) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                        <div>
                          <p className="text-white font-medium">Case #{caseItem.id}</p>
                          <p className="text-sm text-slate-400">{caseItem.type}</p>
                        </div>
                        <span className="text-red-400 font-semibold">{caseItem.similarity}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Comparison Yet</h3>
                <p className="text-slate-400">Paste a job posting and click "Compare" to see similarity results</p>
              </div>
            )}
          </div>
        </div>

        {results && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Similarity Heatmap</h3>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded"
                  style={{
                    backgroundColor: `rgba(239, 68, 68, ${Math.random() * 0.8 + 0.2})`
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>Low Similarity</span>
              <span>High Similarity</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
