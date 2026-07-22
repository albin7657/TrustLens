'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, UserRound, Building2, Globe2, Mail, Archive, Brain,
  Megaphone, BarChart3, FileText, Bot, ArrowRight,
} from 'lucide-react';

interface UserData {
  full_name?: string | null;
  email?: string;
}

const MODULES = [
  { icon: Search, title: 'Fraud Scanner', description: 'Analyze a job posting for fraud risk.', href: '/job-scanner' },
  { icon: UserRound, title: 'Recruiter Verification', description: 'Check a recruiter against domain and prior records.', href: '/recruiter-verification' },
  { icon: Building2, title: 'Company Verification', description: 'Assess a company’s WHOIS, SSL, and trust score.', href: '/company-verification' },
  { icon: Globe2, title: 'Website Trust Assessment', description: 'Scan a website for security and typosquatting risk.', href: '/website-scanner' },
  { icon: Mail, title: 'Communication Analyzer', description: 'Check emails, SMS, or chat messages for phishing.', href: '/communication-analyzer' },
  { icon: Archive, title: 'Trust Repository', description: 'Search verified companies, recruiters, and reports.', href: '/trust-repository' },
  { icon: Brain, title: 'Scam Similarity', description: 'Compare a posting against known scam campaigns.', href: '/scam-similarity' },
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
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Welcome back, {displayName}.</h1>
        <p className="mb-8 text-slate-600">
          Here&apos;s every trust and fraud-detection tool available to you. Pick one to get started.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 flex items-center gap-1.5 font-semibold text-slate-900">
                  {mod.title}
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{mod.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
