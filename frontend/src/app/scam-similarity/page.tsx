'use client';

import { useState } from 'react';
import { Cpu, Sparkles, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

const CATEGORY_STYLES: Record<string, { label: string; ring: string; text: string; bg: string; icon: typeof ShieldCheck }> = {
  high: { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  medium: { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  low: { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
  "High Risk": { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  "Medium Risk": { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  "Low Risk": { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ScamSimilarity() {
  const [jobPosting, setJobPosting] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!jobPosting.trim()) return;
    setIsAnalyzing(true);
    setResults(null);
    setError('');
    
    try {
      const res = await fetch(`${BACKEND_URL}/scanner/analyze-similarity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: jobPosting }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to analyze similarity.");
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to analyze similarity");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const localCategory = results?.localModel ? CATEGORY_STYLES[results.localModel.riskLevel] : null;
  const LocalCategoryIcon = localCategory?.icon ?? ShieldCheck;

  // For Gemini similarity, if it's high similarity (> 75) it's High Risk, else Low/Medium.
  const geminiScore = results?.gemini?.similarityScore || 0;
  let geminiCatKey = "Low Risk";
  if (geminiScore >= 75) geminiCatKey = "High Risk";
  else if (geminiScore >= 40) geminiCatKey = "Medium Risk";
  
  const geminiCategory = CATEGORY_STYLES[geminiCatKey];
  const GeminiCategoryIcon = geminiCategory?.icon ?? ShieldCheck;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Dual-AI Scam Similarity</h1>
        <p className="text-slate-600 mb-8">Compare input text against structural fraud indicators and historical scam campaigns.</p>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
              <label className="block text-sm font-semibold text-slate-900 mb-3">Paste Text to Compare</label>
              <textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="Paste the job posting, email, or message to compare against known patterns..."
                rows={12}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-inner focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all mb-4"
              />
              
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 backdrop-blur px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={handleCompare}
                disabled={isAnalyzing || !jobPosting.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? 'Running Dual Analysis...' : 'Compare Patterns'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6">
            {results ? (
              <div className="grid gap-6 md:grid-cols-2 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animation: 'fadeIn 0.6s ease-out forwards' }}>
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                
                {/* Local DistilBERT Model Panel */}
                <div className="flex flex-col space-y-6">
                  <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md transition-all ${localCategory?.bg || 'bg-white'}`}>
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Cpu className="h-32 w-32" />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Cpu className="h-5 w-5 text-slate-700" />
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Local AI (Structure)</h3>
                    </div>
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative h-32 w-32 flex-shrink-0">
                        <svg className="h-32 w-32 -rotate-90 transform">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200/50" />
                          <circle
                            cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={`${results.localModel.confidence * 3.52} 352`}
                            className={localCategory?.ring || 'text-slate-500'}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-3xl font-black text-slate-900">{Math.round(results.localModel.confidence)}%</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">Confidence</span>
                        </div>
                      </div>
                      <div>
                        <p className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${localCategory?.bg} ${localCategory?.text} border shadow-sm`}>
                          <LocalCategoryIcon className="h-4 w-4" />
                          {results.localModel.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md flex-grow">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Structural Summary</h3>
                    <p className="text-sm leading-relaxed text-slate-700">{results.localModel.explanation}</p>
                  </div>
                </div>

                {/* Gemini AI Panel */}
                <div className="flex flex-col space-y-6">
                  <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md transition-all ${geminiCategory?.bg || 'bg-white'}`}>
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Sparkles className="h-32 w-32" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Cloud AI (Semantics)</h3>
                      </div>
                      {!results.gemini.aiAvailable && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 border">Offline</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative h-32 w-32 flex-shrink-0">
                        <svg className="h-32 w-32 -rotate-90 transform">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200/50" />
                          <circle
                            cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={`${results.gemini.similarityScore * 3.52} 352`}
                            className={geminiCategory?.ring || 'text-slate-500'}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-3xl font-black text-slate-900">{Math.round(results.gemini.similarityScore)}%</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">Similarity</span>
                        </div>
                      </div>
                      <div>
                        <p className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${geminiCategory?.bg} ${geminiCategory?.text} border shadow-sm`}>
                          <GeminiCategoryIcon className="h-4 w-4" />
                          {geminiScore >= 75 ? 'Strong Match' : geminiScore >= 40 ? 'Partial Match' : 'No Clear Match'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Matched Campaigns</h3>
                    {results.gemini.matchedCases?.length > 0 ? (
                      <div className="space-y-3">
                        {results.gemini.matchedCases.map((caseItem: any, index: number) => (
                          <div key={index} className="flex items-center justify-between rounded-xl bg-slate-50/50 border px-4 py-3 shadow-sm">
                            <div>
                              <p className="text-slate-900 font-medium text-sm">Case #{caseItem.id}</p>
                              <p className="text-xs text-slate-500">{caseItem.type}</p>
                            </div>
                            <span className="text-indigo-600 font-bold text-sm">{caseItem.similarity}% Match</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No historical matches found.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md flex-grow">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Campaign Summary</h3>
                    <p className="text-sm leading-relaxed text-slate-700">{results.gemini.explanation}</p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
                <div className="relative mb-6">
                  <div className="absolute -inset-4 rounded-full bg-indigo-100/50 blur-xl animate-pulse"></div>
                  <Sparkles className="relative h-16 w-16 text-indigo-400 drop-shadow-md animate-[bounce_3s_infinite]" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-800 tracking-tight">Awaiting Input</h3>
                <p className="max-w-md text-slate-500">
                  Paste content to run it through our Dual-AI similarity detection engine.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
