'use client';

import { useState } from 'react';

export default function CommunityReports() {
  const [activeTab, setActiveTab] = useState('submit');
  const [reportType, setReportType] = useState('recruiter');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    { id: 'recruiter', label: 'Recruiter' },
    { id: 'company', label: 'Company' },
    { id: 'job', label: 'Job Posting' },
    { id: 'website', label: 'Website' },
  ];

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Report submitted successfully!');
      setName('');
      setDescription('');
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Community Reporting System</h1>
        <p className="text-slate-400 mb-8">Report scams and fraudulent activities to help protect others</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('submit')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'submit'
                ? 'bg-red-500/20 text-red-300'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Submit Report
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'admin'
                ? 'bg-red-500/20 text-red-300'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Admin Panel
          </button>
        </div>

        {activeTab === 'submit' ? (
          /* Report Form */
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Submit New Report</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                >
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name of recruiter, company, or website"
                  className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Evidence Upload</label>
                <div className="rounded-xl border-2 border-dashed border-white/20 bg-slate-950/40 p-8 text-center">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-slate-300 mb-2">Drag and drop files here or click to upload</p>
                  <p className="text-sm text-slate-500">Supports: PDF, DOC, DOCX, PNG, JPG (Max 10MB)</p>
                  <input type="file" className="hidden" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description of the fraudulent activity..."
                  rows={6}
                  className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name || !description}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        ) : (
          /* Admin Panel */
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Pending Reports</p>
                <p className="mt-2 text-3xl font-bold text-yellow-400">24</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Approved Reports</p>
                <p className="mt-2 text-3xl font-bold text-green-400">156</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Rejected Reports</p>
                <p className="mt-2 text-3xl font-bold text-red-400">32</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Evidence Review</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">18</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Fake Recruiter Report</p>
                    <p className="text-xs text-slate-500">Submitted 2 hours ago</p>
                  </div>
                  <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400">Pending</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Scam Job Posting</p>
                    <p className="text-xs text-slate-500">Submitted 5 hours ago</p>
                  </div>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">Approved</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Suspicious Company</p>
                    <p className="text-xs text-slate-500">Submitted 1 day ago</p>
                  </div>
                  <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-400">Rejected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
