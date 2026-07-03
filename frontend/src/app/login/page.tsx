'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';

const dummyLoginId = 'test.user@trustlens.ai';
const dummyPassword = 'Test@1234';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'institution' | 'user'>('institution');
  const [email, setEmail] = useState(dummyLoginId);
  const [password, setPassword] = useState(dummyPassword);
  const [errorMessage, setErrorMessage] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isValidLogin = email.trim().toLowerCase() === dummyLoginId && password === dummyPassword;

    if (!isValidLogin) {
      setErrorMessage('Use the temporary test login ID and password shown on the page.');
      return;
    }

    setErrorMessage('');
    router.push('/institutional-dashboard');
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
      <div className="relative">
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
              <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5">
                Back home
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <Users className="h-4 w-4 text-red-300" />
              One secure login for both access types
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              TrustLens.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Choose your role, enter your credentials, and continue to the right dashboard.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
                <div className="flex items-center gap-3 text-white">
                  <Building2 className="h-5 w-5 text-cyan-300" />
                  <span className="font-semibold">Institution</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">For placement offices, HR, and compliance teams.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
                <div className="flex items-center gap-3 text-white">
                  <UserRound className="h-5 w-5 text-red-300" />
                  <span className="font-semibold">User</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">For candidates and job seekers using the trust tools.</p>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-orange-500 to-cyan-400" />
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

            <form className="relative mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  Select role
                </span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as 'institution' | 'user')}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="institution">Institution</option>
                  <option value="user">User</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Login ID / Email address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                />
                <p className="text-xs text-slate-500">Temporary test login ID: {dummyLoginId}</p>
              </label>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={dummyPassword}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                />
                <p className="text-xs text-slate-500">Temporary test password: {dummyPassword}</p>
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-400">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-slate-950 text-red-500 focus:ring-red-500/30" />
                  Remember me
                </label>
                <Link href="#" className="font-medium text-red-300 transition hover:text-red-200">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:brightness-110">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}