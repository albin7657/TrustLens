'use client';

import { useRef, useState } from 'react';
import { FileUp, UploadCloud, AlertTriangle, ShieldCheck, ShieldAlert, Cpu, Sparkles, Link2, Brain } from 'lucide-react';
import SignalBreakdown from '@/components/SignalBreakdown';
import FeedbackStrip from '@/components/FeedbackStrip';
import { analyzeJobByUrl, checkSimilarity, JobAnalyzeResult, JobUrlFetchFailedResult, SimilarityCheckResult } from '@/lib/api';

const CATEGORY_STYLES: Record<string, { label: string; ring: string; text: string; bg: string; icon: typeof ShieldCheck }> = {
  high: { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  medium: { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  low: { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
  "High Risk": { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  "Medium Risk": { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  "Low Risk": { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function JobScanner() {
  const [mode, setMode] = useState<'paste' | 'url'>('paste');

  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jobUrl, setJobUrl] = useState('');
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [urlResult, setUrlResult] = useState<JobAnalyzeResult | JobUrlFetchFailedResult | null>(null);
  const [urlError, setUrlError] = useState('');

  const [similarityResult, setSimilarityResult] = useState<SimilarityCheckResult | null>(null);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [similarityError, setSimilarityError] = useState('');

  const handleAnalyzeUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsAnalyzingUrl(true);
    setUrlResult(null);
    setUrlError('');
    try {
      const result = await analyzeJobByUrl(jobUrl.trim());
      setUrlResult(result);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to analyze this URL.');
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    setIsAnalyzing(true);
    setResults(null);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/scanner/analyze-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: jobDescription }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to analyze job posting.");
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to analyze job");
    } finally {
      setIsAnalyzing(false);
    }

    // Best-effort, runs independently of the main analysis above — a
    // failure here shouldn't hide the primary result.
    setSimilarityResult(null);
    setSimilarityError('');
    setIsCheckingSimilarity(true);
    try {
      const simResult = await checkSimilarity(jobDescription);
      setSimilarityResult(simResult);
    } catch (err) {
      setSimilarityError(err instanceof Error ? err.message : 'Failed to check for similar scams.');
    } finally {
      setIsCheckingSimilarity(false);
    }
  };

  const handleFileSelection = async (file?: File | null) => {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setIsExtractingText(true);
      setJobDescription("Extracting text from image... please wait.");
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${BACKEND_URL}/scanner/ocr`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to extract text from image.");
        }

        const data = await res.json();
        setJobDescription(data.text || "No text could be extracted from this image.");
      } catch (error) {
        console.error(error);
        setJobDescription("Error: " + (error instanceof Error ? error.message : "OCR text extraction failed."));
      } finally {
        setIsExtractingText(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setJobDescription(text.slice(0, 6000));
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const localCategory = results?.localModel ? CATEGORY_STYLES[results.localModel.riskLevel] : null;
  const LocalCategoryIcon = localCategory?.icon ?? ShieldCheck;

  const geminiCategory = results?.gemini ? CATEGORY_STYLES[results.gemini.riskCategory.toLowerCase()] ?? CATEGORY_STYLES[results.gemini.riskCategory] : null;
  const GeminiCategoryIcon = geminiCategory?.icon ?? ShieldCheck;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Dual-AI Fraud Scanner</h1>
        <p className="mb-8 text-slate-600">
          Paste a job posting or upload an image. Analyzed simultaneously by a local DistilBERT model and Google
          Gemini, and checked against previously reported scams.
        </p>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Section (Col Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white/70 p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setMode('paste')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === 'paste' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Paste / Upload
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === 'url' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Analyze by URL
              </button>
            </div>

            {mode === 'url' ? (
              <div key="url-mode" className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
                <label className="mb-3 block text-sm font-semibold text-slate-900">Job Posting URL</label>
                <input
                  type="text"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://company.com/careers/job-123"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Convenience only — major job boards (LinkedIn, Indeed, Naukri, ...) block automated access and will
                  fall back to a domain-only check. Paste the text or upload a screenshot for those.
                </p>

                {urlError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                    {urlError}
                  </div>
                ) : null}

                <button
                  onClick={handleAnalyzeUrl}
                  disabled={isAnalyzingUrl || !jobUrl.trim()}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  {isAnalyzingUrl ? 'Fetching & Analyzing...' : 'Analyze URL'}
                </button>
              </div>
            ) : (
            <div key="paste-mode" className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-900">Job Description Input</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50"
                >
                  <FileUp className="h-4 w-4" />
                  Upload file
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf,.png,.jpg,.jpeg"
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
                className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition duration-300 ${
                  isDragging ? 'border-slate-900 bg-slate-100 shadow-inner' : 'border-slate-300 bg-slate-50/50'
                }`}
              >
                <UploadCloud className={`mx-auto mb-3 h-8 w-8 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop a file here, or click upload.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Supported formats: TXT, PDF, DOCX, Markdown, and Images (PNG, JPG).
                </p>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                disabled={isExtractingText}
                rows={12}
                className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-inner focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 transition-all"
              />

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 backdrop-blur px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription || isExtractingText}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtractingText
                  ? "Extracting Text..."
                  : isAnalyzing
                    ? "Running Dual Analysis..."
                    : "Analyze Job"}
              </button>
            </div>
            )}
          </div>

          {/* Results Section (Col Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            {mode === 'url' ? (
              <UrlResultPanel result={urlResult} isLoading={isAnalyzingUrl} />
            ) : results ? (
              <>
              {results.gemini?.verdictLabel === 'predatory_internship' ? (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-bold text-amber-800">Pay-for-Certificate Scheme Detected</p>
                    <p className="text-sm text-amber-700">
                      This looks like a predatory internship — a fee charged for a certificate with little real
                      work behind it, not a typical scam pattern.
                    </p>
                  </div>
                </div>
              ) : null}
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
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Local AI (DistilBERT)</h3>
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
                          <span className="text-3xl font-black text-slate-900">{results.localModel.confidence.toFixed(2)}%</span>
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

                  {results.localModel.detectedIssues?.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Local Flags</h3>
                      <ul className="space-y-3">
                        {results.localModel.detectedIssues.map((issue: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-900 shadow-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md flex-grow">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Local Summary</h3>
                    <p className="text-sm leading-relaxed text-slate-700">{results.localModel.aiExplanation}</p>
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
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Cloud AI (Gemini)</h3>
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
                            strokeDasharray={`${results.gemini.riskScore * 3.52} 352`}
                            className={geminiCategory?.ring || 'text-slate-500'}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-3xl font-black text-slate-900">{Math.round(results.gemini.riskScore)}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">Risk Score</span>
                        </div>
                      </div>
                      <div>
                        <p className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${geminiCategory?.bg} ${geminiCategory?.text} border shadow-sm`}>
                          <GeminiCategoryIcon className="h-4 w-4" />
                          {geminiCategory?.label || results.gemini.riskCategory}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Semantic Breakdown</h3>
                    {results.gemini.signalBreakdown?.length > 0 ? (
                      <SignalBreakdown signals={results.gemini.signalBreakdown} />
                    ) : (
                      <p className="text-sm text-slate-500 italic">No semantic signals extracted.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md flex-grow">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Cloud Summary</h3>
                    <p className="text-sm leading-relaxed text-slate-700">{results.gemini.explanation}</p>
                  </div>
                </div>

              </div>
              <SimilarityPanel result={similarityResult} isLoading={isCheckingSimilarity} error={similarityError} />
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                <FeedbackStrip scanId={results.scan_id} />
              </div>
              </>
            ) : (
              <div className="flex h-full min-h-100 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
                <div className="relative mb-6">
                  <div className="absolute -inset-4 rounded-full bg-indigo-100/50 blur-xl animate-pulse"></div>
                  <Sparkles className="relative h-16 w-16 text-indigo-400 drop-shadow-md animate-[bounce_3s_infinite]" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-800 tracking-tight">Awaiting Input</h3>
                <p className="max-w-md text-slate-500">
                  Paste a job description or upload an image to run it through our Dual-AI security analysis pipeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UrlResultPanel({
  result,
  isLoading,
}: {
  result: JobAnalyzeResult | JobUrlFetchFailedResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-100 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
        <p className="text-slate-500">Fetching and analyzing the page...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-100 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
        <Link2 className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <h3 className="mb-3 text-2xl font-bold text-slate-800 tracking-tight">Awaiting URL</h3>
        <p className="max-w-md text-slate-500">Paste a job posting URL and click Analyze URL.</p>
      </div>
    );
  }

  if ('fetch_failed' in result) {
    const { domain_analysis } = result;
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-bold text-amber-800">
            {result.reason === 'site_blocks_bots' ? 'This site blocks automated access' : "Couldn't read this page"}
          </h3>
          <p className="text-sm text-amber-700">
            Paste the job posting text, or upload a screenshot, instead — those remain the primary paths. Here&apos;s
            what we could tell from the domain alone:
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{domain_analysis.domain}</h3>
            <span className="text-sm font-medium text-slate-500">
              Trust score: {Math.round(domain_analysis.trust_score)}%
            </span>
          </div>
          <SignalBreakdown signals={domain_analysis.signal_breakdown} />
        </div>
      </div>
    );
  }

  const category = CATEGORY_STYLES[result.risk_category] ?? CATEGORY_STYLES.low;
  const CategoryIcon = category.icon;

  return (
    <div className="space-y-6">
      {result.verdict_label === 'predatory_internship' ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold text-amber-800">Pay-for-Certificate Scheme Detected</p>
            <p className="text-sm text-amber-700">
              This looks like a predatory internship — a fee charged for a certificate with little real work
              behind it.
            </p>
          </div>
        </div>
      ) : null}

      <div className={`rounded-3xl border p-6 shadow-sm ${category.bg}`}>
        <p className={`flex items-center gap-2 text-3xl font-bold ${category.text}`}>
          <CategoryIcon className="h-7 w-7" />
          {Math.round(result.risk_score)} — {category.label}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Explanation</h3>
        <p className="text-sm leading-relaxed text-slate-700">{result.explanation}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Signal Breakdown</h3>
        <SignalBreakdown signals={result.signal_breakdown} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <FeedbackStrip scanId={result.scan_id} />
      </div>
    </div>
  );
}

function SimilarityPanel({
  result,
  isLoading,
  error,
}: {
  result: SimilarityCheckResult | null;
  isLoading: boolean;
  error: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <Brain className="h-4 w-4" />
        Similar Known Scams
      </h3>
      {isLoading ? (
        <p className="text-sm text-slate-500">Checking against known scam reports…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !result || result.matches.length === 0 ? (
        <p className="text-sm italic text-slate-500">No similar cases found in our records.</p>
      ) : (
        <div className="space-y-3">
          {result.matches.map((m) => (
            <div key={`${m.source_table}-${m.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-700">
                  {(m.category || m.source_table).replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-bold text-indigo-600">{Math.round(m.similarity * 100)}% match</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(100, Math.round(m.similarity * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{m.excerpt}</p>
            </div>
          ))}
          {result.analysis ? (
            <p className="text-sm leading-relaxed text-slate-700">{result.analysis}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
