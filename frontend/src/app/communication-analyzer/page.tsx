'use client';

import { useRef, useState } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Cpu, Sparkles, FileUp, UploadCloud } from 'lucide-react';
import SignalBreakdown from '@/components/SignalBreakdown';

const CATEGORY_STYLES: Record<string, { label: string; ring: string; text: string; bg: string; icon: typeof ShieldCheck }> = {
  high: { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  medium: { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  low: { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
  "High Risk": { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  "Medium Risk": { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  "Low Risk": { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
  "High": { label: 'High Risk', ring: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50/50 border-red-200/50', icon: ShieldAlert },
  "Medium": { label: 'Medium Risk', ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50', icon: AlertTriangle },
  "Low": { label: 'Low Risk', ring: 'text-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/50', icon: ShieldCheck },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function CommunicationAnalyzer() {
  const [activeTab, setActiveTab] = useState('email');
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tabs = [
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'sms', label: 'SMS', icon: '📱' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
  ];

  const handleAnalyze = async () => {
    if (!message.trim()) return;
    setIsAnalyzing(true);
    setResults(null);
    try {
      if (activeTab === 'email') {
        const res = await fetch(`${BACKEND_URL}/scanner/analyze-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: message }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to analyze email.");
        }
        const data = await res.json();
        setResults(data);
      } else {
        // Fallback mock results for other channels
        setTimeout(() => {
          setResults({
            localModel: {
              threatLevel: 'High',
              detected: ['Phishing', 'Credential Theft', 'Social Engineering'],
              confidence: 94,
              label: 'Phishing Attempt',
              explanation: 'Mocked local analysis.'
            },
            gemini: {
              riskScore: 90,
              riskCategory: 'High Risk',
              explanation: 'Mocked Gemini analysis for non-email tabs.',
              signalBreakdown: [],
              aiAvailable: true
            }
          });
          setIsAnalyzing(false);
        }, 1000);
        return;
      }
    } catch (error) {
      console.error(error);
      alert("Error: " + (error instanceof Error ? error.message : "Failed to analyze message"));
    } finally {
      if (activeTab === 'email') {
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileSelection = async (file?: File | null) => {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setIsExtractingText(true);
      setMessage("Extracting text from image... please wait.");
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
        setMessage(data.text || "No text could be extracted from this image.");
      } catch (error) {
        console.error(error);
        setMessage("Error: " + (error instanceof Error ? error.message : "OCR text extraction failed."));
      } finally {
        setIsExtractingText(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setMessage(text.slice(0, 6000));
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

  const localCategory = results?.localModel ? CATEGORY_STYLES[results.localModel.threatLevel] : null;
  const LocalCategoryIcon = localCategory?.icon ?? ShieldCheck;

  const geminiCategory = results?.gemini ? CATEGORY_STYLES[results.gemini.riskCategory] : null;
  const GeminiCategoryIcon = geminiCategory?.icon ?? ShieldCheck;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Dual-AI Communication Analyzer</h1>
        <p className="text-slate-600 mb-8">Analyze messages for phishing and scam patterns using combined AI models.</p>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Section (Col Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-900">Message Content</label>
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
                className={`rounded-2xl border-2 border-dashed px-4 py-6 mb-4 text-center transition duration-300 ${
                  isDragging ? 'border-slate-900 bg-slate-100 shadow-inner' : 'border-slate-300 bg-slate-50/50'
                }`}
              >
                <UploadCloud className={`mx-auto mb-3 h-8 w-8 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop an image screenshot or file here.
                </p>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Paste the ${activeTab} message content here...`}
                disabled={isExtractingText}
                rows={10}
                className="w-full rounded-2xl bg-white/80 border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none resize-none shadow-inner transition-all mb-4 disabled:bg-slate-100 disabled:text-slate-400"
              />
              
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !message.trim() || isExtractingText}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtractingText
                  ? "Extracting Text..."
                  : isAnalyzing
                    ? "Running Dual Analysis..."
                    : "Analyze Message"}
              </button>
            </div>
          </div>

          {/* Results Section (Col Span 7) */}
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

                  {results.localModel.detected?.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Local Flags</h3>
                      <ul className="space-y-3">
                        {results.localModel.detected.map((item: string, index: number) => (
                          <li key={index} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-900 shadow-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur-md flex-grow">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Local Summary</h3>
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
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
                <div className="relative mb-6">
                  <div className="absolute -inset-4 rounded-full bg-indigo-100/50 blur-xl animate-pulse"></div>
                  <Sparkles className="relative h-16 w-16 text-indigo-400 drop-shadow-md animate-[bounce_3s_infinite]" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-800 tracking-tight">Awaiting Input</h3>
                <p className="max-w-md text-slate-500">
                  Paste a message or drag an image screenshot to run it through our Dual-AI security analysis pipeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
