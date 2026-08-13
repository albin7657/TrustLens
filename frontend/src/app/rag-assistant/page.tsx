'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { ragChat } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  confidence?: number;
}

export default function RAGAssistant() {
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const examples = [
    'Is ABC Company safe?',
    'Has XYZ Recruiter been reported?',
    'What are common internship scams?',
    'How to identify fake job postings?',
  ];

  const handleSend = async (text?: string) => {
    const message = (text ?? query).trim();
    if (!message || isThinking) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory((prev) => [...prev, userMessage]);
    setQuery('');
    setError('');
    setIsThinking(true);

    try {
      const res = await ragChat(message);
      const assistantResponse: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources.length > 0 ? res.sources : res.source_details.map((s) => s.label),
        confidence: res.confidence,
      };
      setChatHistory((prev) => [...prev, assistantResponse]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a response.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Recruitment Knowledge & Threat Intelligence"
          description="AI-powered assistant grounded in TrustLens fraud reports, job scans, and the trust repository."
        />

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <div className="h-[500px] space-y-4 overflow-y-auto p-6">
            {chatHistory.length === 0 && (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">🤖</div>
                <h3 className="mb-2 text-xl font-semibold text-white">Ask Anything</h3>
                <p className="mb-6 text-slate-400">
                  Answers are retrieved from our fraud database and explained by AI — not invented from memory.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {examples.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSend(example)}
                      disabled={isThinking}
                      className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-50"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-white'
                      : 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.confidence != null && (
                    <p className="mt-3 text-xs text-slate-500">
                      Confidence: <span className="font-semibold text-slate-300">{message.confidence}%</span>
                    </p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 border-t border-slate-700/60 pt-4">
                      <p className="mb-2 text-xs text-slate-500">Sources used:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-2 py-1 text-xs text-emerald-400"
                          >
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
                <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Searching database and generating answer…</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 p-4">
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about companies, recruiters, or scam patterns..."
                disabled={isThinking}
                className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={isThinking || !query.trim()}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '📚', title: 'Source Citations', desc: 'Every answer cites records from our fraud database' },
            { icon: '🎯', title: 'Confidence Score', desc: 'AI reports how well the retrieved data supports its answer' },
            { icon: '🔗', title: 'Vector Search', desc: 'pgvector finds semantically similar scam reports and job postings' },
            { icon: '⚠️', title: 'Grounded Answers', desc: "The AI only uses retrieved context — it won't invent cases" },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <div className="mb-3 text-3xl">{card.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-white">{card.title}</h3>
              <p className="text-sm text-slate-400">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
