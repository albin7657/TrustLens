import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Cpu,
  Sparkles,
  Users,
  CheckCircle2,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import BackgroundVideo from '@/components/BackgroundVideo';
import TrustLensLogo from '@/components/TrustLensLogo';

const highlights = [
  {
    title: 'AI risk intelligence',
    text: 'Detect suspicious signals in job posts, recruiter profiles, and domains before they impact your team.',
  },
  {
    title: 'Executive-ready reporting',
    text: 'Turn compliance findings into concise summaries for founders, HR leaders, and investors.',
  },
  {
    title: 'Built for scale',
    text: 'Support fast-moving hiring teams with workflows that are secure, reliable, and easy to trust.',
  },
];

const metrics = [
  { value: '24/7', label: 'continuous screening' },
  { value: '3x', label: 'faster review cycles' },
  { value: '100%', label: 'trust-first workflows' },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080c14] text-slate-100">
      {/* Dynamic Hero Video Background */}
      <BackgroundVideo variant="hero" />

      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <Link href="/" className="group">
            <TrustLensLogo size="md" />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 lg:flex">
            <Link href="#platform" className="transition hover:text-cyan-400">
              Platform
            </Link>
            <Link href="#about" className="transition hover:text-cyan-400">
              About
            </Link>
            <Link href="#contact" className="transition hover:text-cyan-400">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-700/80 bg-slate-900/60 px-5 py-2 text-sm font-medium text-slate-200 backdrop-blur-md transition hover:border-cyan-500/50 hover:bg-slate-800/80 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-cyan-200 backdrop-blur-md shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/20">
            <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
            Trusted by modern hiring and compliance teams
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.12]">
            Protect your hiring pipeline with{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-100 to-indigo-300 bg-clip-text text-transparent">
              intelligent risk detection.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white sm:text-xl font-semibold opacity-90">
            TrustLens helps founders, recruiters, and institutions verify opportunities,
            spot fraud patterns, and build credibility at scale without slowing down growth.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-cyan-500/40 transition hover:from-cyan-400 hover:to-blue-500 hover:scale-105"
            >
              Start free scan
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#about"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-950/40 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-slate-950/60"
            >
              Explore platform
            </Link>
          </div>

          {/* Key capability pills - ultra translucent */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-slate-950/30 p-4 backdrop-blur-md shadow-xl hover:border-cyan-400/40">
              <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Fake Job Detection</span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-slate-950/30 p-4 backdrop-blur-md shadow-xl hover:border-cyan-400/40">
              <ShieldAlert className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Recruiter Verification</span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-slate-950/30 p-4 backdrop-blur-md shadow-xl hover:border-cyan-400/40">
              <FileCheck className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Company Trust Graph</span>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-slate-950/30 p-4 backdrop-blur-md shadow-xl transition hover:border-cyan-400/50"
              >
                <p className="text-3xl font-extrabold text-white">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-cyan-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Section - ultra translucent */}
      <section id="platform" className="relative z-10 border-t border-white/15 bg-slate-950/20 backdrop-blur-sm px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Platform
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Designed for teams that value trust, speed, and clarity.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {highlights.map((item, index) => {
              const Icon = [Cpu, BarChart3, Users][index];
              return (
                <div
                  key={item.title}
                  className="group rounded-3xl border border-white/15 bg-slate-950/30 p-6 backdrop-blur-md shadow-xl transition hover:border-cyan-400/50 hover:bg-slate-950/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section - ultra translucent */}
      <section id="about" className="relative z-10 border-t border-white/15 bg-slate-950/20 backdrop-blur-sm px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">About</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              A professional foundation for safer hiring decisions.
            </h2>
          </div>
          <div className="rounded-3xl border border-white/15 bg-slate-950/30 p-8 text-slate-200 backdrop-blur-md shadow-xl">
            <p className="text-lg leading-8 font-medium">
              TrustLens gives organizations a practical way to verify the people,
              companies, and communications behind every opportunity. Whether you are
              scaling a startup or managing a large hiring program, the platform brings
              clarity to decisions that affect trust, reputation, and growth.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section - ultra translucent */}
      <section id="contact" className="relative z-10 border-t border-white/15 bg-slate-950/20 backdrop-blur-sm px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/20 bg-slate-950/35 p-8 backdrop-blur-md shadow-2xl lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Contact</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Ready to make hiring safer and smarter?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-200 font-medium">
                Let’s talk about your workflow, your compliance needs, and how TrustLens can support your team.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-cyan-500/30 transition hover:from-cyan-400 hover:to-blue-500"
            >
              Request access
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


