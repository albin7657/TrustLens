'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-slate-900/90 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-white/10 p-6">
          <Link href="/" className="text-xl font-bold text-white">
            RecruitShield AI
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-red-500/20 text-red-300'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-300">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">User</p>
              <p className="truncate text-xs text-slate-400">user@recruitshield.ai</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
