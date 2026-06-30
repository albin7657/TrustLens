'use client';

import { useState } from 'react';

export default function RecruiterVerification() {
  const [recruiterName, setRecruiterName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setResults({
        trustRating: 4,
        domainMatch: 'Verified',
        previousReports: 2,
        status: 'Moderate Trust'
      });
      setIsVerifying(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Recruiter Verification</h1>
        <p className="text-slate-400 mb-8">Verify recruiter authenticity and trustworthiness</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Recruiter Name</label>
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="Enter recruiter name"
                    className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying || !recruiterName || !email}
                  className="w-full rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Recruiter'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recruiter Trust Rating</h3>
                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-3xl ${star <= results.trustRating ? 'text-yellow-400' : 'text-slate-600'}`}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-300">{results.trustRating}/5 stars based on verification data</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Verification Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">Domain Match</span>
                      <span className={`font-semibold ${results.domainMatch === 'Verified' ? 'text-green-400' : 'text-red-400'}`}>
                        {results.domainMatch === 'Verified' ? '✅ Verified' : '❌ Not Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">Previous Reports</span>
                      <span className="font-semibold text-orange-400">{results.previousReports} Complaints</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-4 py-3">
                      <span className="text-slate-300">Status</span>
                      <span className={`font-semibold ${results.status === 'High Trust' ? 'text-green-400' : results.status === 'Moderate Trust' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {results.status}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-12 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Verification Yet</h3>
                <p className="text-slate-400">Enter recruiter details and click "Verify Recruiter" to see the results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
