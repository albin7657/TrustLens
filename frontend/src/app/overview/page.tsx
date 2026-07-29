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
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
  },
  {
    icon: UserRound,
    title: 'Check a recruiter',
    description: 'Verify email domain, prior reports, and trust graph links.',
    href: '/scan?tab=recruiter',
    color: 'from-sky-500 to-cyan-600',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
  },
  {
    icon: Building2,
    title: 'Verify a company',
    description: 'WHOIS, SSL, predatory-internship watchlist, and more.',
    href: '/scan?tab=company',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    icon: Mail,
    title: 'Analyze a message',
    description: 'Paste a WhatsApp / SMS / email thread for scam-stage detection.',
    href: '/scan?tab=message',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    icon: Megaphone,
    title: 'Report a scam',
    description: 'Submit evidence — approvals enrich the whole community database.',
    href: '/reports?tab=submit',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
  },
  {
    icon: FileText,
    title: 'Generate a complaint',
    description: 'Export a PDF evidence summary for cybercrime portals.',
    href: '/reports?tab=complaint',
    color: 'from-slate-500 to-slate-700',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
  },
];


// ── Utility components ────────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  suspicious: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  unverified: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  predatory: 'bg-amber-100 text-amber-700 border-amber-200',
};

const REPORT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
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
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Welcome back{displayName ? `, ${displayName}` : ''}.
          </h1>
          <p className="mt-2 text-lg text-slate-500">
            Here&apos;s your TrustLens activity at a glance.
          </p>
        </div>

        {/* ── My stat cards ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <div className="mb-10 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadStats}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
              color="bg-indigo-50 text-indigo-600"
              sub="all modules combined"
            />
            <StatCard
              icon={AlertTriangle}
              label="High-risk found"
              value={totals?.high_risk_found ?? 0}
              color="bg-red-50 text-red-600"
              sub="scans returning high risk"
            />
            <StatCard
              icon={Megaphone}
              label="Reports submitted"
              value={totals?.reports_submitted ?? 0}
              color="bg-amber-50 text-amber-600"
              sub="community reports you filed"
            />
            <StatCard
              icon={CheckCircle}
              label="Reports approved"
              value={totals?.reports_approved ?? 0}
              color="bg-emerald-50 text-emerald-600"
              sub="contributions to the database"
            />
          </div>
        )}

        {/* ── Two-column: recent activity + report statuses ───────────────── */}
        <div className="mb-10 grid gap-6 lg:grid-cols-2">

          {/* Recent scans */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
              <Link href="/my-scans" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : recentScans.length === 0 ? (
              <p className="text-sm text-slate-500">No scans yet — run a check to see it here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentScans.map((scan) => (
                  <li key={scan.id} className="flex items-center gap-3 py-3">
                    <span className="text-base">{SCAN_TYPE_LABELS[scan.scan_type]?.split(' ')[0] ?? '🔍'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{scan.input_summary}</p>
                      <p className="text-xs text-slate-400">{new Date(scan.created_at).toLocaleString()}</p>
                    </div>
                    {scan.risk_category && (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          CATEGORY_STYLES[scan.risk_category] ?? 'bg-slate-100 text-slate-600 border-slate-200'
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">My reports</h2>
              <Link href="/community-reports" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                Submit new <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : myReports.length === 0 ? (
              <p className="text-sm text-slate-500">No reports filed yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myReports.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{r.report_type.replace(/_/g, ' ')}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        REPORT_STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'
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
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.bg} ${action.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {action.title}
                    <TrendingUp className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 leading-snug">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
