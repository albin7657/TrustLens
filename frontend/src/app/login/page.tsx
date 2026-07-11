'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, UserRound, Users, Eye, EyeOff } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'institution' | 'user'>('institution');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/institutional-dashboard');
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.detail || 'Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      // Store tokens and user data
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('user_role', role);

      router.push('/institutional-dashboard');
    } catch {
      setErrorMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/google`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage('Failed to initiate Google sign-in.');
      }
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 cyber-grid-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,245,255,0.15),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(255,107,53,0.12),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(255,0,64,0.08),_transparent_25%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]\" />
      <div className="relative">
        <header className="border-b border-cyan-500/20 bg-slate-950/55 backdrop-blur-xl cyber-border">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-orange-500 text-white shadow-lg shadow-cyan-500/40">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-white cyber-text-glow">TrustLens</p>
              </div>
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/signup" className="rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 cyber-pulse">
                Sign up
              </Link>
              <Link href="/" className="rounded-full border border-cyan-500/30 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10 cyber-border">
                Back home
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 cyber-border">
              <Users className="h-4 w-4 text-cyan-300" />
              One secure login for both access types
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              TrustLens.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Choose your role, enter your credentials, and continue to the right dashboard.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 backdrop-blur cyber-border">
                <div className="flex items-center gap-3 text-white">
                  <Building2 className="h-5 w-5 text-cyan-300" />
                  <span className="font-semibold">Institution</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">For placement offices, HR, and compliance teams.</p>
              </div>
              <div className="rounded-2xl border border-orange-500/20 bg-slate-900/70 p-5 backdrop-blur cyber-border">
                <div className="flex items-center gap-3 text-white">
                  <UserRound className="h-5 w-5 text-orange-300" />
                  <span className="font-semibold">User</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">For candidates and job seekers using the trust tools.</p>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-900/85 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-8 cyber-border">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-orange-500 to-red-400" />
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-white">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Secure access</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Login</h2>
              </div>
            </div>

            {/* Google OAuth Button */}
            <div className="relative mt-8">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/70 px-4 py-3.5 text-sm font-medium text-white transition hover:bg-cyan-500/10 hover:border-cyan-500/50 cyber-border"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-cyan-500/20" />
              <span className="text-xs font-medium uppercase tracking-widest text-cyan-400">or</span>
              <div className="h-px flex-1 bg-cyan-500/20" />
            </div>

            <form className="relative mt-6 space-y-4" onSubmit={handleSubmit}>
              {/* Role selector cards */}
              <div className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  <UserRound className="h-4 w-4 text-cyan-400" />
                  Select role
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('institution')}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                      role === 'institution'
                        ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/20 cyber-border'
                        : 'border-cyan-500/20 bg-slate-950/70 hover:border-cyan-500/40 hover:bg-cyan-500/10 cyber-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-white">
                      <Building2 className={`h-4 w-4 ${role === 'institution' ? 'text-cyan-300' : 'text-slate-400'}`} />
                      Institution
                    </div>
                    <p className="text-xs text-slate-400">Placement officers and teams</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                      role === 'user'
                        ? 'border-orange-400/60 bg-orange-500/10 ring-1 ring-orange-400/20 cyber-border'
                        : 'border-cyan-500/20 bg-slate-950/70 hover:border-cyan-500/40 hover:bg-cyan-500/10 cyber-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-white">
                      <UserRound className={`h-4 w-4 ${role === 'user' ? 'text-red-300' : 'text-slate-400'}`} />
                      User
                    </div>
                    <p className="text-xs text-slate-400">Candidates and job seekers</p>
                  </button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  <Mail className="h-4 w-4 text-cyan-400" />
                  Email address
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20 cyber-border"
                />
              </label>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  <LockKeyhole className="h-4 w-4 text-cyan-400" />
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/70 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20 cyber-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 cyber-border">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-cyan-400">
                  <input type="checkbox" className="h-4 w-4 rounded border-cyan-500/30 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30" />
                  Remember me
                </label>
                <Link href="#" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/50 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed cyber-pulse"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-400">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                  Sign up
                </Link>
              </p>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}