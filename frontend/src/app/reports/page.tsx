'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import PageHeader from '@/components/PageHeader';
import {
  submitReport,
  uploadReportEvidence,
  getMyReports,
  getHistory,
  generateComplaintJson,
  downloadComplaintPdf,
  ReportType,
  REPORT_TYPE_OPTIONS,
  ReportItem,
  ScanHistoryItem,
  ComplaintJsonResponse,
} from '@/lib/api';
import { Megaphone, Clock, FileText, Download, ShieldCheck, ExternalLink } from 'lucide-react';

const REGIONAL_PORTALS = [
  { country: 'India', name: 'National Cyber Crime Reporting Portal', url: 'https://cybercrime.gov.in', note: 'Helpline: 1930' },
  { country: 'USA', name: 'Federal Trade Commission (FTC)', url: 'https://reportfraud.ftc.gov', note: 'Report Fraud' },
  { country: 'USA', name: 'FBI Internet Crime Complaint Center (IC3)', url: 'https://ic3.gov', note: 'Cyber Fraud' },
  { country: 'UK', name: 'Action Fraud UK', url: 'https://www.actionfraud.police.uk', note: 'National Fraud' },
];

function ReportsContent() {
  const { activeTab, switchTab } = useTabFromUrl('submit');

  // ── Tab 1: Submit Report State ───────────────────────────────────────────
  const [reportType, setReportType] = useState<ReportType>('predatory_internship');
  const [title, setTitle] = useState('');
  const [targetRef, setTargetRef] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetRef.trim() || !description.trim()) return;
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const res = await submitReport({
        report_type: reportType,
        title,
        target_reference: targetRef,
        description,
      });

      if (evidenceFile && res.id) {
        await uploadReportEvidence(res.id, evidenceFile);
      }

      setSubmitSuccess(true);
      setTitle('');
      setTargetRef('');
      setDescription('');
      setEvidenceFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Tab 2: My Reports State ──────────────────────────────────────────────
  const [myReportsList, setMyReportsList] = useState<ReportItem[]>([]);
  const [myReportsLoading, setMyReportsLoading] = useState(false);
  const [myReportsError, setMyReportsError] = useState('');

  const loadMyReports = async () => {
    setMyReportsLoading(true);
    setMyReportsError('');
    try {
      const res = await getMyReports();
      setMyReportsList(res.results);
    } catch (err) {
      setMyReportsError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setMyReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-reports') {
      loadMyReports();
    }
  }, [activeTab]);

  // ── Tab 3: Complaint Generator State ──────────────────────────────────────
  const [scansList, setScansList] = useState<ScanHistoryItem[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [previewData, setPreviewData] = useState<ComplaintJsonResponse | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    if (activeTab === 'complaint') {
      getHistory({ limit: 30 }).then((res) => setScansList(res.results)).catch(() => {});
    }
  }, [activeTab]);

  const handlePreviewComplaint = async () => {
    if (!selectedScanId && !selectedReportId) return;
    setGenLoading(true);
    setGenError('');
    setPreviewData(null);
    try {
      const data = await generateComplaintJson(selectedScanId || undefined, selectedReportId || undefined);
      setPreviewData(data);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Complaint generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedScanId && !selectedReportId) return;
    setPdfDownloading(true);
    try {
      await downloadComplaintPdf(selectedScanId || undefined, selectedReportId || undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF download failed');
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Community & Fraud Reports"
          description="Report fraudulent entities to enrich the community trust database, track submission statuses, or generate evidence PDFs."
        />

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1.5 shadow-xl backdrop-blur-xl">
          <button
            onClick={() => switchTab('submit')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'submit' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Report a Scam
          </button>
          <button
            onClick={() => switchTab('my-reports')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'my-reports' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            My Reports
          </button>
          <button
            onClick={() => switchTab('complaint')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'complaint' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            Complaint Generator
          </button>
        </div>

        {/* Tab 1: Submit Report */}
        {activeTab === 'submit' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as ReportType)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {REPORT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Target Reference (Domain / Email / Name) *</label>
                    <input
                      type="text"
                      required
                      value={targetRef}
                      onChange={(e) => setTargetRef(e.target.value)}
                      placeholder="e.g. predatory-internship.com or recruiter@fake.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Report Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Charged ₹3500 training fee for internship certificate"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Detailed Description *</label>
                  <textarea
                    rows={5}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened, money requested, communication details..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Evidence Attachment (Screenshot / PDF)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {submitLoading ? 'Submitting Report...' : 'Submit Fraud Report'}
                </button>
              </form>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{submitError}</div>
            )}

            {submitSuccess && (
              <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-4 text-sm text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Report submitted successfully! It is now pending admin review. Approved reports directly update our trust intelligence database.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Reports */}
        {activeTab === 'my-reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Your Submitted Reports</h2>
              <button onClick={loadMyReports} className="text-xs font-semibold text-cyan-400 hover:underline">
                Refresh
              </button>
            </div>

            {myReportsLoading ? (
              <p className="text-slate-400">Loading reports...</p>
            ) : myReportsError ? (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{myReportsError}</div>
            ) : myReportsList.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center text-slate-400">
                You haven&apos;t submitted any fraud reports yet.
              </div>
            ) : (
              <div className="space-y-3">
                {myReportsList.map((rep) => (
                  <div key={rep.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{rep.title || 'Untitled Report'}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        rep.status === 'approved' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80' :
                        rep.status === 'rejected' ? 'bg-red-950/70 text-red-300 border border-red-800/80' : 'bg-amber-950/70 text-amber-300 border border-amber-800/80'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Target: <span className="font-mono text-slate-200">{rep.target_reference}</span> | Category: <span className="capitalize text-slate-200">{rep.report_type.replace(/_/g, ' ')}</span></p>
                    <p className="text-sm text-slate-300">{rep.description}</p>
                    {rep.resolution_note && (
                      <p className="text-xs italic bg-slate-950/60 p-2 rounded text-slate-400 border border-slate-800">Reviewer Note: {rep.resolution_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Complaint Generator */}
        {activeTab === 'complaint' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <h2 className="text-lg font-bold text-white">Generate Official Cybercrime Complaint PDF</h2>
              <p className="text-sm text-slate-400">Select a recent scan from your history to synthesize a formal evidence report.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">Select Scan History Item</label>
                  <select
                    value={selectedScanId}
                    onChange={(e) => {
                      setSelectedScanId(e.target.value);
                      setSelectedReportId('');
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Choose a scan from history --</option>
                    {scansList.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.scan_type}] {s.input_summary.slice(0, 50)} ({s.risk_category || 'scored'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePreviewComplaint}
                    disabled={genLoading || (!selectedScanId && !selectedReportId)}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                  >
                    {genLoading ? 'Analyzing...' : 'Preview Structured Summary'}
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={pdfDownloading || (!selectedScanId && !selectedReportId)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {pdfDownloading ? 'Generating PDF...' : 'Download Official PDF'}
                  </button>
                </div>
              </div>
            </div>

            {genError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{genError}</div>
            )}

            {previewData && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded">
                    Evidence Summary Preview
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">{previewData.record_type}</h3>
                  <p className="text-xs text-slate-400">Target: {previewData.target} | Risk: {previewData.risk_status}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Executive Incident Summary</h4>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    {previewData.complaint.incident_summary}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Key Evidence Signals</h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {previewData.complaint.evidence_list.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Regional Cybercrime Portal Links */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Official Cybercrime Reporting Portals</h3>
              <p className="text-xs text-slate-400">Direct links to government law enforcement portals to lodge official complaints.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {REGIONAL_PORTALS.map((portal, idx) => (
                  <a
                    key={idx}
                    href={portal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs hover:border-cyan-500/40 hover:bg-slate-900 transition"
                  >
                    <div>
                      <span className="font-bold text-white">[{portal.country}] {portal.name}</span>
                      <p className="text-slate-400">{portal.note}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading Reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
