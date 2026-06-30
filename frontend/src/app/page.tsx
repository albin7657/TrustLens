import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">RecruitShield AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-slate-300 transition-colors hover:text-white">Home</Link>
            <Link href="/job-scanner" className="text-sm text-slate-300 transition-colors hover:text-white">Job Scanner</Link>
            <Link href="/recruiter-verification" className="text-sm text-slate-300 transition-colors hover:text-white">Recruiter Verification</Link>
            <Link href="/company-verification" className="text-sm text-slate-300 transition-colors hover:text-white">Company Verification</Link>
            <Link href="/website-scanner" className="text-sm text-slate-300 transition-colors hover:text-white">Website Scanner</Link>
            <Link href="/communication-analyzer" className="text-sm text-slate-300 transition-colors hover:text-white">Communication Analyzer</Link>
            <Link href="/trust-repository" className="text-sm text-slate-300 transition-colors hover:text-white">Threat Intelligence</Link>
            <Link href="/community-reports" className="text-sm text-slate-300 transition-colors hover:text-white">Community Reports</Link>
            <Link href="/institutional-dashboard" className="text-sm text-slate-300 transition-colors hover:text-white">Dashboard</Link>
            <Link href="/rag-assistant" className="text-sm text-slate-300 transition-colors hover:text-white">Knowledge Assistant</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#" className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Login
            </Link>
            <Link href="#" className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-cyan-500/10"></div>
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <div className="inline-flex rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-red-300">
              Recruitment Fraud Detection & Trust Intelligence Platform
            </div>
            <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-7xl">
              RecruitShield AI
            </h1>
            <p className="mt-6 text-2xl text-slate-300 sm:text-3xl">
              Detect Fake Jobs, Verify Recruiters, Protect Careers
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
              Advanced AI-powered platform for detecting recruitment scams, verifying companies and recruiters, and protecting job seekers from fraudulent activities.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/job-scanner" className="rounded-full bg-red-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-600">
                Analyze Job
              </Link>
              <Link href="/company-verification" className="rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
                Verify Company
              </Link>
              <Link href="/community-reports" className="rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
                Report Scam
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="border-t border-white/10 bg-slate-900/50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-2xl font-bold text-white">Technology Stack</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">Frontend</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">React.js</span>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Tailwind CSS</span>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Chart.js</span>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Material UI</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">Backend</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-300">Flask / FastAPI</span>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-300">Python</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">AI/ML</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">Scikit-Learn</span>
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">XGBoost</span>
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">BERT</span>
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">Sentence Transformers</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">Database</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">PostgreSQL</span>
                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">MongoDB</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">RAG</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-300">LangChain</span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-300">FAISS</span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-300">Gemini/OpenAI API</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">Security Intelligence</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-300">WHOIS Lookup</span>
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-300">SSL Verification</span>
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-300">VirusTotal Integration</span>
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-300">Domain Reputation APIs</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
