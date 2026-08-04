'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  getAdminStats, getReports, reviewReport,
  getAdminUsers, updateUserRole, updateUserStatus, getUserActivity,
  getAdminInsights, getModelConfig, updateModelConfig, testModelConfig,
  AdminStatsResult, ReportItem, UserAdminItem, UserActivityResponse,
  AdminInsightsData, ModelConfig, ModelTestResult,
} from '@/lib/api';

function cls(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(' ');
}

function Chip({ text, cls: extraCls }: { text: string; cls?: string }) {
  return (
    <span className={cls('rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider', extraCls ?? 'bg-slate-100 text-slate-700')}>
      {text}
    </span>
  );
}

function StatCard({ label, value, note, color }: { label: string; value: string | number; note?: string; color?: string }) {
  return (
    <div className={cls('rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md', color ?? 'border-slate-200 bg-white')}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1.5 text-3xl font-extrabold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

const TABS = ['Users Management', 'Platform Insights', 'Model Controls', 'Review Queue', 'Data Health'] as const;
type Tab = typeof TABS[number];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Users Management');
  const [statsData, setStatsData] = useState<AdminStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Role check: always verify role from backend, fall back to localStorage
  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    async function verifyAndLoad() {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.replace('/login');
          return;
        }

        // 1. Try backend first — this is the authoritative source
        let resolvedRole: string = '';
        try {
          const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            resolvedRole = meData.role || 'user';
            // Keep localStorage in sync with the real DB role
            localStorage.setItem('user_role', resolvedRole);
          } else {
            // Token invalid/expired
            localStorage.removeItem('access_token');
            router.replace('/login');
            return;
          }
        } catch {
          // Network error — fall back to cached localStorage value
          resolvedRole = localStorage.getItem('user_role') || 'user';
        }

        // 2. Strictly gate on resolved role
        if (resolvedRole !== 'admin') {
          router.replace('/overview');
          return;
        }

        // 3. Verified admin — load dashboard stats
        loadBaseStats();
      } catch {
        router.replace('/overview');
      }
    }

    verifyAndLoad();
  }, []);

  async function loadBaseStats() {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminStats();
      setStatsData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data.';
      if (msg.includes('403') || msg.toLowerCase().includes('admin')) {
        router.replace('/overview');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 text-slate-800 font-sans">
      <div className="mx-auto max-w-7xl space-y-8">
        <Link
          href="/overview"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header & Quick Status Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-md bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                  ADMIN CONTROL CENTER
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> System Operational
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Platform Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                Manage user access & roles, monitor platform intelligence & threat trends, configure AI models, and review queue reports.
              </p>
            </div>
            
            {statsData && (
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/15">
                  <p className="text-xs text-slate-400">Total Scans</p>
                  <p className="text-xl font-bold text-white">{statsData.totals.scans}</p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/15">
                  <p className="text-xs text-slate-400">Pending Reviews</p>
                  <p className="text-xl font-bold text-amber-400">{statsData.totals.reports_pending}</p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/15">
                  <p className="text-xs text-slate-400">Predatory Co.</p>
                  <p className="text-xl font-bold text-red-400">{statsData.totals.companies_predatory}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Toast */}
        {toast && (
          <div className={cls(
            'rounded-2xl px-5 py-3.5 text-sm font-medium shadow-md transition-all flex items-center gap-2',
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          )}>
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cls(
                'whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Tab Content */}
        {activeTab === 'Users Management' && <UsersManagementTab showToast={showToast} />}
        {activeTab === 'Platform Insights' && <PlatformInsightsTab />}
        {activeTab === 'Model Controls' && <ModelControlsTab showToast={showToast} />}
        {activeTab === 'Review Queue' && <ReviewQueueTab showToast={showToast} />}
        {activeTab === 'Data Health' && statsData && <DataHealthTab data={statsData} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 1: USERS MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────
function UsersManagementTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedUserActivity, setSelectedUserActivity] = useState<UserActivityResponse | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [editingRoleUser, setEditingRoleUser] = useState<UserAdminItem | null>(null);
  const [newRole, setNewRole] = useState<string>('user');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminUsers({
        q: searchQuery || undefined,
        role: selectedRoleFilter || undefined,
        status: selectedStatusFilter || undefined,
      });
      setUsers(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleStatus(user: UserAdminItem) {
    const targetStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserStatus(user.id, targetStatus);
      showToast(`User ${user.email} is now ${targetStatus}.`);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user status.', 'error');
    }
  }

  async function handleSaveRole() {
    if (!editingRoleUser) return;
    try {
      await updateUserRole(editingRoleUser.id, newRole);
      showToast(`Updated ${editingRoleUser.email} role to ${newRole.toUpperCase()}.`);
      setEditingRoleUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user role.', 'error');
    }
  }

  async function handleViewActivity(user: UserAdminItem) {
    setLoadingActivity(true);
    try {
      const act = await getUserActivity(user.id);
      setSelectedUserActivity(act);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load user activity.', 'error');
    } finally {
      setLoadingActivity(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button
          onClick={fetchUsers}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          Refresh Users
        </button>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading platform users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Scans</th>
                  <th className="px-6 py-4 text-center">Reports</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.full_name || '—'}</p>
                          <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Chip
                        text={u.role}
                        cls={
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'recruiter'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Chip
                        text={u.status}
                        cls={
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">{u.scan_count}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">{u.report_count}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewActivity(u)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Activity
                        </button>
                        <button
                          onClick={() => {
                            setEditingRoleUser(u);
                            setNewRole(u.role);
                          }}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={cls(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            u.status === 'active'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          )}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900">Change User Role</h3>
            <p className="text-sm text-slate-500">
              Updating role for <span className="font-semibold text-slate-800">{editingRoleUser.email}</span>.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-slate-500">Select Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="user">User (Standard Access)</option>
                <option value="recruiter">Recruiter / Employer</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingRoleUser(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Activity Modal */}
      {selectedUserActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">User Activity Log</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedUserActivity.user_id}</p>
              </div>
              <button
                onClick={() => setSelectedUserActivity(null)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Recent Scans ({selectedUserActivity.scans.length})</h4>
              {selectedUserActivity.scans.length === 0 ? (
                <p className="text-xs text-slate-400">No scan history recorded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedUserActivity.scans.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 capitalize">{s.scan_type.replace(/_/g, ' ')} Scan</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{s.input_summary}</p>
                      </div>
                      <div className="text-right">
                        <Chip
                          text={`${s.risk_score}% ${s.risk_category}`}
                          cls={s.risk_category === 'high' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(s.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Submitted Reports ({selectedUserActivity.reports.length})</h4>
              {selectedUserActivity.reports.length === 0 ? (
                <p className="text-xs text-slate-400">No community reports submitted.</p>
              ) : (
                <div className="space-y-2">
                  {selectedUserActivity.reports.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{r.title}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{r.report_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="text-right">
                        <Chip text={r.status} cls="bg-amber-100 text-amber-800" />
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 2: PLATFORM INSIGHTS
// ──────────────────────────────────────────────────────────────────────────────
function PlatformInsightsTab() {
  const [insights, setInsights] = useState<AdminInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminInsights();
        setInsights(data);
      } catch {
        /* fallback handled gracefully */
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) return <p className="text-sm text-slate-500">Loading insights metrics…</p>;
  if (!insights) return <p className="text-sm text-red-500">Failed to load platform insights.</p>;

  const { user_metrics, threat_insights } = insights;
  const maxSignups = Math.max(...user_metrics.user_growth_trend.map((t) => t.signups), 1);

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Platform Users" value={user_metrics.total_users} note="registered profiles" />
        <StatCard label="30-Day Active Users" value={user_metrics.active_users_30d} note="executed scans or reports" color="border-indigo-200 bg-indigo-50/50" />
        <StatCard label="Total Scans Run" value={threat_insights.total_scans} note="all modules" />
        <StatCard label="High-Risk Detection Rate" value={`${threat_insights.high_risk_percentage}%`} note={`${threat_insights.high_risk_scans} flagged scans`} color="border-red-200 bg-red-50" />
      </div>

      {/* User Growth 30-Day Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-900">User Signup Growth (Last 30 Days)</h3>
        <div className="flex items-end gap-1 h-32 overflow-x-auto pt-4">
          {user_metrics.user_growth_trend.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[8px]" title={`${d.date}: ${d.signups} signups`}>
              <div className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600" style={{ height: `${maxSignups > 0 ? (d.signups / maxSignups) * 90 : 4}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>{user_metrics.user_growth_trend[0]?.date}</span>
          <span>{user_metrics.user_growth_trend[user_metrics.user_growth_trend.length - 1]?.date}</span>
        </div>
      </div>

      {/* Risk Distribution & Top Active Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Threat Level Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Scan Threat Risk Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-700">High Risk Flagged</span>
                <span className="text-slate-800">{threat_insights.high_risk_scans}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${threat_insights.total_scans > 0 ? (threat_insights.high_risk_scans / threat_insights.total_scans) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">Medium Risk / Caution</span>
                <span className="text-slate-800">{threat_insights.medium_risk_scans}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${threat_insights.total_scans > 0 ? (threat_insights.medium_risk_scans / threat_insights.total_scans) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Low Risk / Verified</span>
                <span className="text-slate-800">{threat_insights.low_risk_scans}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${threat_insights.total_scans > 0 ? (threat_insights.low_risk_scans / threat_insights.total_scans) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Users */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-900">Top Active Power Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b pb-2">
                <tr>
                  <th className="text-left pb-2">User</th>
                  <th className="text-right pb-2">Scans Performed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {user_metrics.top_power_users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-800">{u.full_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                    </td>
                    <td className="py-2.5 text-right font-bold text-indigo-600">{u.scans_count}</td>
                  </tr>
                ))}
                {user_metrics.top_power_users.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-slate-400">No active scan metrics yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 3: MODEL CONTROLS & SANDBOX
// ──────────────────────────────────────────────────────────────────────────────
function ModelControlsTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sandbox state
  const [testText, setTestText] = useState('Urgent job offer! Wire transfer $200 for your certificate before starting unpaid training on Telegram.');
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getModelConfig();
        setConfig(data);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load model config.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveConfig() {
    if (!config) return;
    setIsSaving(true);
    try {
      const updated = await updateModelConfig(config);
      setConfig(updated);
      showToast('AI Model Configuration & Risk Thresholds updated successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update config.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRunTest() {
    if (!testText.trim()) return;
    setIsTesting(true);
    try {
      const res = await testModelConfig(testText);
      setTestResult(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Model test failed.', 'error');
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading AI model settings…</p>;
  if (!config) return <p className="text-sm text-red-500">Failed to load configuration.</p>;

  return (
    <div className="space-y-8">

      {/* Model Controls Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">AI Model & Scoring Controls</h3>
            <p className="text-xs text-slate-500">Adjust risk thresholds, active LLM engines, scoring weights, and prompt guardrails.</p>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving Settings…' : 'Save Config Changes'}
          </button>
        </div>

        {/* Threshold Sliders */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-slate-700">Job Fraud Risk Threshold</label>
              <span className="text-sm font-extrabold text-indigo-600">{config.job_risk_threshold}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              value={config.job_risk_threshold}
              onChange={(e) => setConfig({ ...config, job_risk_threshold: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400">Scans scoring above this value get flagged as High Risk Job Scam.</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-slate-700">Email Phishing Risk Threshold</label>
              <span className="text-sm font-extrabold text-indigo-600">{config.email_risk_threshold}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              value={config.email_risk_threshold}
              onChange={(e) => setConfig({ ...config, email_risk_threshold: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400">Scans scoring above this value trigger Phishing Risk warning.</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-slate-700">Company Scam Risk Threshold</label>
              <span className="text-sm font-extrabold text-indigo-600">{config.company_risk_threshold}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              value={config.company_risk_threshold}
              onChange={(e) => setConfig({ ...config, company_risk_threshold: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400">Companies with risk higher than this are listed under Predatory Watchlist.</p>
          </div>
        </div>

        {/* LLM Engine Selection & Scoring Weights */}
        <div className="grid gap-6 md:grid-cols-2">
          
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Active LLM Provider Engine</label>
            <div className="grid gap-3">
              {[
                { id: 'gemini-1.5-flash', name: 'Google Gemini 1.5 Flash (Recommended)', desc: 'Ultra-fast structured threat detection' },
                { id: 'gemini-1.5-pro', name: 'Google Gemini 1.5 Pro', desc: 'Deep contextual reasoning for complex scams' },
                { id: 'heuristic-hybrid', name: 'DistilBERT + Heuristic Hybrid Engine', desc: 'Local rule-based classifier engine' },
              ].map((provider) => (
                <label
                  key={provider.id}
                  className={cls(
                    'flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all',
                    config.active_llm_provider === provider.id
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <input
                    type="radio"
                    name="llm_provider"
                    value={provider.id}
                    checked={config.active_llm_provider === provider.id}
                    onChange={(e) => setConfig({ ...config, active_llm_provider: e.target.value })}
                    className="mt-1 accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{provider.name}</p>
                    <p className="text-xs text-slate-500">{provider.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Hybrid Scoring Component Weights</label>
            <div className="space-y-4 rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Keyword Rule Heuristics</span>
                  <span className="font-bold text-slate-900">{Math.round(config.weight_keywords * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={config.weight_keywords}
                  onChange={(e) => setConfig({ ...config, weight_keywords: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Vector Embedding Similarity</span>
                  <span className="font-bold text-slate-900">{Math.round(config.weight_embeddings * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={config.weight_embeddings}
                  onChange={(e) => setConfig({ ...config, weight_embeddings: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>LLM Deep Intelligence Score</span>
                  <span className="font-bold text-slate-900">{Math.round(config.weight_llm * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={config.weight_llm}
                  onChange={(e) => setConfig({ ...config, weight_llm: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

        </div>

        {/* System Prompt Override */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">AI Threat Detection System Prompt Guardrails</label>
          <textarea
            rows={3}
            value={config.system_prompt_override || ''}
            onChange={(e) => setConfig({ ...config, system_prompt_override: e.target.value })}
            className="w-full rounded-2xl border border-slate-300 p-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Interactive Model Sandbox */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            🧪 Interactive AI Model Testing Playground
          </h3>
          <p className="text-xs text-slate-500">Test sample job or communication text against active/draft model parameters live.</p>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Paste text to test risk evaluation..."
            className="w-full rounded-2xl border border-slate-300 p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleRunTest}
            disabled={isTesting}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isTesting ? 'Evaluating Model Output…' : 'Run Live Model Evaluation'}
          </button>
        </div>

        {testResult && (
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Engine: {testResult.active_provider}</span>
              <Chip
                text={`${testResult.risk_score}% ${testResult.risk_category}`}
                cls={testResult.risk_category === 'high' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}
              />
            </div>
            <p className="text-sm font-medium text-slate-800">{testResult.explanation}</p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600 space-y-1">
              <p>Keyword Score: {testResult.breakdown.keyword_score}</p>
              <p>Vector Embedding Score: {testResult.breakdown.embedding_similarity}</p>
              <p>LLM Confidence Score: {testResult.breakdown.llm_confidence}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 4: REVIEW QUEUE
// ──────────────────────────────────────────────────────────────────────────────
function ReviewQueueTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reviewed, setReviewed] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingRes, reviewedRes] = await Promise.all([
        getReports({ status: 'pending', limit: 50 }),
        getReports({ limit: 30 }),
      ]);
      setReports(pendingRes.results);
      setReviewed(reviewedRes.results.filter((r) => r.status !== 'pending').slice(0, 20));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load reports queue.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setReviewingId(id);
    try {
      await reviewReport(id, action, notes[id]);
      showToast(`Report ${action}d successfully.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Review failed.', 'error');
    } finally {
      setReviewingId(null);
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading reports queue…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-base font-bold text-slate-900">
          Pending Community Fraud Reports ({reports.length})
        </h3>
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            🎉 Queue clear! No pending community reports awaiting review.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.title || '(no title)'}</span>
                    <Chip text={r.report_type.replace(/_/g, ' ')} cls="bg-slate-200 text-slate-700" />
                  </div>
                  <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-500">Target Reference: <span className="font-mono text-slate-700">{r.target_reference}</span></p>
                <p className="text-sm text-slate-700">{r.description}</p>
                
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Resolution note (optional for approve, required for reject)"
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleReview(r.id, 'approve')}
                    disabled={reviewingId === r.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(r.id, 'reject')}
                    disabled={reviewingId === r.id}
                    className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="mb-4 text-base font-bold text-slate-900">Recently Reviewed History</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewed.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{r.title || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{r.report_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <Chip text={r.status} cls={r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 5: DATA & SYSTEM HEALTH
// ──────────────────────────────────────────────────────────────────────────────
function DataHealthTab({ data }: { data: AdminStatsResult }) {
  const { row_counts, recent_feedback } = data;
  const thumbs_up = recent_feedback.filter((f) => f.accurate === true).length;
  const thumbs_down = recent_feedback.filter((f) => f.accurate === false).length;
  const total_fb = thumbs_up + thumbs_down;
  const accuracy_pct = total_fb > 0 ? Math.round((thumbs_up / total_fb) * 100) : null;

  return (
    <div className="space-y-8">
      {/* Database Row Counts */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-900">Database Table Row Counts</h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(row_counts).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs text-slate-500 capitalize">{k.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-extrabold text-slate-900">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Feedback */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base font-bold text-slate-900">User Verdict Accuracy Feedback</h3>
        <p className="mb-4 text-sm text-slate-500">Live feedback ratings submitted by users for scanner predictions.</p>

        {total_fb === 0 ? (
          <p className="text-sm text-slate-400">No feedback submitted yet.</p>
        ) : (
          <div className="flex items-center gap-8 mb-6">
            <div>
              <p className="text-3xl font-extrabold text-emerald-600">👍 {thumbs_up}</p>
              <p className="text-xs text-slate-500 mt-1">Accurate Ratings</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-red-500">👎 {thumbs_down}</p>
              <p className="text-xs text-slate-500 mt-1">Inaccurate Ratings</p>
            </div>
            {accuracy_pct !== null && (
              <div>
                <p className="text-3xl font-extrabold text-indigo-600">{accuracy_pct}%</p>
                <p className="text-xs text-slate-500 mt-1">Overall Accuracy Score</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
