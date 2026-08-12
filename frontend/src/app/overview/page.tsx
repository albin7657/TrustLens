'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, UserRound, Building2, Mail, Megaphone, FileText,
  Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, ChevronRight,
} from 'lucide-react';
import {
  getMyStats,
  UserStatsResult,
  ScanSummary,
  ReportStatusSummary,
} from '@/lib/api';

// ── Quick-action cards ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: Search,
    title: 'Scan a job posting',
    description: 'Paste text, URL, or screenshot — get an instant fraud score.',
    href: '/scan?tab=job',
    color: 'from-indigo-500 to-violet-600',
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
  },
  {
    icon: UserRound,
    title: 'Check a recruiter',
    description: 'Verify email domain, prior reports, and trust graph links.',
    href: '/scan?tab=recruiter',
    color: 'from-sky-500 to-cyan-600',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
  },
  {
    icon: Building2,
    title: 'Verify a company',
    description: 'WHOIS, SSL, predatory-internship watchlist, and more.',
    href: '/scan?tab=company',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
  {
    icon: Mail,
    title: 'Analyze a message',
    description: 'Paste a WhatsApp / SMS / email thread for scam-stage detection.',
    href: '/scan?tab=message',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
  {
    icon: Megaphone,
    title: 'Report a scam',
    description: 'Submit evidence — approvals enrich the whole community database.',
    href: '/reports?tab=submit',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
  },
  {
    icon: FileText,
    title: 'Generate a complaint',
    description: 'Export a PDF evidence summary for cybercrime portals.',
    href: '/reports?tab=complaint',
    color: 'from-slate-500 to-slate-700',
    bg: 'bg-slate-800',
    text: 'text-slate-300',
  },
];


// ── Utility components ────────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, string> = {
  high: 'bg-red-950/70 text-red-300 border-red-800/80',
  suspicious: 'bg-red-950/70 text-red-300 border-red-800/80',
  medium: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
  unverified: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
  low: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
  verified: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
  predatory: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
};

const REPORT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
  approved: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
  rejected: 'bg-red-950/70 text-red-300 border border-red-800/60',
};

const SCAN_TYPE_LABELS: Record<string, string> = {
  job_text: '📝 Job text',
  job_url: '🔗 Job URL',
  job_image: '🖼️ Job image',
  email: '📧 Email',
  communication: '📩 Message',
  company: '🏢 Company',
  website: '🌐 Website',
  recruiter: '👤 Recruiter',
  similarity: '🧠 Similarity',
};

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Overview() {
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolve user from localStorage once
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setDisplayName(u.full_name || u.email?.split('@')[0] || 'there');
        setUserId(u.id || null);
      }
    } catch { /* ignore */ }
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyStats(userId ?? undefined);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your stats.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load once we have userId
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totals = stats?.my_totals;
  const recentScans: ScanSummary[] = stats?.recent_scans ?? [];
  const myReports: ReportStatusSummary[] = stats?.my_report_statuses ?? [];

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Welcome back{displayName ? `, ${displayName}` : ''}.
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Here&apos;s your TrustLens activity at a glance.
          </p>
        </div>

        {/* ── My stat cards ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        ) : error ? (
          <div className="mb-10 rounded-2xl border border-red-800/80 bg-red-950/40 p-6">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={loadStats}
              className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Shield}
              label="Total scans"
              value={totals?.scans ?? 0}
              color="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              sub="all modules combined"
            />
            <StatCard
              icon={AlertTriangle}
              label="High-risk found"
              value={totals?.high_risk_found ?? 0}
              color="bg-red-500/20 text-red-400 border border-red-500/30"
              sub="scans returning high risk"
            />
            <StatCard
              icon={Megaphone}
              label="Reports submitted"
              value={totals?.reports_submitted ?? 0}
              color="bg-amber-500/20 text-amber-400 border border-amber-500/30"
              sub="community reports you filed"
            />
            <StatCard
              icon={CheckCircle}
              label="Reports approved"
              value={totals?.reports_approved ?? 0}
              color="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              sub="contributions to the database"
            />
          </div>
        )}

        {/* ── Two-column: recent activity + report statuses ───────────────── */}
        <div className="mb-10 grid gap-6 lg:grid-cols-2">

          {/* Recent scans */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent activity</h2>
              <Link href="/my-scans" className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : recentScans.length === 0 ? (
              <p className="text-sm text-slate-400">No scans yet — run a check to see it here.</p>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {recentScans.map((scan) => (
                  <li key={scan.id} className="flex items-center gap-3 py-3">
                    <span className="text-base">{SCAN_TYPE_LABELS[scan.scan_type]?.split(' ')[0] ?? '🔍'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{scan.input_summary}</p>
                      <p className="text-xs text-slate-400">{new Date(scan.created_at).toLocaleString()}</p>
                    </div>
                    {scan.risk_category && (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          CATEGORY_STYLES[scan.risk_category] ?? 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {scan.risk_category}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* My reports */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My reports</h2>
              <Link href="/community-reports" className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:underline">
                Submit new <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : myReports.length === 0 ? (
              <p className="text-sm text-slate-400">No reports filed yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {myReports.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{r.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{r.report_type.replace(/_/g, ' ')}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        REPORT_STATUS_STYLES[r.status] ?? 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <h2 className="mb-4 text-xl font-semibold text-white">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.bg} ${action.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {action.title}
                    <TrendingUp className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400 leading-snug">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
