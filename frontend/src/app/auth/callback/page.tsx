'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authentication failed. Please try again.');
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    // Exchange the code for a session
    async function exchangeCode() {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/exchange-code?code=${code}`, {
          method: 'POST',
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || 'Failed to complete authentication.');
          return;
        }

        // Store tokens and redirect
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        router.push('/institutional-dashboard');
      } catch {
        setError('Could not connect to the server. Please try again.');
      }
    }

    exchangeCode();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl text-center">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-orange-500 to-cyan-400" />

          {error ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mb-6">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Authentication Failed</h2>
              <p className="mt-4 text-slate-300">{error}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:brightness-110"
                >
                  Back to Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5"
                >
                  Sign up
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80 mb-6">
                <ShieldCheck className="h-8 w-8 text-red-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white">Authenticating</h2>
              <p className="mt-4 text-slate-300">Completing your sign-in, please wait...</p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-6 w-6 text-red-400 animate-spin" />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-red-400" />
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
