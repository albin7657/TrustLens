'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, Building2, LockKeyhole, Mail, UserRound, Eye, EyeOff, AlertTriangle, LogIn } from 'lucide-react';
import TrustLensLogo from '@/components/TrustLensLogo';
import BackgroundVideo from '@/components/BackgroundVideo';

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
function DuplicateAccountBanner({ error, onGoogleLogin }: { error: ParsedError; onGoogleLogin?: () => void }) {
  if (error.type === 'provider_mismatch_google') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-sm backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300 mb-1">This account uses Google Sign-In</p>
            <p className="text-amber-200/90 leading-relaxed">{error.message}</p>
            {onGoogleLogin && (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/30"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in with Google instead
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (error.type === 'account_exists') {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-sm backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" />
          <div>
            <p className="font-semibold text-cyan-300 mb-1">Account already exists</p>
            <p className="text-cyan-200/90 leading-relaxed">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300 backdrop-blur-xl">
      {error.message}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'institution' | 'user'>('institution');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/overview');
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setParsedError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const parsed = parseErrorDetail(data.detail || 'Invalid credentials. Please try again.');
        if (parsed.type !== 'generic') {
          setParsedError(parsed);
        } else {
          setErrorMessage(parsed.message);
        }
        setIsLoading(false);
        return;
      }

      // Fetch user profile info
      const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const meData = await meRes.json();
      const dbRole: string = meData.role || 'user';

      const isUserAccount = dbRole === 'user';
      const isAdminAccount = dbRole === 'admin';

      if (role === 'user' && !isUserAccount) {
        setErrorMessage(
          'This account has institution or admin access. Please select the "Institution" role to log in.'
        );
        setIsLoading(false);
        return;
      }

      if (role === 'institution' && !isAdminAccount) {
        setErrorMessage(
          'This account does not have institution or admin access. ' +
          'Please register as an Institution first, or select "User" to log in.'
        );
        setIsLoading(false);
        return;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(meData));
      localStorage.setItem('user_role', dbRole);

      router.push('/overview');

    } catch {
      setErrorMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (role !== 'user') {
      setErrorMessage('Google Sign-in is available for candidate Users only.');
      return;
    }
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
    <main className="min-h-screen bg-[#080c14] text-slate-100 relative overflow-hidden">
      {/* Fullscreen background video */}
      <BackgroundVideo videoSrc="/videos/cybersecurity_showcase_video.mp4" variant="ambient" />
      {/* Header */}
      <header className="relative z-10 border-b border-white/15 bg-slate-950/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="group">
            <TrustLensLogo size="md" />
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500"
            >
              Sign up
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-700/80 bg-slate-900/60 px-5 py-2 text-sm font-medium text-slate-300 backdrop-blur-md transition hover:border-cyan-500/50 hover:text-white"
            >
              Back home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Section */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
            Welcome back to{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-100 to-blue-300 bg-clip-text text-transparent">
              TrustLens
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/90 font-semibold">
            Choose your role, enter your credentials, and access your verified trust intelligence workspace.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-slate-950/30 p-5 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-3 text-cyan-400">
                <Building2 className="h-5 w-5" />
                <span className="font-bold text-white">Institution</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">For placement offices, HR leaders, and compliance teams.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/30 p-5 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-3 text-cyan-400">
                <UserRound className="h-5 w-5" />
                <span className="font-bold text-white">User</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">For candidates and job seekers scanning opportunities.</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <section className="rounded-[2.5rem] border border-white/20 bg-slate-950/50 p-7 backdrop-blur-2xl shadow-2xl sm:p-9">
          <div className="flex items-center gap-4">
            <TrustLensLogo size="lg" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Secure Access</p>
              <h2 className="mt-1 text-2xl font-bold text-white">Sign In</h2>
            </div>
          </div>

          {/* Role selector cards */}
          <div className="mt-6 space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <UserRound className="h-4 w-4 text-cyan-400" />
              Select role
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('institution')}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                  role === 'institution'
                    ? 'border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  Institution
                </div>
                <p className="text-xs text-slate-400">Placement officers & teams</p>
              </button>
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                  role === 'user'
                    ? 'border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <UserRound className="h-4 w-4 text-cyan-400" />
                  User
                </div>
                <p className="text-xs text-slate-400">Candidates & seekers</p>
              </button>
            </div>
          </div>

          {/* Google OAuth Button */}
          {role === 'user' ? (
            <>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:border-slate-700 hover:bg-slate-900 hover:text-white"
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

              <div className="mt-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">or email</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-400">
              <span className="font-semibold text-cyan-400 block mb-1">Institutional Access Notice</span>
              Institution accounts require email & password authentication.
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Mail className="h-4 w-4 text-cyan-400" />
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
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
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {parsedError && <DuplicateAccountBanner error={parsedError} onGoogleLogin={role === 'user' ? handleGoogleLogin : undefined} />}
            {!parsedError && errorMessage ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300 backdrop-blur-xl">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20" />
                Remember me
              </label>
              <Link href="#" className="font-medium text-cyan-400 transition hover:text-cyan-300">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  Continue to Workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-cyan-400 transition hover:text-cyan-300">
                Sign up
              </Link>
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}

