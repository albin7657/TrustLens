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
            onClick={() => setActiveTab('admin')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Admin Panel
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
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 focus:border-slate-500 focus:outline-none"
                >
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name of recruiter, company, or website"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Evidence Upload</label>
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-slate-600 mb-2">Drag and drop files here or click to upload</p>
                  <p className="text-sm text-slate-400">Supports: PDF, DOC, DOCX, PNG, JPG (Max 10MB)</p>
                  <input type="file" className="hidden" />
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

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name || !description}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-white font-semibold transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        ) : (
          /* Admin Panel */
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Pending Reports</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">24</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Approved Reports</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">156</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Rejected Reports</p>
                <p className="mt-2 text-3xl font-bold text-red-600">32</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Evidence Review</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">18</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Fake Recruiter Report</p>
                    <p className="text-xs text-slate-400">Submitted 2 hours ago</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 border border-amber-200">Pending</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Scam Job Posting</p>
                    <p className="text-xs text-slate-400">Submitted 5 hours ago</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 border border-emerald-200">Approved</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Suspicious Company</p>
                    <p className="text-xs text-slate-400">Submitted 1 day ago</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700 border border-red-200">Rejected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
