'use client';

export default function InstitutionalDashboard() {
  const stats = {
    totalCompanies: 250,
    approved: 190,
    highRisk: 35,
    underReview: 25
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Placement Officer Dashboard</h1>
        <p className="text-slate-400 mb-8">Monitor company verification status and recruitment fraud risks</p>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Total Companies</p>
            <p className="mt-2 text-4xl font-bold text-white">{stats.totalCompanies}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Approved</p>
            <p className="mt-2 text-4xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">High Risk</p>
            <p className="mt-2 text-4xl font-bold text-red-400">{stats.highRisk}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Under Review</p>
            <p className="mt-2 text-4xl font-bold text-yellow-400">{stats.underReview}</p>
          </div>
        </div>

        {/* Visual Representation */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Company Status Overview</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-8 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="bg-green-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '76%' }}>
                {stats.approved}
              </div>
              <div className="bg-red-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '14%' }}>
                {stats.highRisk}
              </div>
              <div className="bg-yellow-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '10%' }}>
                {stats.underReview}
              </div>
            </div>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-300">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-300">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-slate-300">Under Review</span>
            </div>
          </div>
        </div>

        {/* Graphs Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Scam Trends</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">Jan</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '30%' }}></div>
                </div>
                <span className="text-xs text-slate-400">30</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">Feb</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '45%' }}></div>
                </div>
                <span className="text-xs text-slate-400">45</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">Mar</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '60%' }}></div>
                </div>
                <span className="text-xs text-slate-400">60</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">Apr</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '40%' }}></div>
                </div>
                <span className="text-xs text-slate-400">40</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">May</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '55%' }}></div>
                </div>
                <span className="text-xs text-slate-400">55</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-12">Jun</div>
                <div className="flex-1 h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-red-500" style={{ width: '35%' }}></div>
                </div>
                <span className="text-xs text-slate-400">35</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Complaint Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300">Fake Job Postings</span>
                <span className="font-semibold text-red-400">45%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300">Advance Fee Scams</span>
                <span className="font-semibold text-orange-400">28%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300">Identity Theft</span>
                <span className="font-semibold text-yellow-400">15%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300">Phishing Attempts</span>
                <span className="font-semibold text-slate-400">12%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-green-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Low Risk</span>
                <span className="text-2xl font-bold text-green-400">65%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-green-500" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="rounded-xl bg-yellow-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Medium Risk</span>
                <span className="text-2xl font-bold text-yellow-400">25%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-yellow-500" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div className="rounded-xl bg-red-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">High Risk</span>
                <span className="text-2xl font-bold text-red-400">10%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-red-500" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recruiter Verification Status */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recruiter Verification Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm">✓</div>
                <span className="text-white">Verified Recruiters</span>
              </div>
              <span className="font-semibold text-green-400">1,245</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-sm">⏳</div>
                <span className="text-white">Pending Verification</span>
              </div>
              <span className="font-semibold text-yellow-400">156</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm">✗</div>
                <span className="text-white">Blacklisted Recruiters</span>
              </div>
              <span className="font-semibold text-red-400">89</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
