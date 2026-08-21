'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import TrustGraph3D from '@/components/TrustGraph3D';
import { getGraphOverview, GraphResult } from '@/lib/api';
import { GitFork, RefreshCw, ShieldAlert, Network } from 'lucide-react';

type FilterMode = 'all' | 'flagged';

const CARD = 'rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl';

export default function TrustGraphPage() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [graphData, setGraphData] = useState<GraphResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGraphOverview({
        limit: 400,
        flaggedOnly: filter === 'flagged',
      });
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trust graph');
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const flaggedCount =
    graphData?.nodes.filter(
      (n) =>
        n.status === 'suspicious' ||
        n.status === 'predatory' ||
        (n.type === 'report' && n.status === 'approved'),
    ).length ?? 0;

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <PageHeader
          title="Trust Graph Network"
          description="Explore the full recruitment fraud network — companies, recruiters, domains, reports, and how they connect."
        />

        {/* Stats + filters */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className={`${CARD} flex items-center gap-3 px-4 py-3`}>
              <Network className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entities</p>
                <p className="text-lg font-bold text-white">{graphData?.nodes.length ?? '—'}</p>
              </div>
            </div>
            <div className={`${CARD} flex items-center gap-3 px-4 py-3`}>
              <GitFork className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Connections</p>
                <p className="text-lg font-bold text-white">{graphData?.edges.length ?? '—'}</p>
              </div>
            </div>
            <div className={`${CARD} flex items-center gap-3 px-4 py-3`}>
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Flagged</p>
                <p className="text-lg font-bold text-white">{loading ? '—' : flaggedCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-800/80 bg-slate-900/60 p-1">
              {(
                [
                  { id: 'all' as const, label: 'Full network' },
                  { id: 'flagged' as const, label: 'Flagged only' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    filter === opt.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadGraph}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div
            className={`${CARD} flex items-center justify-center`}
            style={{ height: 'calc(100vh - 14rem)', minHeight: 480 }}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
              <p className="text-sm text-slate-400">Building 3D network from trust database…</p>
            </div>
          </div>
        ) : !graphData || graphData.nodes.length === 0 ? (
          <div
            className={`${CARD} flex flex-col items-center justify-center p-12 text-center`}
            style={{ minHeight: 400 }}
          >
            <div className="mb-4 text-5xl">🔗</div>
            <h3 className="text-xl font-semibold text-white">No graph data yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Run scans, verify recruiters and companies, or approve community reports — each action
              adds nodes and edges to the trust graph.
            </p>
          </div>
        ) : (
          <TrustGraph3D data={graphData} variant="fullscreen" />
        )}
      </div>
    </div>
  );
}
