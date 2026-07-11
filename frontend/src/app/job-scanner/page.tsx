"use client";

import { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";

export default function JobScanner() {
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setResults({
        riskScore: 85,
        riskLevel: "High Risk",
        detectedIssues: [
          "Unrealistic Salary",
          "Advance Fee Request",
          "Urgent Hiring Pressure",
          "Vague Job Description",
          "No Company Information",
        ],
        aiExplanation:
          "This job posting exhibits multiple red flags commonly associated with recruitment scams. The salary offered is significantly above market rates for the position, there are requests for advance payments, and the posting uses urgent language to pressure applicants. The job description lacks specific details about responsibilities and company information, which is atypical for legitimate job postings.",
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleFileSelection = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
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

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">
          Fraud Scanner
        </h1>
        <p className="mb-8 text-slate-600">
          Upload a job posting, paste text, or drag and drop a file for instant
          review.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-900">
                  Job Description Input
                </label>
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
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0])
                }
              />

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                  isDragging
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-300 bg-slate-50/70"
                }`}
              >
                <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop a file here, or click upload.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Supported formats: TXT, PDF, DOCX, and Markdown.
                </p>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                rows={12}
                className="mt-4 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription}
                className="mt-4 w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Job"}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                {/* Risk Score */}
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4">
                    Risk Assessment
                  </h3>
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
                          className={
                            results.riskLevel === "High Risk"
                              ? "text-red-500"
                              : results.riskLevel === "Medium Risk"
                                ? "text-orange-500"
                                : "text-green-500"
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white cyber-text-glow">
                          {results.riskScore}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-cyan-400">Risk Level</p>
                      <p
                        className={`text-2xl font-bold ${results.riskLevel === "High Risk" ? "text-red-400" : results.riskLevel === "Medium Risk" ? "text-orange-400" : "text-green-400"}`}
                      >
                        {results.riskLevel === "High Risk"
                          ? "🔴 High Risk"
                          : results.riskLevel === "Medium Risk"
                            ? "🟡 Medium Risk"
                            : "🟢 Low Risk"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detected Issues */}
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4">
                    Detected Issues
                  </h3>
                  <ul className="space-y-2">
                    {results.detectedIssues.map(
                      (issue: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-4 py-3 cyber-border"
                        >
                          <span className="text-cyan-400">✓</span>
                          <span className="text-white">{issue}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                {/* AI Explanation */}
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4">
                    AI Explanation
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {results.aiExplanation}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-12 text-center cyber-border">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2 cyber-text-glow">
                  No Analysis Yet
                </h3>
                <p className="text-cyan-300">
                  Paste a job description and click "Analyze Job" to see the
                  results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {results && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
              <h3 className="text-lg font-bold text-cyan-300 mb-4">
                Risk Score Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-red-500"
                      style={{ width: "65%" }}
                    ></div>
                  </div>
                  <span className="text-sm text-cyan-400">High Risk</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-orange-500"
                      style={{ width: "25%" }}
                    ></div>
                  </div>
                  <span className="text-sm text-cyan-400">Medium Risk</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-green-500"
                      style={{ width: "10%" }}
                    ></div>
                  </div>
                  <span className="text-sm text-cyan-400">Low Risk</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
              <h3 className="text-lg font-bold text-cyan-300 mb-4">
                Scam Indicators
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Salary Fraud</span>
                  <span className="text-sm font-bold text-red-400">35%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Payment Requests
                  </span>
                  <span className="text-sm font-bold text-orange-400">28%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Urgency Tactics
                  </span>
                  <span className="text-sm font-bold text-yellow-400">22%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Vague Details</span>
                  <span className="text-sm font-bold text-slate-400">15%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 cyber-border">
              <h3 className="text-lg font-bold text-cyan-300 mb-4">
                Fraud Pattern Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-cyan-400 w-16">Jan</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: "40%" }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-cyan-400 w-16">Feb</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: "55%" }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-cyan-400 w-16">Mar</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: "70%" }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-cyan-400 w-16">Apr</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: "85%" }}
                    ></div>
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
