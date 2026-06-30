'use client';

import { useState } from 'react';

export default function TrustRepository() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('companies');

  const stats = {
    verifiedCompanies: 500,
    suspiciousCompanies: 120,
    recruiters: 2000,
    fraudReports: 350,
    scamWebsites: 150
  };

  const tabs = [
    { id: 'companies', label: 'Verified Companies' },
    { id: 'recruiters', label: 'Blacklisted Recruiters' },
    { id: 'domains', label: 'Scam Domains' },
  ];

  const mockData = {
    companies: [
      { name: 'TechCorp Inc', status: 'Verified', trustScore: 95, domainAge: 12 },
      { name: 'DataSystems LLC', status: 'Verified', trustScore: 88, domainAge: 8 },
      { name: 'CloudNet Solutions', status: 'Verified', trustScore: 92, domainAge: 15 },
      { name: 'SecureTech Inc', status: 'Verified', trustScore: 90, domainAge: 6 },
    ],
    recruiters: [
      { name: 'John Smith', email: 'john@fake-recruit.com', reports: 15, status: 'Blacklisted' },
      { name: 'Sarah Johnson', email: 'sarah@suspect-hire.net', reports: 8, status: 'Blacklisted' },
      { name: 'Mike Davis', email: 'mike@scam-jobs.org', reports: 23, status: 'Blacklisted' },
      { name: 'Emily Brown', email: 'emily@fraud-careers.com', reports: 12, status: 'Blacklisted' },
    ],
    domains: [
      { domain: 'fake-recruit.com', threatLevel: 'High', reports: 45, status: 'Blacklisted' },
      { domain: 'suspect-hire.net', threatLevel: 'High', reports: 32, status: 'Blacklisted' },
      { domain: 'scam-jobs.org', threatLevel: 'Critical', reports: 67, status: 'Blacklisted' },
      { domain: 'fraud-careers.com', threatLevel: 'High', reports: 28, status: 'Blacklisted' },
    ]
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Trust Intelligence Repository</h1>
        <p className="text-slate-400 mb-8">Search and browse verified entities and blacklisted threats</p>

        {/* Search Section */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 mb-8">
          <label className="block text-sm font-medium text-white mb-3">Search Recruiter / Company / Website</label>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search term..."
              className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
            />
            <button className="rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600">
              Search
            </button>
          </div>
        </div>

        {/* Database Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Verified Companies</p>
            <p className="mt-2 text-3xl font-bold text-green-400">{stats.verifiedCompanies}+</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Suspicious Companies</p>
            <p className="mt-2 text-3xl font-bold text-red-400">{stats.suspiciousCompanies}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Recruiters</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">{stats.recruiters}+</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Fraud Reports</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">{stats.fraudReports}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Scam Websites</p>
            <p className="mt-2 text-3xl font-bold text-purple-400">{stats.scamWebsites}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-500/20 text-red-300'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-slate-950/60">
              <tr>
                {activeTab === 'companies' && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Company Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Trust Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Domain Age</th>
                  </>
                )}
                {activeTab === 'recruiters' && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Recruiter Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Reports</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                  </>
                )}
                {activeTab === 'domains' && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Domain</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Threat Level</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Reports</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'companies' && mockData.companies.map((item, index) => (
                <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-6 py-4 text-white">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-white">{item.trustScore}%</td>
                  <td className="px-6 py-4 text-white">{item.domainAge} years</td>
                </tr>
              ))}
              {activeTab === 'recruiters' && mockData.recruiters.map((item, index) => (
                <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-6 py-4 text-white">{item.name}</td>
                  <td className="px-6 py-4 text-slate-300">{item.email}</td>
                  <td className="px-6 py-4 text-red-400">{item.reports}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-400">{item.status}</span>
                  </td>
                </tr>
              ))}
              {activeTab === 'domains' && mockData.domains.map((item, index) => (
                <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-6 py-4 text-white">{item.domain}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-sm ${item.threatLevel === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {item.threatLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-red-400">{item.reports}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-400">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
