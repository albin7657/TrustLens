'use client';

import { useState } from 'react';

export default function JobScanner() {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setResults({
        riskScore: 85,
        riskLevel: 'High Risk',
        detectedIssues: [
          'Unrealistic Salary',
          'Advance Fee Request',
          'Urgent Hiring Pressure',
          'Vague Job Description',
          'No Company Information'
        ],
        aiExplanation: 'This job posting exhibits multiple red flags commonly associated with recruitment scams. The salary offered is significantly above market rates for the position, there are requests for advance payments, and the posting uses urgent language to pressure applicants. The job description lacks specific details about responsibilities and company information, which is atypical for legitimate job postings.'
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Job Fraud Detection</h1>
        <p className="text-slate-400 mb-8">Analyze job descriptions for potential fraud indicators</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <label className="block text-sm font-medium text-white mb-3">
                Paste Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                rows={12}
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription}
                className="mt-4 w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Job'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                {/* Risk Score */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Risk Assessment</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32">
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
                          strokeDasharray={`${results.riskScore * 3.52} 352`}
                          className={results.riskLevel === 'High Risk' ? 'text-red-500' : results.riskLevel === 'Medium Risk' ? 'text-orange-500' : 'text-green-500'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{results.riskScore}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Risk Level</p>
                      <p className={`text-2xl font-bold ${results.riskLevel === 'High Risk' ? 'text-red-400' : results.riskLevel === 'Medium Risk' ? 'text-orange-400' : 'text-green-400'}`}>
                        {results.riskLevel === 'High Risk' ? '🔴 High Risk' : results.riskLevel === 'Medium Risk' ? '🟡 Medium Risk' : '🟢 Low Risk'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detected Issues */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Detected Issues</h3>
                  <ul className="space-y-2">
                    {results.detectedIssues.map((issue: string, index: number) => (
                      <li key={index} className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-4 py-3">
                        <span className="text-red-400">✓</span>
                        <span className="text-white">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Explanation */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Explanation</h3>
                  <p className="text-slate-300 leading-relaxed">{results.aiExplanation}</p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                <p className="text-slate-400">Paste a job description and click "Analyze Job" to see the results</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {results && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Risk Score Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div className="h-3 rounded-full bg-red-500" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-sm text-slate-400">High Risk</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div className="h-3 rounded-full bg-orange-500" style={{ width: '25%' }}></div>
                  </div>
                  <span className="text-sm text-slate-400">Medium Risk</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div className="h-3 rounded-full bg-green-500" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-sm text-slate-400">Low Risk</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Scam Indicators</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Salary Fraud</span>
                  <span className="text-sm font-semibold text-red-400">35%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Payment Requests</span>
                  <span className="text-sm font-semibold text-orange-400">28%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Urgency Tactics</span>
                  <span className="text-sm font-semibold text-yellow-400">22%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Vague Details</span>
                  <span className="text-sm font-semibold text-slate-400">15%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fraud Pattern Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-16">Jan</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-16">Feb</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '55%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-16">Mar</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-16">Apr</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
