'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Link2, Plus, ShieldAlert, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import {
  CHANNEL_OPTIONS,
  CommunicationAnalyzeResult,
  CommunicationChannel,
  CommunicationMessage,
  SCAM_STAGES,
  analyzeCommunication,
} from '@/lib/api';
import SignalBreakdown from '@/components/SignalBreakdown';
import FeedbackStrip from '@/components/FeedbackStrip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const CATEGORY_STYLES: Record<string, { label: string; text: string; bg: string; icon: typeof ShieldCheck }> = {
  high: { label: 'High Risk', text: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: ShieldAlert },
  medium: { label: 'Medium Risk', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  low: { label: 'Low Risk', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck },
};

const LURE_LABELS: Record<string, string> = {
  registration_fee: 'Registration fee',
  equipment_fee: 'Equipment fee',
  training_deposit: 'Training deposit',
  crypto: 'Crypto payment',
  gift_card: 'Gift card',
  phishing_link: 'Phishing link',
  credential_theft: 'Credential theft',
  none: 'No specific lure detected',
};

let nextId = 1;

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CommunicationAnalyzer() {
  const [channel, setChannel] = useState<CommunicationChannel>('whatsapp');
  const [messages, setMessages] = useState<(CommunicationMessage & { id: number })[]>([
    { id: nextId++, sender: 'them', text: '' },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [results, setResults] = useState<CommunicationAnalyzeResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateMessage = (id: number, patch: Partial<CommunicationMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const addMessage = (sender: 'them' | 'me' = 'them') => {
    setMessages((prev) => [...prev, { id: nextId++, sender, text: '' }]);
  };

  const removeMessage = (id: number) => {
    setMessages((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));
  };

  const handleScreenshot = async (file?: File | null) => {
    if (!file) return;
    setIsExtractingText(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BACKEND_URL}/scanner/ocr`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to extract text from image.');
      }
      addMessage('them');
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return prev.map((m) => (m.id === last.id ? { ...m, text: data.text || '' } : m));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR text extraction failed.');
    } finally {
      setIsExtractingText(false);
    }
  };

  const handleAnalyze = async () => {
    const cleaned = messages.map(({ sender, text }) => ({ sender, text: text.trim() })).filter((m) => m.text);
    if (!cleaned.length) return;

    setIsAnalyzing(true);
    setResults(null);
    setError('');
    try {
      const result = await analyzeCommunication(channel, cleaned);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze this thread.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const category = results ? CATEGORY_STYLES[results.risk_category] : null;
  const CategoryIcon = category?.icon ?? ShieldCheck;
  const stageIndex = results ? SCAM_STAGES.findIndex((s) => s.value === results.scam_stage) : -1;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Communication Analyzer</h1>
        <p className="mb-8 text-slate-600">
          Build out a message thread (or paste a screenshot) and see the scam stage, lure type, and risk score.
        </p>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-slate-900">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
                className="mb-6 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-slate-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">Message thread</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtractingText}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {isExtractingText ? 'Extracting...' : 'Upload screenshot'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleScreenshot(e.target.files?.[0])}
                />
              </div>

              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex overflow-hidden rounded-full border border-slate-300">
                        <button
                          type="button"
                          onClick={() => updateMessage(m.id, { sender: 'them' })}
                          className={`px-3 py-1 text-xs font-medium transition ${
                            m.sender === 'them' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                          }`}
                        >
                          Them
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMessage(m.id, { sender: 'me' })}
                          className={`px-3 py-1 text-xs font-medium transition ${
                            m.sender === 'me' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                          }`}
                        >
                          Me
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMessage(m.id)}
                        disabled={messages.length === 1}
                        className="text-slate-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Remove message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={m.text}
                      onChange={(e) => updateMessage(m.id, { text: e.target.value })}
                      placeholder="Message text..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addMessage()}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add message
              </button>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isExtractingText || !messages.some((m) => m.text.trim())}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Thread'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6">
            {results && category ? (
              <>
                <div className={`rounded-3xl border p-6 shadow-sm ${category.bg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Risk Score</p>
                      <p className={`flex items-center gap-2 text-3xl font-bold ${category.text}`}>
                        <CategoryIcon className="h-7 w-7" />
                        {Math.round(results.risk_score)} — {category.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Lure type</p>
                      <span className="mt-1 inline-block rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-800">
                        {LURE_LABELS[results.lure_type] || results.lure_type}
                      </span>
                    </div>
                  </div>
                  {!results.ai_available && (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      AI semantic analysis was unavailable — score reflects rule-based and database signals only.
                    </p>
                  )}
                </div>

                {/* Stage timeline */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Scam Stage</h3>
                  <div className="flex items-center">
                    {SCAM_STAGES.map((stage, idx) => (
                      <div key={stage.value} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold ${
                              idx === stageIndex
                                ? 'border-red-500 bg-red-500 text-white'
                                : idx < stageIndex
                                  ? 'border-slate-300 bg-slate-200 text-slate-500'
                                  : 'border-slate-200 bg-white text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span
                            className={`max-w-22 text-[11px] font-medium ${
                              idx === stageIndex ? 'text-red-600' : 'text-slate-500'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                        {idx < SCAM_STAGES.length - 1 && (
                          <div className={`mx-1 h-0.5 flex-1 ${idx < stageIndex ? 'bg-slate-300' : 'bg-slate-100'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Explanation</h3>
                  <p className="text-sm leading-relaxed text-slate-700">{results.explanation}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Signal Breakdown</h3>
                  <SignalBreakdown signals={results.signal_breakdown} />
                </div>

                {results.extracted_links.length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                      <Link2 className="h-4 w-4" />
                      Links & Domains Found
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {results.extracted_links.map((link) => (
                        <div key={link.domain} className="flex items-center justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{link.url || link.domain}</p>
                            <p className="text-xs text-slate-500">{link.domain}</p>
                          </div>
                          {link.internal_db_hit ? (
                            <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Flagged: {link.internal_db_hit.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                              No record
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <FeedbackStrip scanId={results.scan_id} />
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-100 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/40 p-12 text-center shadow-lg backdrop-blur-sm">
                <h3 className="mb-3 text-2xl font-bold text-slate-800 tracking-tight">Awaiting Input</h3>
                <p className="max-w-md text-slate-500">
                  Build out the message thread (or upload a screenshot) and click Analyze Thread.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
