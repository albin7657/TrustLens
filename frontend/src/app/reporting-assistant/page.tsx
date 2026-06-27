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
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Fraud Reporting Assistance</h1>
        <p className="text-slate-400 mb-8">Generate comprehensive fraud reports for cybercrime reporting</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Generate Report</h3>
              <label className="block text-sm font-medium text-white mb-3">Select Case</label>
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:border-red-500 focus:outline-none mb-4"
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
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {reportGenerated ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Report Generated Successfully</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                    <span className="text-green-400">✓</span>
                    <span className="text-white">Evidence Summary</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                    <span className="text-green-400">✓</span>
                    <span className="text-white">Complaint Summary</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3">
                    <span className="text-green-400">✓</span>
                    <span className="text-white">Cybercrime Reporting Guide</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-semibold text-white mb-3">Export Options</h4>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-xl bg-red-500/20 px-4 py-3 text-red-300 hover:bg-red-500/30 transition-colors">
                      PDF
                    </button>
                    <button className="flex-1 rounded-xl bg-blue-500/20 px-4 py-3 text-blue-300 hover:bg-blue-500/30 transition-colors">
                      DOCX
                    </button>
                    <button className="flex-1 rounded-xl bg-green-500/20 px-4 py-3 text-green-300 hover:bg-green-500/30 transition-colors">
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Report Generated</h3>
                <p className="text-slate-400">Select a case and click "Generate PDF" to create a comprehensive fraud report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
