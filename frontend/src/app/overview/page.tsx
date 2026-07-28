'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, UserRound, Building2, Mail, Archive,
  Megaphone, BarChart3, FileText, Bot, ArrowRight,
} from 'lucide-react';

interface UserData {
  full_name?: string | null;
  email?: string;
}

const MODULES = [
  { icon: Search, title: 'Fraud Scanner', description: 'Analyze a job posting for fraud risk and known scam similarity.', href: '/job-scanner' },
  { icon: UserRound, title: 'Recruiter Verification', description: 'Check a recruiter against domain and prior records.', href: '/recruiter-verification' },
  { icon: Building2, title: 'Company Verification', description: 'Assess a company or website’s WHOIS, SSL, and trust score.', href: '/company-verification' },
  { icon: Mail, title: 'Communication Analyzer', description: 'Check emails, SMS, or chat messages for phishing.', href: '/communication-analyzer' },
  { icon: Archive, title: 'Trust Repository', description: 'Search verified companies, recruiters, and reports.', href: '/trust-repository' },
  { icon: Megaphone, title: 'Community Reports', description: 'Report a scam or review pending community reports.', href: '/community-reports' },
  { icon: BarChart3, title: 'Institutional Dashboard', description: 'Placement-office view of fraud and verification trends.', href: '/institutional-dashboard' },
  { icon: FileText, title: 'Reporting Assistant', description: 'Generate an evidence summary for cybercrime reporting.', href: '/reporting-assistant' },
  { icon: Bot, title: 'RAG Assistant', description: 'Ask questions grounded in our threat intelligence.', href: '/rag-assistant' },
];

export default function Overview() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 lg:p-12 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900">Welcome back, {displayName}.</h1>
        <p className="mb-10 text-lg text-slate-600 max-w-2xl">
          Access the complete suite of trust and fraud-detection tools. Select a module below to begin your analysis.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/80 hover:bg-white/90 hover:shadow-xl"
              >
                <div className="absolute -right-6 -top-6 opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.08]">
                  <Icon className="h-32 w-32" />
                </div>
                
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-inner group-hover:from-indigo-50 group-hover:to-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="relative z-10 mt-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 tracking-tight">
                    {mod.title}
                    <ArrowRight className="h-4 w-4 text-indigo-500 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">{mod.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
