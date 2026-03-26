// src/pages/AIChat.js — Full-screen mobile-friendly AI Chat
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Send, Sparkles, Loader2, RotateCcw, User, Bot, TrendingUp, IndianRupee, PiggyBank, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Quick-fire suggestion chips shown when chat is empty
const SUGGESTIONS = [
  { icon: IndianRupee, text: "What's the petrol price in Delhi today?" },
  { icon: TrendingUp, text: "Should I invest in SIP or FD right now?" },
  { icon: PiggyBank, text: "How to save tax under Section 80C?" },
  { icon: FileText, text: "Explain NPS vs PPF for retirement" },
  { icon: TrendingUp, text: "What is Bitcoin price in INR today?" },
  { icon: IndianRupee, text: "Best mutual funds for 2026 in India" },
];

export default function AIChat() {
  const navigate = useNavigate();
  const { user, loading, getAuthToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const getHeaders = useCallback(async () => {
    const token = await getAuthToken();
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  }, [getAuthToken]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: msg,
          // Send real client timestamp — backend injects this into the Gemini
          // system prompt so it never confuses training-data dates with today
          client_timestamp: new Date().toISOString(),
          client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.status === 401) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Session expired. Please sign in again.' }]);
        return;
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response received.',
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Failed to connect. Check your connection and try again.' }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, getHeaders]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">AI Chat</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Powered by Gemini · Live Google Search · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}
      </div>

      {/* ── Chat area ── */}
      <div
        className="flex flex-col"
        style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}
      >
        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto pb-2 space-y-4 pr-1" style={{ scrollbarWidth: 'thin' }}>

          {/* Empty state — suggestion chips */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-1">How can I help you?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Ask anything about Indian finance, markets, tax, investments — I'll search the web for live data.
                <span className="block mt-1 text-xs font-medium text-primary/70">
                  📅 Today: {new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="flex items-center gap-2 text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all text-sm border border-border/50 hover:border-primary/30"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
                      <span className="line-clamp-1">{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted/70 rounded-tl-sm border border-border/30'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5
                    prose-headings:mt-3 prose-headings:mb-1
                    prose-strong:text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3 border border-border/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-muted-foreground ml-1">Searching & thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar — sticky to bottom ── */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about SIP, tax, BTC price, gold rate..."
                disabled={sending}
                className="pr-4 py-3 text-sm rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              size="icon"
              className="w-11 h-11 rounded-xl flex-shrink-0"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-2">
            🔍 Live Google Search · Not financial advice
          </p>
        </div>
      </div>
    </AppLayout>
  );
}