'use client';

import { useRef, useState } from 'react';
import { FileUp, UploadCloud, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { analyzeJob, JobAnalyzeResult } from '@/lib/api';
import SignalBreakdown from '@/components/SignalBreakdown';

const CATEGORY_STYLES: Record<string, { label: string; ring: string; text: string; bg: string; icon: typeof ShieldCheck }> = {
  high: { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: ShieldAlert },
  medium: { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  low: { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck },
};

export default function JobScanner() {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<JobAnalyzeResult | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError('');
    try {
      const result = await analyzeJob(jobDescription);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job posting.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelection = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setJobDescription(text.slice(0, 6000));
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const category = results ? CATEGORY_STYLES[results.risk_category] : null;
  const CategoryIcon = category?.icon ?? ShieldCheck;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Fraud Scanner</h1>
        <p className="mb-8 text-slate-600">
          Paste a job posting or upload a file for an instant, explainable risk assessment.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-900">Job Description Input</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  <FileUp className="h-4 w-4" />
                  Upload file
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf"
                className="hidden"
                onChange={(event) => handleFileSelection(event.target.files?.[0])}
              />

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                  isDragging ? 'border-slate-900 bg-slate-50' : 'border-slate-300 bg-slate-50/70'
                }`}
              >
                <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Drag and drop a file here, or click upload.</p>
                <p className="mt-1 text-sm text-slate-500">Supported formats: TXT, PDF, DOCX, and Markdown.</p>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                rows={12}
                className="mt-4 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription.trim()}
                className="mt-4 w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Job'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results && category ? (
              <>
                <div className={`rounded-2xl border p-6 shadow-sm ${category.bg}`}>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Risk Assessment</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32">
                      <svg className="h-32 w-32 -rotate-90 transform">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle
                          cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                          strokeDasharray={`${results.risk_score * 3.52} 352`}
                          className={category.ring}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{Math.round(results.risk_score)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Risk Level</p>
                      <p className={`flex items-center gap-2 text-2xl font-bold ${category.text}`}>
                        <CategoryIcon className="h-6 w-6" />
                        {category.label}
                      </p>
                      {!results.ai_available && (
                        <p className="mt-2 text-xs text-slate-500">AI semantic analysis was unavailable — score reflects rule-based and database signals only.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-lg font-semibold text-slate-900">Explanation</h3>
                  <p className="leading-relaxed text-slate-600">{results.explanation}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Signal Breakdown</h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Each factor below is scored independently and combined into the composite risk score above.
                  </p>
                  <SignalBreakdown signals={results.signal_breakdown} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mb-4 text-6xl">🔍</div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">No Analysis Yet</h3>
                <p className="text-slate-500">Paste a job description and click &quot;Analyze Job&quot; to see the results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
