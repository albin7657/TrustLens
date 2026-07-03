'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, ChevronDown, ShieldCheck } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';

const menuItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '🔍', label: 'Job Fraud Detection', href: '/job-scanner' },
  { icon: '👤', label: 'Recruiter Verification', href: '/recruiter-verification' },
  { icon: '🏢', label: 'Company Verification', href: '/company-verification' },
  { icon: '🌐', label: 'Website Scanner', href: '/website-scanner' },
  { icon: '📩', label: 'Communication Analyzer', href: '/communication-analyzer' },
  { icon: '🗄', label: 'Trust Repository', href: '/trust-repository' },
  { icon: '🧠', label: 'Scam Similarity', href: '/scam-similarity' },
  { icon: '🚨', label: 'Community Reports', href: '/community-reports' },
  { icon: '📊', label: 'Institutional Dashboard', href: '/institutional-dashboard' },
  { icon: '📄', label: 'Reporting Assistant', href: '/reporting-assistant' },
  { icon: '🤖', label: 'RAG Assistant', href: '/rag-assistant' },
];

interface UserData {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}); // best-effort server-side logout
      }
    } finally {
      // Always clear local state and redirect
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_role');
      setIsLoggingOut(false);
      router.push('/login');
    }
  }

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'Not signed in';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-slate-900/90 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-white/10 p-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">TrustLens</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-red-500/15 text-red-300 font-medium shadow-sm shadow-red-500/5'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section with Sign Out */}
        <div className="border-t border-white/10 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-950/50 px-3.5 py-3 transition hover:bg-slate-950/80"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 text-sm font-bold text-red-300">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{displayEmail}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30">
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
