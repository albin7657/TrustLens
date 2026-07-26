'use client';

export default function InstitutionalDashboard() {
  const stats = {
    totalCompanies: 250,
    approved: 190,
    highRisk: 35,
    underReview: 25
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Placement Officer Dashboard</h1>
        <p className="text-slate-500 mb-8">Monitor company verification status and recruitment fraud risks</p>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total Companies</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{stats.totalCompanies}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-2 text-4xl font-bold text-emerald-600">{stats.approved}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">High Risk</p>
            <p className="mt-2 text-4xl font-bold text-red-600">{stats.highRisk}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Under Review</p>
            <p className="mt-2 text-4xl font-bold text-amber-600">{stats.underReview}</p>
          </div>
        </div>

        {/* Visual Representation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Status Overview</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-8 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="bg-emerald-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '76%' }}>
                {stats.approved}
              </div>
              <div className="bg-red-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '14%' }}>
                {stats.highRisk}
              </div>
              <div className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '10%' }}>
                {stats.underReview}
              </div>
            </div>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-slate-600">Under Review</span>
            </div>
          </div>
        </div>

        {/* Graphs Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Scam Trends</h3>
            <div className="space-y-3">
              {[
                { m: 'Jan', v: 30 }, { m: 'Feb', v: 45 }, { m: 'Mar', v: 60 },
                { m: 'Apr', v: 40 }, { m: 'May', v: 55 }, { m: 'Jun', v: 35 },
              ].map((row) => (
                <div key={row.m} className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-12">{row.m}</div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-red-500" style={{ width: `${row.v}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Complaint Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Fake Job Postings</span>
                <span className="font-semibold text-red-600">45%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Advance Fee Scams</span>
                <span className="font-semibold text-orange-600">28%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Identity Theft</span>
                <span className="font-semibold text-amber-600">15%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Phishing Attempts</span>
                <span className="font-semibold text-slate-500">12%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Distribution</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Low Risk</span>
                <span className="text-2xl font-bold text-emerald-600">65%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Medium Risk</span>
                <span className="text-2xl font-bold text-amber-600">25%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">High Risk</span>
                <span className="text-2xl font-bold text-red-600">10%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-red-500" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recruiter Verification Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recruiter Verification Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm">✓</div>
                <span className="text-slate-900">Verified Recruiters</span>
              </div>
              <span className="font-semibold text-emerald-600">1,245</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-sm">⏳</div>
                <span className="text-slate-900">Pending Verification</span>
              </div>
              <span className="font-semibold text-amber-600">156</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-sm">✗</div>
                <span className="text-slate-900">Blacklisted Recruiters</span>
              </div>
              <span className="font-semibold text-red-600">89</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
