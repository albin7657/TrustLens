import { SignalBreakdownItem } from '@/lib/api';

function riskColor(score: number) {
  if (score >= 70) return 'bg-red-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function formatName(name: string) {
  return name.replace(/^[a-z_]+:/, '').replace(/_/g, ' ');
}

export default function SignalBreakdown({ signals }: { signals: SignalBreakdownItem[] }) {
  if (!signals.length) return null;

  return (
    <div className="space-y-3">
      {signals.map((s) => (
        <div key={s.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium capitalize text-slate-700">{formatName(s.name)}</span>
            <span className="text-sm font-semibold text-slate-900">{Math.round(s.score)}/100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div className={`h-2 rounded-full ${riskColor(s.score)}`} style={{ width: `${Math.min(100, s.score)}%` }} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.explanation}</p>
        </div>
      ))}
    </div>
  );
}
