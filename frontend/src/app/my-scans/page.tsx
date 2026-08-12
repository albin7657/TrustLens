'use client';

import { Fragment, useEffect, useState } from 'react';
import { getHistory, ScanHistoryItem } from '@/lib/api';
import FeedbackStrip from '@/components/FeedbackStrip';
import PageHeader from '@/components/PageHeader';

const TYPE_ICON: Record<string, string> = {
  job_text: '📝',
  job_url: '🔗',
  job_image: '🖼️',
  email: '📧',
  communication: '📩',
  company: '🏢',
  website: '🌐',
  recruiter: '👤',
  similarity: '🧠',
};

const CATEGORY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  suspicious: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  unverified: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function MyScans() {
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError('');
    try {
      const data = await getHistory({ limit: 50 });
      setItems(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan history.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="My Scans"
          description="Every analysis run through TrustLens, newest first. Click a row to see the full stored result."
        />

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-400">Loading…</p>
          ) : error ? (
            <div className="space-y-3 p-6">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={load}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              No scans yet — run a job, company, recruiter, or website check to see it here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Input</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item) => (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="cursor-pointer hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                          <span className="mr-2">{TYPE_ICON[item.scan_type] || '🔍'}</span>
                          {item.scan_type.replace(/_/g, ' ')}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slate-300">{item.input_summary}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {item.risk_category ? (
                            <span
                              className={`rounded-full border px-2 py-1 text-xs font-medium ${
                                CATEGORY_STYLES[item.risk_category] || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {item.risk_category}
                              {item.risk_score != null ? ` (${Math.round(item.risk_score)})` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                      </tr>
                      {expandedId === item.id ? (
                        <tr>
                          <td colSpan={4} className="bg-slate-950/80 px-4 py-4 border-b border-slate-800">
                            <div className="space-y-3">
                              <FeedbackStrip scanId={item.id} />
                              <pre className="max-h-96 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300 font-mono">
                                {JSON.stringify(item.result_payload, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
