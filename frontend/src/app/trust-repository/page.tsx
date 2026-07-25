'use client';

import { useEffect, useState } from 'react';
import { Search, Building2, UserRound, Globe2, FileWarning } from 'lucide-react';
import { searchRepository, RepositorySearchResult } from '@/lib/api';

const TYPE_META = {
  company: { label: 'Company', icon: Building2 },
  recruiter: { label: 'Recruiter', icon: UserRound },
  scam_website: { label: 'Scam Website', icon: Globe2 },
  fraud_report: { label: 'Fraud Report', icon: FileWarning },
} as const;

const STATUS_BADGE: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspicious: 'bg-red-50 text-red-700 border-red-200',
  unverified: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function TrustRepository() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RepositorySearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const load = async (query?: string) => {
    setIsSearching(true);
    setError('');
    try {
      const data = await searchRepository(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the repository.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = () => load(searchQuery);

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Trust Intelligence Repository</h1>
        <p className="mb-8 text-slate-600">
          Browse every verified company, recruiter, scam website, and fraud report — or search to narrow it down.
        </p>

        {/* Search Section */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-slate-900">
            Search Company / Recruiter / Domain (optional)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter a name, email, or domain — or leave blank to see everything"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Loading...' : 'Search'}
            </button>
            {searchQuery.trim() ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  load();
                }}
                disabled={isSearching}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        {/* Results */}
        {results === null ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Search className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-slate-500">{isSearching ? 'Loading…' : 'Nothing to show yet.'}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-500">
              {searchQuery.trim() ? `No matches found for "${searchQuery}".` : 'The repository is empty so far.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {results.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-sm text-slate-500">
                          {meta.label}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </p>
                      </div>
                    </div>
                    {item.status ? (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                          STATUS_BADGE[item.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
