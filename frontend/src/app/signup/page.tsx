'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, User, Users, Eye, EyeOff, CheckCircle2, Building2, UserRound, AlertTriangle, LogIn } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ── Smart error parser ──────────────────────────────────────────────────────
type ParsedError = {
  type: 'account_exists' | 'provider_mismatch_google' | 'generic';
  message: string;
};

function parseErrorDetail(detail: string): ParsedError {
  if (detail.startsWith('PROVIDER_MISMATCH:google|')) {
    return { type: 'provider_mismatch_google', message: detail.split('|')[1] };
  }
  if (detail.startsWith('ACCOUNT_EXISTS:email|')) {
    return { type: 'account_exists', message: detail.split('|')[1] };
  }
  return { type: 'generic', message: detail };
}

// ── Smart error banner component ────────────────────────────────────────────
function DuplicateAccountBanner({ error }: { error: ParsedError }) {
  if (error.type === 'provider_mismatch_google') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 mb-1">Account registered via Google</p>
            <p className="text-amber-700 leading-relaxed">{error.message}</p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-800"
            >
              <LogIn className="h-3.5 w-3.5" />
              Go to Login &amp; Sign in with Google
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (error.type === 'account_exists') {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 mb-1">Account already exists</p>
            <p className="text-blue-700 leading-relaxed">{error.message}</p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
            >
              <LogIn className="h-3.5 w-3.5" />
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error.message}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [role, setRole] = useState<'institution' | 'user'>('institution');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/overview');
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
    setParsedError(null);

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
        body: JSON.stringify({ email, password, full_name: fullName || undefined, requested_role: role }),
      });

      const data = await res.json();

      if (!res.ok) {
        const parsed = parseErrorDetail(data.detail || 'Sign-up failed. Please try again.');
        if (parsed.type !== 'generic') {
          setParsedError(parsed);
        } else {
          setErrorMessage(parsed.message);
        }
        setIsLoading(false);
        return;
      }

      // If we got tokens, store them and redirect
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('user_role', role === 'institution' ? 'admin' : role);
        router.push('/overview');
      } else {
        // Email confirmation required — persist role for when they log in
        localStorage.setItem('user_role', role === 'institution' ? 'admin' : role);

        setIsSuccess(true);
      }
    } catch {
      setErrorMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    if (role !== 'user') {
      setErrorMessage('Google Sign-up is available for candidate Users only.');
      return;
    }
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
      <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Check your email</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              We&apos;ve sent a confirmation link to <span className="font-semibold text-slate-900">{email}</span>. Click the link in the email to activate your account.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
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
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">TrustLens</p>
            </div>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
              Log in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8 lg:py-16">
        {/* Left side info */}
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <Users className="h-4 w-4" />
            Join the trusted recruitment network
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Create your<br />account.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Sign up to access AI-powered scam detection, recruiter verification, and recruitment trust intelligence.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Instant fraud detection on job postings',
              'Verify recruiters and companies in seconds',
              'Community-driven scam reporting',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-slate-600">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signup form card */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Get started</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Sign up</h2>
            </div>
          </div>

          {/* Role selector cards */}
          <div className="mt-6 space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserRound className="h-4 w-4" />
              Select role
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('institution')}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                  role === 'institution'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Building2 className="h-4 w-4" />
                  Institution
                </div>
                <p className="text-xs text-slate-500">Placement officers and teams</p>
              </button>
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                  role === 'user'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserRound className="h-4 w-4" />
                  User
                </div>
                <p className="text-xs text-slate-500">Candidates and job seekers</p>
              </button>
            </div>
          </div>

          {/* Google OAuth Button - Available ONLY for User role */}
          {role === 'user' ? (
            <>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
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
              <div className="mt-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-widest text-slate-400">or sign up with email</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-900 block mb-1">Institutional Access Notice</span>
              Institution & Admin accounts require email & password authentication. Google Sign-in is reserved for candidate User accounts.
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>

            {/* Full Name */}
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="h-4 w-4" />
                Full name <span className="text-xs text-slate-400">(optional)</span>
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>

            {/* Email */}
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="h-4 w-4" />
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>

            {/* Password */}
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <LockKeyhole className="h-4 w-4" />
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {[
                  { check: passwordChecks.length, label: '8+ characters' },
                  { check: passwordChecks.uppercase, label: 'Uppercase letter' },
                  { check: passwordChecks.lowercase, label: 'Lowercase letter' },
                  { check: passwordChecks.number, label: 'Number' },
                ].map((item) => (
                  <span key={item.label} className={`flex items-center gap-1.5 text-xs ${item.check ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.check ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <LockKeyhole className="h-4 w-4" />
                Confirm password
              </span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                    confirmPassword.length > 0 && !passwordChecks.match
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-slate-300 focus:border-slate-500 focus:ring-slate-900/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordChecks.match && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </label>

            {parsedError && <DuplicateAccountBanner error={parsedError} />}
            {!parsedError && errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
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

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-slate-800 transition hover:text-slate-900">
                Log in
              </Link>
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
