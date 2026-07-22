'use client';

import { useState } from 'react';

export default function ReportingAssistant() {
  const [selectedCase, setSelectedCase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const cases = [
    'Case #145 - Advance Fee Scam',
    'Case #212 - Fake Job Posting',
    'Case #341 - Identity Theft',
    'Case #456 - Phishing Attempt',
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setReportGenerated(true);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Fraud Reporting Assistance</h1>
        <p className="text-slate-500 mb-8">Generate comprehensive fraud reports for cybercrime reporting</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Report</h3>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Select Case</label>
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 focus:border-slate-500 focus:outline-none mb-4"
              >
                <option value="">Select a case...</option>
                {cases.map((caseItem) => (
                  <option key={caseItem} value={caseItem}>
                    {caseItem}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedCase}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-white font-semibold transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {reportGenerated ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Report Generated Successfully</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-slate-900">Evidence Summary</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-slate-900">Complaint Summary</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-slate-900">Cybercrime Reporting Guide</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-semibold text-slate-900 mb-3">Export Options</h4>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-2xl bg-red-50 px-4 py-3 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                      PDF
                    </button>
                    <button className="flex-1 rounded-2xl bg-blue-50 px-4 py-3 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                      DOCX
                    </button>
                    <button className="flex-1 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Report Generated</h3>
                <p className="text-slate-500">Select a case and click &quot;Generate PDF&quot; to create a comprehensive fraud report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
