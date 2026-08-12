'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { submitScanFeedback } from '@/lib/api';

export default function FeedbackStrip({ scanId }: { scanId?: string | null }) {
  const [sent, setSent] = useState<'accurate' | 'inaccurate' | null>(null);
  const [error, setError] = useState('');

  if (!scanId) return null;

  async function send(accurate: boolean) {
    setError('');
    try {
      await submitScanFeedback(scanId as string, accurate);
      setSent(accurate ? 'accurate' : 'inaccurate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback.');
    }
  }

  if (sent) {
    return <p className="text-xs text-slate-400">Thanks for the feedback.</p>;
  }

  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span>Was this accurate?</span>
      <button
        type="button"
        onClick={() => send(true)}
        aria-label="Accurate"
        className="rounded-full border border-slate-800 p-1.5 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => send(false)}
        aria-label="Inaccurate"
        className="rounded-full border border-slate-800 p-1.5 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      {error ? <span className="text-red-400">{error}</span> : null}
    </div>
  );
}
