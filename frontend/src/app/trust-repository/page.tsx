'use client';

import { useEffect, useState } from 'react';
import { Search, Building2, UserRound, Globe2, FileWarning, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { searchRepository, getGraph, RepositorySearchResult, GraphResult, GraphEntityType } from '@/lib/api';

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
  predatory: 'bg-amber-50 text-amber-800 border-amber-300',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-slate-100 text-slate-500 border-slate-200',
};

/** Maps a search result to the (type, id) the graph API expects — entity_links
 * keys companies/recruiters by domain/email, not their row uuid, and scam
 * websites live under the generic 'domain' type. None if there's nothing to
 * look up (e.g. a company with no domain on file). */
function graphRefFor(item: RepositorySearchResult): { type: GraphEntityType; id: string } | null {
  switch (item.type) {
    case 'company':
      return item.detail ? { type: 'company', id: item.detail } : null;
    case 'recruiter':
      return item.detail ? { type: 'recruiter', id: item.detail } : null;
    case 'scam_website':
      return { type: 'domain', id: item.label };
    case 'fraud_report':
      return { type: 'report', id: item.id };
    default:
      return null;
  }
}

export default function TrustRepository() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RepositorySearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [graphCache, setGraphCache] = useState<Record<string, GraphResult>>({});
  const [graphLoading, setGraphLoading] = useState<Record<string, boolean>>({});
  const [graphError, setGraphError] = useState<Record<string, string>>({});

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

  const fetchGraph = async (key: string, ref: { type: GraphEntityType; id: string }) => {
    setGraphLoading((prev) => ({ ...prev, [key]: true }));
    setGraphError((prev) => ({ ...prev, [key]: '' }));
    try {
      const data = await getGraph(ref.type, ref.id, 1);
      setGraphCache((prev) => ({ ...prev, [key]: data }));
    } catch (err) {
      setGraphError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Failed to load connections.',
      }));
    } finally {
      setGraphLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleConnections = (key: string, ref: { type: GraphEntityType; id: string }) => {
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!graphCache[key] && !graphLoading[key]) {
      fetchGraph(key, ref);
    }
  };

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
                const key = `${item.type}-${item.id}`;
                const ref = graphRefFor(item);
                const isExpanded = expandedKey === key;
                const graphResult = graphCache[key];

                return (
                  <li key={key} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
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
                      <div className="flex items-center gap-3">
                        {item.status ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                              STATUS_BADGE[item.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        ) : null}
                        {ref ? (
                          <button
                            onClick={() => toggleConnections(key, ref)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Connections
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {graphLoading[key] ? (
                          <p className="text-sm text-slate-500">Loading connections…</p>
                        ) : graphError[key] ? (
                          <div className="space-y-2">
                            <p className="text-sm text-red-600">{graphError[key]}</p>
                            <button
                              onClick={() => ref && fetchGraph(key, ref)}
                              className="text-xs font-medium text-slate-600 underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : !graphResult || graphResult.edges.length === 0 ? (
                          <p className="text-sm text-slate-500">No connections recorded for this entity yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {graphResult.edges.map((edge, idx) => {
                              const nodeStatus = (t: string, id: string) =>
                                graphResult.nodes.find((n) => n.type === t && n.id === id)?.status;
                              const sourceStatus = nodeStatus(edge.source.type, edge.source.id);
                              const targetStatus = nodeStatus(edge.target.type, edge.target.id);
                              return (
                                <li
                                  key={idx}
                                  className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
                                >
                                  <span className="font-medium text-slate-800">{edge.source.id}</span>
                                  <span className="text-xs text-slate-400">({edge.source.type})</span>
                                  {sourceStatus ? (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                        STATUS_BADGE[sourceStatus] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      {sourceStatus}
                                    </span>
                                  ) : null}
                                  <span className="text-slate-400">
                                    —[{edge.relationship.replace(/_/g, ' ')}]→
                                  </span>
                                  <span className="font-medium text-slate-800">{edge.target.id}</span>
                                  <span className="text-xs text-slate-400">({edge.target.type})</span>
                                  {targetStatus ? (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                        STATUS_BADGE[targetStatus] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      {targetStatus}
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
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
