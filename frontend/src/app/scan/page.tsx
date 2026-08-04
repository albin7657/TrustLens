'use client';

import { useState, Suspense } from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import PageHeader from '@/components/PageHeader';
import {
  analyzeJob,
  analyzeJobByUrl,
  verifyRecruiter,
  verifyCompany,
  analyzeCommunication,
  JobAnalyzeResult,
  JobUrlFetchFailedResult,
  RecruiterVerifyResult,
  CompanyVerifyResult,
  CommunicationAnalyzeResult,
  CommunicationChannel,
  CommunicationMessage,
  CHANNEL_OPTIONS,
  SCAM_STAGES,
  submitScanFeedback,
} from '@/lib/api';
import FeedbackStrip from '@/components/FeedbackStrip';
import SignalBreakdown from '@/components/SignalBreakdown';
import { Search, Mail, UserRound, Building2, AlertTriangle, CheckCircle, Upload, Link as LinkIcon, Cpu, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function ScanContent() {
  const { activeTab, switchTab } = useTabFromUrl('job');

  // ── Tab 1: Job posting state ──────────────────────────────────────────────
  const [jobMode, setJobMode] = useState<'text' | 'url' | 'image'>('text');
  const [jobText, setJobText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState('');
  const [jobResult, setJobResult] = useState<JobAnalyzeResult | null>(null);
  const [jobFetchFailed, setJobFetchFailed] = useState<JobUrlFetchFailedResult | null>(null);

  const handleJobScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobLoading(true);
    setJobError('');
    setJobResult(null);
    setJobFetchFailed(null);

    try {
      if (jobMode === 'text') {
        if (!jobText.trim()) return;
        const res = await analyzeJob(jobText, companyName);
        setJobResult(res);
      } else if (jobMode === 'url') {
        if (!jobUrl.trim()) return;
        const res = await analyzeJobByUrl(jobUrl);
        if ('fetch_failed' in res && res.fetch_failed) {
          setJobFetchFailed(res as JobUrlFetchFailedResult);
        } else {
          setJobResult(res as JobAnalyzeResult);
        }
      } else if (jobMode === 'image') {
        if (!jobImage) return;
        const formData = new FormData();
        formData.append('file', jobImage);
        const ocrRes = await fetch(`${BACKEND_URL}/scanner/ocr`, { method: 'POST', body: formData });
        const ocrData = await ocrRes.json();
        if (!ocrRes.ok) throw new Error(ocrData.detail || 'OCR failed');
        const res = await analyzeJob(ocrData.extracted_text, companyName);
        setJobResult(res);
      }
    } catch (err) {
      setJobError(err instanceof Error ? err.message : 'Job analysis failed');
    } finally {
      setJobLoading(false);
    }
  };

  // ── Tab 2: Communication state ────────────────────────────────────────────
  const [commChannel, setCommChannel] = useState<CommunicationChannel>('whatsapp');
  const [commMessages, setCommMessages] = useState<CommunicationMessage[]>([
    { sender: 'them', text: '' },
  ]);
  const [commLoading, setCommLoading] = useState(false);
  const [commError, setCommError] = useState('');
  const [commResult, setCommResult] = useState<CommunicationAnalyzeResult | null>(null);

  const addCommRow = () => {
    setCommMessages([...commMessages, { sender: 'them', text: '' }]);
  };

  const updateCommRow = (index: number, field: 'sender' | 'text', val: string) => {
    const next = [...commMessages];
    next[index] = { ...next[index], [field]: val };
    setCommMessages(next);
  };

  const handleCommOCR = async (file: File) => {
    setCommLoading(true);
    setCommError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BACKEND_URL}/scanner/ocr`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'OCR failed');
      setCommMessages([{ sender: 'them', text: data.extracted_text }]);
    } catch (err) {
      setCommError(err instanceof Error ? err.message : 'OCR failed');
    } finally {
      setCommLoading(false);
    }
  };

  const handleCommScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMsgs = commMessages.filter((m) => m.text.trim().length > 0);
    if (validMsgs.length === 0) return;
    setCommLoading(true);
    setCommError('');
    setCommResult(null);

    try {
      const res = await analyzeCommunication(commChannel, validMsgs);
      setCommResult(res);
    } catch (err) {
      setCommError(err instanceof Error ? err.message : 'Communication analysis failed');
    } finally {
      setCommLoading(false);
    }
  };

  // ── Tab 3: Recruiter state ────────────────────────────────────────────────
  const [recEmail, setRecEmail] = useState('');
  const [recName, setRecName] = useState('');
  const [recCompanyDomain, setRecCompanyDomain] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');
  const [recResult, setRecResult] = useState<RecruiterVerifyResult | null>(null);

  const handleRecScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recEmail.trim()) return;
    setRecLoading(true);
    setRecError('');
    setRecResult(null);

    try {
      const res = await verifyRecruiter(recEmail, recName, recCompanyDomain);
      setRecResult(res);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Recruiter verification failed');
    } finally {
      setRecLoading(false);
    }
  };

  // ── Tab 4: Company / Website state ────────────────────────────────────────
  const [compDomain, setCompDomain] = useState('');
  const [compName, setCompName] = useState('');
  const [compScanType, setCompScanType] = useState<'company' | 'website'>('company');
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState('');
  const [compResult, setCompResult] = useState<CompanyVerifyResult | null>(null);

  const handleCompScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compDomain.trim()) return;
    setCompLoading(true);
    setCompError('');
    setCompResult(null);

    try {
      const res = await verifyCompany(compDomain, compName, compScanType);
      setCompResult(res);
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Company verification failed');
    } finally {
      setCompLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Scan Center"
          description="Multi-modal scam detection engine across job postings, messages, recruiters, and companies."
        />

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {[
            { id: 'job', label: 'Job Posting', icon: Search },
            { id: 'message', label: 'Message / Email', icon: Mail },
            { id: 'recruiter', label: 'Recruiter', icon: UserRound },
            { id: 'company', label: 'Company / Website', icon: Building2 },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Job Posting */}
        {activeTab === 'job' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => setJobMode('text')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${jobMode === 'text' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  Text Paste
                </button>
                <button
                  onClick={() => setJobMode('url')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${jobMode === 'url' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  URL Link
                </button>
                <button
                  onClick={() => setJobMode('image')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${jobMode === 'image' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  Screenshot OCR
                </button>
              </div>

              <form onSubmit={handleJobScan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Company Name (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>

                {jobMode === 'text' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Job Description Text</label>
                    <textarea
                      rows={6}
                      value={jobText}
                      onChange={(e) => setJobText(e.target.value)}
                      placeholder="Paste full job description, email offer, or advertisement text..."
                      className="w-full rounded-xl border border-slate-300 p-4 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                )}

                {jobMode === 'url' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Job Posting URL</label>
                    <input
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://example.com/careers/job-123"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                )}

                {jobMode === 'image' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Upload Screenshot</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={jobLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {jobLoading ? 'Analyzing...' : 'Scan Job Posting'}
                </button>
              </form>
            </div>

            {jobError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{jobError}</div>
            )}

            {jobFetchFailed && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-amber-900 font-semibold text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Site Access Restricted ({jobFetchFailed.reason === 'site_blocks_bots' ? 'Known Bot Shield' : 'Page Unreadable'})
                </div>
                <p className="text-sm text-amber-800">
                  This job board blocks automated scrapers. Please <b>paste the text</b> directly or <b>upload a screenshot</b> above.
                </p>
                <div className="rounded-xl bg-white p-4 border border-amber-200 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Domain Security Assessment</p>
                  <p className="text-sm font-semibold text-slate-800">Domain: {jobFetchFailed.domain_analysis.domain}</p>
                  <p className="text-sm text-slate-600">Trust Score: {jobFetchFailed.domain_analysis.trust_score} / 100 ({jobFetchFailed.domain_analysis.risk_category})</p>
                </div>
              </div>
            )}

            {jobResult && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Risk Assessment</span>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Score: {jobResult.risk_score} / 100
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    {jobResult.verdict_label === 'predatory_internship' && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                        ⚠️ Pay-for-Certificate Scheme
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      jobResult.risk_category === 'high' ? 'bg-red-100 text-red-700' :
                      jobResult.risk_category === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {jobResult.risk_category} Risk
                    </span>
                  </div>
                </div>

                {/* Two models ran independently on this posting — shown side by side so
                    it's clear the local classifier isn't just decorative, it's a real
                    contributing signal (see local_model:distilbert in the breakdown below). */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <Cpu className="h-4 w-4" />
                      Local AI Model (DistilBERT)
                    </div>
                    {jobResult.local_model ? (
                      <>
                        <p className="text-lg font-bold text-slate-900">{jobResult.local_model.label}</p>
                        <p className="text-sm text-slate-600">
                          {jobResult.local_model.confidence}% confidence · {jobResult.local_model.risk_level}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm italic text-slate-500">Unavailable for this scan.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <Sparkles className="h-4 w-4" />
                      Cloud AI (Gemini)
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {jobResult.ai_available ? 'Analyzed' : 'Unavailable'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {jobResult.ai_available
                        ? `${jobResult.signal_breakdown.filter((s) => s.name.startsWith('gemini:')).length} semantic signals scored`
                        : 'Falling back to rule-based + database signals only'}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{jobResult.explanation}</p>
                <SignalBreakdown signals={jobResult.signal_breakdown} />
                {jobResult.scan_id && <FeedbackStrip scanId={jobResult.scan_id} />}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Message / Email */}
        {activeTab === 'message' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Communication Channel</label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value as CommunicationChannel)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Or Upload Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCommOCR(e.target.files[0]);
                    }}
                    className="text-xs text-slate-500 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                  />
                </div>
              </div>

              <form onSubmit={handleCommScan} className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Message Thread</label>
                  {commMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-3">
                      <select
                        value={msg.sender}
                        onChange={(e) => updateCommRow(idx, 'sender', e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold bg-slate-50 text-slate-700"
                      >
                        <option value="them">Them (Sender)</option>
                        <option value="me">Me (Receiver)</option>
                      </select>
                      <input
                        type="text"
                        value={msg.text}
                        onChange={(e) => updateCommRow(idx, 'text', e.target.value)}
                        placeholder="e.g. Congratulations! Pay registration fee to start..."
                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCommRow}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Add Message Row
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={commLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {commLoading ? 'Analyzing Thread...' : 'Analyze Communication'}
                </button>
              </form>
            </div>

            {commError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{commError}</div>
            )}

            {commResult && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Communication Analysis</span>
                    <h2 className="text-2xl font-bold text-slate-900">Score: {commResult.risk_score} / 100</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-xs font-bold uppercase">
                      Lure: {commResult.lure_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      commResult.risk_category === 'high' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {commResult.risk_category} Risk
                    </span>
                  </div>
                </div>

                {/* Stage progression timeline */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Detected Scam Stage Timeline</p>
                  <div className="flex flex-wrap gap-2">
                    {SCAM_STAGES.map((st) => {
                      const isCurrent = commResult.scam_stage === st.value;
                      return (
                        <div
                          key={st.value}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            isCurrent ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {commResult.extracted_links.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Extracted Domain / Link Checks</p>
                    <div className="space-y-2">
                      {commResult.extracted_links.map((link, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2 rounded-lg">
                          <span>{link.domain}</span>
                          <span className={link.internal_db_hit ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                            {link.internal_db_hit ? `🚩 Hit: ${link.internal_db_hit}` : 'Clean'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-700 leading-relaxed">{commResult.explanation}</p>
                <SignalBreakdown signals={commResult.signal_breakdown} />
                {commResult.scan_id && <FeedbackStrip scanId={commResult.scan_id} />}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recruiter */}
        {activeTab === 'recruiter' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleRecScan} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Recruiter Email *</label>
                    <input
                      type="email"
                      required
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Recruiter Name (Optional)</label>
                    <input
                      type="text"
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Claimed Company Domain (Optional)</label>
                  <input
                    type="text"
                    value={recCompanyDomain}
                    onChange={(e) => setRecCompanyDomain(e.target.value)}
                    placeholder="company.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {recLoading ? 'Verifying...' : 'Verify Recruiter'}
                </button>
              </form>
            </div>

            {recError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{recError}</div>
            )}

            {recResult && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Recruiter Verification</span>
                    <h2 className="text-2xl font-bold text-slate-900">Trust Rating: {recResult.trust_rating} / 100</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    recResult.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    recResult.status === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {recResult.status}
                  </span>
                </div>

                <SignalBreakdown signals={recResult.signal_breakdown} />
                {recResult.scan_id && <FeedbackStrip scanId={recResult.scan_id} />}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Company / Website */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleCompScan} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Domain Name *</label>
                    <input
                      type="text"
                      required
                      value={compDomain}
                      onChange={(e) => setCompDomain(e.target.value)}
                      placeholder="example.com"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Company / Site Name (Optional)</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="Example Inc"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={compLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {compLoading ? 'Verifying...' : 'Verify Entity'}
                </button>
              </form>
            </div>

            {compError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{compError}</div>
            )}

            {compResult && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Entity Trust Score</span>
                    <h2 className="text-2xl font-bold text-slate-900">Score: {compResult.trust_score} / 100</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    compResult.status === 'predatory' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    compResult.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    compResult.status === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {compResult.status === 'predatory' ? '⚠️ Predatory Certificate Mill' : compResult.status}
                  </span>
                </div>

                {compResult.status === 'predatory' && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 font-medium">
                    ⚠️ <b>Community Warning:</b> This company is registered as a pay-for-certificate provider. Community reports indicate participants are charged fees for certificates with minimal educational value.
                  </div>
                )}

                <SignalBreakdown signals={compResult.signal_breakdown} />
                {compResult.scan_id && <FeedbackStrip scanId={compResult.scan_id} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading Scan Center...</div>}>
      <ScanContent />
    </Suspense>
  );
}
