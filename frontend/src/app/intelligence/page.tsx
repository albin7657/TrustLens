'use client';

import { useState, Suspense } from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import PageHeader from '@/components/PageHeader';
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
  const { activeTab, switchTab } = useTabFromUrl('search');

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
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Trust Intelligence"
          description="Query verified records, fraud reports, trust graph links, and vector similarity matches."
        />

        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1.5 shadow-xl backdrop-blur-xl w-fit">
          <button
            onClick={() => switchTab('search')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'search' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4" />
            Trust Repository
          </button>
          <button
            onClick={() => switchTab('similar')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'similar' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Brain className="h-4 w-4" />
            Find Similar Scams
          </button>
        </div>

        {/* Tab 1: Repository Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company name, domain, recruiter email, or report keyword..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {searchError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{searchError}</div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((item) => {
                  const key = `${item.type}:${item.id}`;
                  const isExpanded = expandedEntity === key;
                  return (
                    <div key={key} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-400">{item.type.replace(/_/g, ' ')}</span>
                          <h3 className="text-lg font-bold text-white">{item.label}</h3>
                        </div>
                        {item.status && (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            item.status === 'predatory' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/80' :
                            item.status === 'verified' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80' :
                            item.status === 'suspicious' ? 'bg-red-950/70 text-red-300 border border-red-800/80' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>

                      {item.detail && <p className="text-sm text-slate-300">{item.detail}</p>}

                      <button
                        onClick={() => handleLoadConnections(item)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline"
                      >
                        <GitFork className="h-3.5 w-3.5" />
                        {isExpanded ? 'Hide Connections' : 'View Trust Graph Connections'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 rounded-xl bg-slate-950/80 p-4 border border-slate-800 text-xs space-y-2">
                          <p className="font-bold text-slate-300 uppercase">Trust Graph Connections (Milestone P2-7)</p>
                          {graphLoading ? (
                            <p className="text-slate-400">Loading graph edges...</p>
                          ) : !graphData || graphData.edges.length === 0 ? (
                            <p className="text-slate-400">No direct graph connections found.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {graphData.edges.map((edge, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                  <span className="font-semibold text-slate-200">{edge.source.id}</span>
                                  <span className="text-cyan-400 font-mono">-[{edge.relationship}]-&gt;</span>
                                  <span className="font-semibold text-slate-200">{edge.target.id}</span>
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
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <form onSubmit={handleSimCheck} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
                    Paste Offer / Email / Message Content
                  </label>
                  <textarea
                    rows={6}
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Paste full text to check pgvector similarity against confirmed community fraud reports..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={simLoading}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {simLoading ? 'Checking Vector Database...' : 'Find Matches'}
                </button>
              </form>
            </div>

            {simError && (
              <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">{simError}</div>
            )}

            {simResult && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl space-y-6 backdrop-blur-xl">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400">pgvector Semantic Match Analysis</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {simResult.matches.length > 0 ? `Found ${simResult.matches.length} Similar Scam Records` : 'No Confirmed Scam Matches'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    {simResult.analysis}
                  </p>
                </div>

                {simResult.matches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase">Matched Database Items</p>
                    {simResult.matches.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                            {m.source_table} ({m.category || 'scam'})
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            Similarity: {(m.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">{m.excerpt}</p>
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
