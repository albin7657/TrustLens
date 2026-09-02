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

// Dark-theme shared classes
const CARD = 'rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl';
const INPUT = 'w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20';
const LABEL = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';
const BTN_PRIMARY = 'rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'rounded-xl bg-slate-800/80 border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50';

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
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Scan Center"
          description="Multi-modal scam detection engine across job postings, messages, recruiters, and companies."
        />

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1.5 shadow-xl backdrop-blur-xl">
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
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
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
            <div className={CARD + ' p-6'}>
              <div className="mb-4 flex items-center gap-2">
                {(['text', 'url', 'image'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setJobMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      jobMode === mode
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'text' ? 'Text Paste' : mode === 'url' ? 'URL Link' : 'Screenshot OCR'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleJobScan} className="space-y-4">
                <div>
                  <label className={LABEL}>Company Name (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className={INPUT}
                  />
                </div>

                {jobMode === 'text' && (
                  <div>
                    <label className={LABEL}>Job Description Text</label>
                    <textarea
                      rows={6}
                      value={jobText}
                      onChange={(e) => setJobText(e.target.value)}
                      placeholder="Paste full job description, email offer, or advertisement text..."
                      className={INPUT + ' p-4'}
                    />
                  </div>
                )}

                {jobMode === 'url' && (
                  <div>
                    <label className={LABEL}>Job Posting URL</label>
                    <input
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://example.com/careers/job-123"
                      className={INPUT}
                    />
                  </div>
                )}

                {jobMode === 'image' && (
                  <div>
                    <label className={LABEL}>Upload Screenshot</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
                    />
                  </div>
                )}

                <button type="submit" disabled={jobLoading} className={BTN_PRIMARY}>
                  {jobLoading ? 'Analyzing...' : 'Scan Job Posting'}
                </button>
              </form>
            </div>

            {jobError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{jobError}</div>
            )}

            {jobFetchFailed && (
              <div className="rounded-2xl border border-amber-800/60 bg-amber-950/40 p-6 space-y-4">
                <div className="flex items-center gap-3 text-amber-300 font-semibold text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Site Access Restricted ({jobFetchFailed.reason === 'site_blocks_bots' ? 'Known Bot Shield' : 'Page Unreadable'})
                </div>
                <p className="text-sm text-amber-200/80">
                  This job board blocks automated scrapers. Please <b>paste the text</b> directly or <b>upload a screenshot</b> above.
                </p>
                <div className="rounded-xl border border-amber-800/50 bg-slate-900/60 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Domain Security Assessment</p>
                  <p className="text-sm font-semibold text-slate-200">Domain: {jobFetchFailed.domain_analysis.domain}</p>
                  <p className="text-sm text-slate-400">Trust Score: {jobFetchFailed.domain_analysis.trust_score} / 100 ({jobFetchFailed.domain_analysis.risk_category})</p>
                </div>
              </div>
            )}

            {jobResult && (
              <div className={CARD + ' p-6 space-y-6'}>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">Risk Assessment</span>
                    <h2 className="text-2xl font-bold text-white">Score: {jobResult.risk_score} / 100</h2>
                  </div>
                  <div className="flex gap-2">
                    {jobResult.verdict_label === 'predatory_internship' && (
                      <span className="rounded-full bg-amber-950/70 border border-amber-800/60 px-3 py-1 text-xs font-bold text-amber-300">
                        ⚠️ Pay-for-Certificate Scheme
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      jobResult.risk_category === 'high' ? 'bg-red-950/70 text-red-300 border border-red-800/60' :
                      jobResult.risk_category === 'medium' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60' :
                      'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                    }`}>
                      {jobResult.risk_category} Risk
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <Cpu className="h-4 w-4" />
                      Local AI Model (DistilBERT)
                    </div>
                    {jobResult.local_model ? (
                      <>
                        <p className="text-lg font-bold text-white">{jobResult.local_model.label}</p>
                        <p className="text-sm text-slate-400">
                          {jobResult.local_model.confidence}% confidence · {jobResult.local_model.risk_level}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm italic text-slate-500">Unavailable for this scan.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <Sparkles className="h-4 w-4" />
                      Cloud AI (Gemini)
                    </div>
                    <p className="text-lg font-bold text-white">
                      {jobResult.ai_available ? 'Analyzed' : 'Unavailable'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {jobResult.ai_available
                        ? `${jobResult.signal_breakdown.filter((s) => s.name.startsWith('gemini:')).length} semantic signals scored`
                        : 'Falling back to rule-based + database signals only'}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{jobResult.explanation}</p>
                <SignalBreakdown signals={jobResult.signal_breakdown} />
                {jobResult.scan_id && <FeedbackStrip scanId={jobResult.scan_id} />}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Message / Email */}
        {activeTab === 'message' && (
          <div className="space-y-6">
            <div className={CARD + ' p-6 space-y-4'}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <label className={LABEL}>Communication Channel</label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value as CommunicationChannel)}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL}>Or Upload Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCommOCR(e.target.files[0]);
                    }}
                    className="text-xs text-slate-400 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200"
                  />
                </div>
              </div>

              <form onSubmit={handleCommScan} className="space-y-4">
                <div className="space-y-3">
                  <label className={LABEL}>Message Thread</label>
                  {commMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-3">
                      <select
                        value={msg.sender}
                        onChange={(e) => updateCommRow(idx, 'sender', e.target.value)}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="them">Them (Sender)</option>
                        <option value="me">Me (Receiver)</option>
                      </select>
                      <input
                        type="text"
                        value={msg.text}
                        onChange={(e) => updateCommRow(idx, 'text', e.target.value)}
                        placeholder="e.g. Congratulations! Pay registration fee to start..."
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCommRow}
                    className="text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    + Add Message Row
                  </button>
                </div>

                <button type="submit" disabled={commLoading} className={BTN_PRIMARY}>
                  {commLoading ? 'Analyzing Thread...' : 'Analyze Communication'}
                </button>
              </form>
            </div>

            {commError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{commError}</div>
            )}

            {commResult && (
              <div className={CARD + ' p-6 space-y-6'}>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">Communication Analysis</span>
                    <h2 className="text-2xl font-bold text-white">Score: {commResult.risk_score} / 100</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 px-3 py-1 text-xs font-bold uppercase">
                      Lure: {commResult.lure_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      commResult.risk_category === 'high'
                        ? 'bg-red-950/70 text-red-300 border border-red-800/60'
                        : commResult.risk_category === 'medium'
                        ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                        : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                    }`}>
                      {commResult.risk_category} Risk
                    </span>
                  </div>
                </div>

                {/* Stage progression timeline */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Detected Scam Stage Timeline</p>
                  <div className="flex flex-wrap gap-2">
                    {SCAM_STAGES.map((st) => {
                      const isCurrent = commResult.scam_stage === st.value;
                      return (
                        <div
                          key={st.value}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            isCurrent ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-500/40' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {commResult.extracted_links.length > 0 && (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Extracted Domain / Link Checks</p>
                    <div className="space-y-2">
                      {commResult.extracted_links.map((link, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-mono bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                          <span className="text-slate-300 truncate max-w-[55%]">{link.domain}</span>
                          <span className={link.internal_db_hit ? 'text-red-400 font-semibold bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-900/80 border border-slate-700/60 px-2 py-0.5 rounded text-[11px]'}>
                            {link.internal_db_hit ? `🚩 Blacklisted in DB: ${link.internal_db_hit}` : 'Unlisted in Local DB (Unverified)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-300 leading-relaxed">{commResult.explanation}</p>
                <SignalBreakdown signals={commResult.signal_breakdown} />
                {commResult.scan_id && <FeedbackStrip scanId={commResult.scan_id} />}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recruiter */}
        {activeTab === 'recruiter' && (
          <div className="space-y-6">
            <div className={CARD + ' p-6'}>
              <form onSubmit={handleRecScan} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Recruiter Email *</label>
                    <input
                      type="email"
                      required
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Recruiter Name (Optional)</label>
                    <input
                      type="text"
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="John Doe"
                      className={INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Claimed Company Domain (Optional)</label>
                  <input
                    type="text"
                    value={recCompanyDomain}
                    onChange={(e) => setRecCompanyDomain(e.target.value)}
                    placeholder="company.com"
                    className={INPUT}
                  />
                </div>

                <button type="submit" disabled={recLoading} className={BTN_PRIMARY}>
                  {recLoading ? 'Verifying...' : 'Verify Recruiter'}
                </button>
              </form>
            </div>

            {recError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{recError}</div>
            )}

            {recResult && (
              <div className={CARD + ' p-6 space-y-6'}>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">Recruiter Verification</span>
                    <h2 className="text-2xl font-bold text-white">Trust Rating: {recResult.trust_rating} / 100</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    recResult.status === 'verified' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60' :
                    recResult.status === 'suspicious' ? 'bg-red-950/70 text-red-300 border border-red-800/60' :
                    'bg-amber-950/70 text-amber-300 border border-amber-800/60'
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
            <div className={CARD + ' p-6'}>
              <form onSubmit={handleCompScan} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Domain Name *</label>
                    <input
                      type="text"
                      required
                      value={compDomain}
                      onChange={(e) => setCompDomain(e.target.value)}
                      placeholder="example.com"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Company / Site Name (Optional)</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="Example Inc"
                      className={INPUT}
                    />
                  </div>
                </div>

                <button type="submit" disabled={compLoading} className={BTN_PRIMARY}>
                  {compLoading ? 'Verifying...' : 'Verify Entity'}
                </button>
              </form>
            </div>

            {compError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{compError}</div>
            )}

            {compResult && (
              <div className={CARD + ' p-6 space-y-6'}>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">Entity Trust Score</span>
                    <h2 className="text-2xl font-bold text-white">Score: {compResult.trust_score} / 100</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    compResult.status === 'predatory' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60' :
                    compResult.status === 'verified' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60' :
                    compResult.status === 'suspicious' ? 'bg-red-950/70 text-red-300 border border-red-800/60' :
                    'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                  }`}>
                    {compResult.status === 'predatory' ? '⚠️ Predatory Certificate Mill' : compResult.status}
                  </span>
                </div>

                {compResult.status === 'predatory' && (
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-4 text-sm text-amber-200 font-medium">
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
