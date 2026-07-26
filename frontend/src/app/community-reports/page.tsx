'use client';

import { useEffect, useState } from 'react';
import {
  REPORT_TYPE_OPTIONS,
  ReportItem,
  ReportType,
  getMyReports,
  submitReport,
  uploadReportEvidence,
} from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function CommunityReports() {
  const [activeTab, setActiveTab] = useState<'submit' | 'mine'>('submit');

  const [reportType, setReportType] = useState<ReportType>('recruiter');
  const [title, setTitle] = useState('');
  const [targetReference, setTargetReference] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [myReports, setMyReports] = useState<ReportItem[]>([]);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [mineError, setMineError] = useState('');

  async function loadMyReports() {
    setIsLoadingMine(true);
    setMineError('');
    try {
      const data = await getMyReports();
      setMyReports(data.results);
    } catch (err) {
      setMineError(err instanceof Error ? err.message : 'Failed to load your reports.');
    } finally {
      setIsLoadingMine(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'mine') {
      loadMyReports();
    }
  }, [activeTab]);

  async function handleSubmit() {
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitting(true);
    try {
      const report = await submitReport({
        report_type: reportType,
        title,
        target_reference: targetReference,
        description,
      });
      if (file) {
        try {
          await uploadReportEvidence(report.id, file);
        } catch {
          // Evidence upload failing shouldn't hide that the report itself was submitted.
          setSubmitError('Report submitted, but the evidence file failed to upload.');
        }
      }
      setSubmitSuccess('Report submitted. It is now pending admin review.');
      setTitle('');
      setTargetReference('');
      setDescription('');
      setFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = title.trim() && targetReference.trim() && description.trim() && !isSubmitting;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Community Reporting System</h1>
        <p className="text-slate-500 mb-8">Report scams and fraudulent activities to help protect others</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('submit')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'submit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Submit Report
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'mine' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            My Reports
          </button>
        </div>

        {activeTab === 'submit' ? (
          /* Report Form */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Submit New Report</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 focus:border-slate-500 focus:outline-none"
                >
                  {REPORT_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary, e.g. 'Charges a training fee for a certificate'"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Domain, email, or name being reported
                </label>
                <input
                  type="text"
                  value={targetReference}
                  onChange={(e) => setTargetReference(e.target.value)}
                  placeholder="e.g. scam-company.example or recruiter@scam-company.example"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Evidence Upload</label>
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-slate-600 mb-2">
                    {file ? file.name : 'Choose a file to upload (optional)'}
                  </p>
                  <p className="text-sm text-slate-400 mb-3">Supports: PDF, PNG, JPG, WEBP (Max 10MB)</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mx-auto block text-sm text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description of the fraudulent activity..."
                  rows={6}
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none resize-none"
                />
              </div>

              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}
              {submitSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitSuccess}
                </div>
              ) : null}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-white font-semibold transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        ) : (
          /* My Reports */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">My Reports</h3>
              <button
                onClick={loadMyReports}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Refresh
              </button>
            </div>

            {isLoadingMine ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : mineError ? (
              <div className="space-y-3">
                <p className="text-sm text-red-700">{mineError}</p>
                <button
                  onClick={loadMyReports}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Retry
                </button>
              </div>
            ) : myReports.length === 0 ? (
              <p className="text-slate-500 text-sm">
                You haven&apos;t submitted any reports yet — or you&apos;re not logged in.
              </p>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{report.title || report.target_reference}</p>
                      <p className="text-xs text-slate-400">
                        {report.report_type.replace(/_/g, ' ')} · {new Date(report.created_at).toLocaleString()}
                      </p>
                      {report.resolution_note ? (
                        <p className="text-xs text-slate-500 mt-1">Note: {report.resolution_note}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs border ${
                        STATUS_STYLES[report.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
