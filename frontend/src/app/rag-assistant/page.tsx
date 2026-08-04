'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function RAGAssistant() {
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const examples = [
    'Is ABC Company safe?',
    'Has XYZ Recruiter been reported?',
    'What are common internship scams?',
    'How to identify fake job postings?'
  ];

  const handleSend = () => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: query };
    setChatHistory([...chatHistory, userMessage]);
    setQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const assistantResponse: ChatMessage = {
        role: 'assistant',
        content: `Based on our analysis of scam reports and company registry data, here's what I found regarding your query about "${query}":\n\nOur database shows multiple verification checkpoints for this entity. The trust score is calculated based on domain age, SSL verification, previous fraud reports, and community feedback.\n\nI recommend cross-referencing this information with official company registries and conducting additional due diligence before proceeding with any recruitment process.`,
        sources: ['Scam Reports Database', 'Company Registry', 'Government Advisories', 'University Records']
      };
      setChatHistory(prev => [...prev, assistantResponse]);
      setIsThinking(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 text-slate-800">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Recruitment Knowledge & Threat Intelligence"
          description="AI-powered assistant for recruitment fraud detection and threat intelligence"
        />

        {/* Chat Interface */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Ask Anything</h3>
                <p className="text-slate-500 mb-6">Get AI-powered insights about recruitment fraud and company verification</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(example)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Sources Used:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs text-emerald-700">
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
                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about companies, recruiters, or scam patterns..."
                className="flex-1 rounded-2xl bg-white border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isThinking || !query.trim()}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-white font-semibold transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Source Citations</h3>
            <p className="text-sm text-slate-500">Every answer includes verified sources from our database</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confidence Score</h3>
            <p className="text-sm text-slate-500">AI provides confidence levels for each response</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Related Cases</h3>
            <p className="text-sm text-slate-500">Links to similar fraud cases and patterns</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Fraud Alerts</h3>
            <p className="text-sm text-slate-500">Real-time warnings about emerging scam tactics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
