'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  searchRepository,
  checkSimilarity,
  getGraph,
  RepositorySearchResult,
  SimilarityCheckResult,
  GraphResult,
  GraphEntityType,
} from '@/lib/api';
import FeedbackStrip from '@/components/FeedbackStrip';
import { Search, Brain, GitFork, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

function IntelligenceContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'search';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // ── Tab 1: Repository Search ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<RepositorySearchResult[]>([]);

  // Expanded graph connections state
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphResult | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await searchRepository(searchQuery);
      setSearchResults(res);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadConnections = async (item: RepositorySearchResult) => {
    const key = `${item.type}:${item.id}`;
    if (expandedEntity === key) {
      setExpandedEntity(null);
      return;
    }
    setExpandedEntity(key);
    setGraphLoading(true);
    try {
      let entityType: GraphEntityType = 'domain';
      if (item.type === 'company') entityType = 'company';
      else if (item.type === 'recruiter') entityType = 'recruiter';
      else if (item.type === 'fraud_report') entityType = 'report';

      const data = await getGraph(entityType, item.id, 1);
      setGraphData(data);
    } catch {
      setGraphData(null);
    } finally {
      setGraphLoading(false);
    }
  };

  // ── Tab 2: Scam Similarity ────────────────────────────────────────────────
  const [simText, setSimText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');
  const [simResult, setSimResult] = useState<SimilarityCheckResult | null>(null);

  const handleSimCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;
    setSimLoading(true);
    setSimError('');
    setSimResult(null);
    try {
      const res = await checkSimilarity(simText);
      setSimResult(res);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Similarity check failed');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Trust Intelligence</h1>
          <p className="mt-1 text-slate-500">Query verified records, fraud reports, trust graph links, and vector similarity matches.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'search' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Search className="h-4 w-4" />
            Trust Repository
          </button>
          <button
            onClick={() => setActiveTab('similar')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'similar' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Brain className="h-4 w-4" />
            Find Similar Scams
          </button>
        </div>

        {/* Tab 1: Repository Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company name, domain, recruiter email, or report keyword..."
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {searchError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{searchError}</div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((item) => {
                  const key = `${item.type}:${item.id}`;
                  const isExpanded = expandedEntity === key;
                  return (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-400">{item.type.replace(/_/g, ' ')}</span>
                          <h3 className="text-lg font-bold text-slate-900">{item.label}</h3>
                        </div>
                        {item.status && (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            item.status === 'predatory' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            item.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>

                      {item.detail && <p className="text-sm text-slate-600">{item.detail}</p>}

                      <button
                        onClick={() => handleLoadConnections(item)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <GitFork className="h-3.5 w-3.5" />
                        {isExpanded ? 'Hide Connections' : 'View Trust Graph Connections'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                          <p className="font-bold text-slate-700 uppercase">Trust Graph Connections (Milestone P2-7)</p>
                          {graphLoading ? (
                            <p className="text-slate-400">Loading graph edges...</p>
                          ) : !graphData || graphData.edges.length === 0 ? (
                            <p className="text-slate-400">No direct graph connections found.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {graphData.edges.map((edge, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                  <span className="font-semibold text-slate-800">{edge.source.id}</span>
                                  <span className="text-indigo-600 font-mono">-[{edge.relationship}]-&gt;</span>
                                  <span className="font-semibold text-slate-800">{edge.target.id}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scam Similarity */}
        {activeTab === 'similar' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSimCheck} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Paste Offer / Email / Message Content
                  </label>
                  <textarea
                    rows={6}
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Paste full text to check pgvector similarity against confirmed community fraud reports..."
                    className="w-full rounded-xl border border-slate-300 p-4 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={simLoading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {simLoading ? 'Checking Vector Database...' : 'Find Matches'}
                </button>
              </form>
            </div>

            {simError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{simError}</div>
            )}

            {simResult && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400">pgvector Semantic Match Analysis</span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {simResult.matches.length > 0 ? `Found ${simResult.matches.length} Similar Scam Records` : 'No Confirmed Scam Matches'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {simResult.analysis}
                  </p>
                </div>

                {simResult.matches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase">Matched Database Items</p>
                    {simResult.matches.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {m.source_table} ({m.category || 'scam'})
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Similarity: {(m.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg">{m.excerpt}</p>
                      </div>
                    ))}
                  </div>
                )}

                {simResult.scan_id && <FeedbackStrip scanId={simResult.scan_id} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading Intelligence...</div>}>
      <IntelligenceContent />
    </Suspense>
  );
}
