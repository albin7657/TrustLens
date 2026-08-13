'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setIsChecking(false);
  }, [router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isChecking) {
    return <div className="min-h-screen bg-[#080c14]" />;
  }

  const showBackToHome = pathname !== '/overview';

  return (
    <div className="relative flex min-h-screen overflow-hidden text-slate-100 bg-[#080c14]">
      {/* Cyber ambient glows — matches landing/login page */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-64 border-r border-slate-800 bg-[#080c14]">
            <Sidebar mobile />
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-1 flex-col lg:ml-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 backdrop-blur-2xl lg:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          {showBackToHome && (
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-cyan-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
