import Link from 'next/link';
import {ShieldCheck} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
            <div>
              <p className="text-lg font-bold text-white">TrustLens</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white">Home</Link>
            <Link href="#about" className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white">About</Link>
            <Link href="#contact" className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white">Contact Us</Link>
          </div>

          <Link href="/login" className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <div className="inline-flex rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-red-300">
              Recruitment Fraud Detection & Trust Intelligence Platform
            </div>
            <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-7xl">
              TrustLens
            </h1>
            <p className="mt-6 text-2xl text-slate-300 sm:text-3xl">
              Detect Fake Jobs, Verify Recruiters, Protect Careers
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
              Advanced AI-powered platform for detecting recruitment scams, verifying companies and recruiters, and protecting job seekers from fraudulent activities.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/login" className="rounded-full bg-red-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-600">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-white/10 bg-slate-900/55 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-red-300">About</p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">A focused trust platform for recruitment safety.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              TrustLens helps job seekers and institutions review risk signals, verify identities, and keep recruitment interactions safer.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Contact Us</p>
              <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Need access, support, or a demo?</h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
                Reach out for account access, institutional onboarding, or product questions.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">Name</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20" placeholder="Your name" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">Email</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20" placeholder="you@example.com" />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-300">Message</span>
                  <textarea className="min-h-36 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20" placeholder="Tell us what you need" />
                </label>
              </div>
              <button className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
