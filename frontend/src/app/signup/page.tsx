'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, User, Users, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/institutional-dashboard');
    }
  }, [router]);
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!passwordChecks.length || !passwordChecks.uppercase || !passwordChecks.lowercase || !passwordChecks.number) {
      setErrorMessage('Password does not meet the requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.detail || 'Sign-up failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // If we got tokens, store them and redirect
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/institutional-dashboard');
      } else {
        // Email confirmation required
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/google`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage('Failed to initiate Google sign-up.');
      }
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl text-center">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-400" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              We&apos;ve sent a confirmation link to <span className="font-semibold text-white">{email}</span>. Click the link in the email to activate your account.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:brightness-110"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
      <div className="relative">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">TrustLens</p>
              </div>
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5">
                Log in
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8 lg:py-16">
          {/* Left side info */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <Users className="h-4 w-4 text-red-300" />
              Join the trusted recruitment network
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Create your<br />account.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Sign up to access AI-powered scam detection, recruiter verification, and recruitment trust intelligence.
            </p>

            <div className="mt-8 space-y-3">
              {[
                'Instant fraud detection on job postings',
                'Verify recruiters and companies in seconds',
                'Community-driven scam reporting',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-slate-300">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15">
                    <CheckCircle2 className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signup form card */}
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-orange-500 to-cyan-400" />
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-white">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Get started</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Sign up</h2>
              </div>
            </div>

            {/* Google OAuth Button */}
            <div className="relative mt-8">
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800/80 hover:border-white/20"
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
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">or sign up with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form className="relative mt-6 space-y-4" onSubmit={handleSubmit}>
              {/* Full Name */}
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <User className="h-4 w-4 text-slate-400" />
                  Full name <span className="text-slate-500 text-xs">(optional)</span>
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              {/* Email */}
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Email address
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              {/* Password */}
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
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

              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  {[
                    { check: passwordChecks.length, label: '8+ characters' },
                    { check: passwordChecks.uppercase, label: 'Uppercase letter' },
                    { check: passwordChecks.lowercase, label: 'Lowercase letter' },
                    { check: passwordChecks.number, label: 'Number' },
                  ].map((item) => (
                    <span key={item.label} className={`flex items-center gap-1.5 text-xs ${item.check ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.check ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Confirm Password */}
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  Confirm password
                </span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full rounded-2xl border bg-slate-950/70 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:ring-2 ${
                      confirmPassword.length > 0 && !passwordChecks.match
                        ? 'border-red-500/50 focus:border-red-400/60 focus:ring-red-500/20'
                        : 'border-white/10 focus:border-red-400/60 focus:ring-red-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordChecks.match && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </label>

              {errorMessage && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-red-300 transition hover:text-red-200">
                  Log in
                </Link>
              </p>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
