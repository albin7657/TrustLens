'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}. Please try again.`);
      return;
    }

    // ── Implicit flow: Supabase sends tokens as URL hash fragments ──────────
    // Hash fragments are never sent to the server, so we parse them here.
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // strip leading '#'
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const tokenType = params.get('token_type');

      if (accessToken) {
        // Fetch user profile from backend using the token before committing login
        fetch(`${BACKEND_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((r) => r.json())
          .then((user) => {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
            if (tokenType) localStorage.setItem('token_type', tokenType);
            localStorage.setItem('user', JSON.stringify(user));
            
            const savedRole = localStorage.getItem('user_role');
            if (!savedRole) {
              localStorage.setItem('user_role', user.role === 'admin' ? 'admin' : (user.role || 'user'));
            }

            router.push('/overview');
          })
          .catch(() => {
            setError('Failed to verify user profile. Please try again.');
          });
        return;
      }
    }

    // ── PKCE flow: Supabase sends a ?code= query parameter ─────────────────
    if (!code) {
      setError('No authorization code received. Please try signing in again.');
      return;
    }

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

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const savedRole = localStorage.getItem('user_role');
        if (!savedRole) {
          localStorage.setItem('user_role', data.user?.role === 'admin' ? 'admin' : (data.user?.role || 'user'));
        }

        router.push('/overview');
      } catch {
        setError('Could not connect to the server. Please try again.');
      }
    }

    exchangeCode();
  }, [searchParams, router]);

  const isEmailMismatch = error.startsWith('PROVIDER_MISMATCH:email|');
  const displayErrorMessage = isEmailMismatch ? error.split('|')[1] : error;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm text-center">
          {error ? (
            <>
              <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${isEmailMismatch ? 'bg-amber-50' : 'bg-red-50'}`}>
                <AlertCircle className={`h-8 w-8 ${isEmailMismatch ? 'text-amber-600' : 'text-red-500'}`} />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {isEmailMismatch ? 'Account Uses Email Sign-In' : 'Authentication Failed'}
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">{displayErrorMessage}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Go to Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Sign up
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <ShieldCheck className="h-8 w-8 animate-pulse text-slate-700" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Authenticating</h2>
              <p className="mt-4 text-slate-600">Completing your sign-in, please wait...</p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
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
        <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
