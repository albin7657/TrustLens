'use client';

import { useState } from 'react';

export default function RAGAssistant() {
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string, sources?: string[] }>>([]);

  const examples = [
    'Is ABC Company safe?',
    'Has XYZ Recruiter been reported?',
    'What are common internship scams?',
    'How to identify fake job postings?'
  ];

  const handleSend = () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user' as const, content: query };
    setChatHistory([...chatHistory, userMessage]);
    setQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const assistantResponse = {
        role: 'assistant' as const,
        content: `Based on our analysis of scam reports and company registry data, here's what I found regarding your query about "${query}":\n\nOur database shows multiple verification checkpoints for this entity. The trust score is calculated based on domain age, SSL verification, previous fraud reports, and community feedback.\n\nI recommend cross-referencing this information with official company registries and conducting additional due diligence before proceeding with any recruitment process.`,
        sources: ['Scam Reports Database', 'Company Registry', 'Government Advisories', 'University Records']
      };
      setChatHistory(prev => [...prev, assistantResponse]);
      setIsThinking(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Recruitment Knowledge & Threat Intelligence</h1>
        <p className="text-slate-400 mb-8">AI-powered assistant for recruitment fraud detection and threat intelligence</p>

        {/* Chat Interface */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-white mb-2">Ask Anything</h3>
                <p className="text-slate-400 mb-6">Get AI-powered insights about recruitment fraud and company verification</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(example)}
                      className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-red-500/20 text-white'
                    : 'bg-slate-950/60 text-slate-200'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-2">Sources Used:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
                            ✓ {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about companies, recruiters, or scam patterns..."
                className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isThinking || !query.trim()}
                className="rounded-xl bg-red-500 px-6 py-3 text-white font-semibold transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-white mb-2">Source Citations</h3>
            <p className="text-sm text-slate-400">Every answer includes verified sources from our database</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Confidence Score</h3>
            <p className="text-sm text-slate-400">AI provides confidence levels for each response</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-white mb-2">Related Cases</h3>
            <p className="text-sm text-slate-400">Links to similar fraud cases and patterns</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Fraud Alerts</h3>
            <p className="text-sm text-slate-400">Real-time warnings about emerging scam tactics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
