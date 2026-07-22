'use client';

import { useState } from 'react';

interface AnalyzerResults {
  threatLevel: 'High' | 'Medium' | 'Low';
  detected: string[];
  confidence: number;
}

export default function CommunicationAnalyzer() {
  const [activeTab, setActiveTab] = useState('email');
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalyzerResults | null>(null);

  const tabs = [
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'sms', label: 'SMS', icon: '📱' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
  ];

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setResults({
        threatLevel: 'High',
        detected: ['Phishing', 'Credential Theft', 'Social Engineering'],
        confidence: 94
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Scam Communication Analyzer</h1>
        <p className="text-slate-500 mb-8">Analyze messages for phishing and scam patterns</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <label className="block text-sm font-semibold text-slate-900 mb-3">Paste Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Paste the ${activeTab} message content here...`}
                rows={8}
                className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none resize-none mb-4"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !message}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-white font-semibold transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Threat Level</h3>
                  <div className={`text-4xl font-bold mb-2 ${results.threatLevel === 'High' ? 'text-red-600' : results.threatLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {results.threatLevel === 'High' ? '🔴 High' : results.threatLevel === 'Medium' ? '🟡 Medium' : '🟢 Low'}
                  </div>
                  <p className="text-slate-600">This message shows strong indicators of fraudulent activity</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Detected</h3>
                  <ul className="space-y-2">
                    {results.detected.map((item, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
                        <span className="text-red-500">⚠️</span>
                        <span className="text-slate-900">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Confidence</h3>
                  <div className="relative h-32">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                      <circle
                        cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                        strokeDasharray={`${results.confidence * 3.52} 352`}
                        className="text-red-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{results.confidence}%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="text-6xl mb-4">📩</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Analysis Yet</h3>
                <p className="text-slate-500">Paste a message and click &quot;Analyze&quot; to see the results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
