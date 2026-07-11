import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const highlights = [
  {
    title: "AI risk intelligence",
    text: "Detect suspicious signals in job posts, recruiter profiles, and domains before they impact your team.",
  },
  {
    title: "Executive-ready reporting",
    text: "Turn compliance findings into concise summaries for founders, HR leaders, and investors.",
  },
  {
    title: "Built for scale",
    text: "Support fast-moving hiring teams with workflows that are secure, reliable, and easy to trust.",
  },
];

const metrics = [
  { value: "24/7", label: "continuous screening" },
  { value: "3x", label: "faster review cycles" },
  { value: "100%", label: "trust-first workflows" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-800">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">
                TrustLens
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-500">
                Trust intelligence
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-slate-600 lg:flex">
            <Link href="#platform" className="transition hover:text-slate-900">
              Platform
            </Link>
            <Link href="#about" className="transition hover:text-slate-900">
              About
            </Link>
            <Link href="#contact" className="transition hover:text-slate-900">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Trusted by modern hiring and compliance teams
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Protect your hiring pipeline with calm, intelligent risk
              detection.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
              TrustLens helps founders, recruiters, and institutions verify
              opportunities, spot fraud patterns, and build credibility at scale
              without slowing down growth.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-slate-700"
              >
                Start free scan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#about"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Explore platform
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Signal overview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Confidence score: 94%
                  </h2>
                </div>
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { label: "Recruiter identity", value: "Verified" },
                  { label: "Domain reputation", value: "Low risk" },
                  { label: "Communication pattern", value: "Consistent" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="border-t border-slate-200 bg-white px-6 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Platform
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Designed for teams that value trust, speed, and clarity.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {highlights.map((item, index) => {
              const Icon = [Cpu, BarChart3, Users][index];
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="about"
        className="border-t border-slate-200 px-6 py-20 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              About
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
              A professional foundation for safer hiring decisions.
            </h2>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
            <p className="text-lg leading-8">
              TrustLens gives organizations a practical way to verify the
              people, companies, and communications behind every opportunity.
              Whether you are scaling a startup or managing a large hiring
              program, the platform brings clarity to decisions that affect
              trust, reputation, and growth.
            </p>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="border-t border-slate-200 bg-slate-50 px-6 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Contact
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Ready to make hiring safer and smarter?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Let’s talk about your workflow, your compliance needs, and how
                TrustLens can support your team.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-slate-700"
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
