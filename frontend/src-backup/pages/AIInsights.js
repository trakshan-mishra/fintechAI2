import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Brain, Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const AIInsights = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef(null);

  // =========================
  // 🔥 FIX: DEFINE FUNCTION FIRST
  // =========================
  const generateInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${API_BASE}/ai/insights`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        toast.error('Please log in to get insights');
        return;
      }

      const data = await res.json();
      setInsights(data.insights || 'No insights available.');
    } catch (error) {
      console.error('Generate insights error:', error);
      toast.error('Failed to generate insights');
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  // =========================
  // AUTH CHECK
  // =========================
  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  // =========================
  // AUTO LOAD INSIGHTS
  // =========================
  useEffect(() => {
    if (!insights && !loading && user) {
      generateInsights();
    }
  }, [user, loading, insights, generateInsights]);

  // =========================
  // AUTO SCROLL CHAT
  // =========================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // =========================
  // CHAT FUNCTION
  // =========================
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSendingMessage(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: userMessage }),
      });

      if (res.status === 401) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '⚠️ Please log in to use AI chat.' },
        ]);
        return;
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response || data.detail || 'No response' },
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to AI' },
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Header title="AI Financial Advisor" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Insights Panel */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Financial Insights
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={generateInsights}
                disabled={loadingInsights}
              >
                {loadingInsights ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Regenerate'
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p>Analyzing your finances...</p>
              </div>
            ) : insights ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{insights}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click regenerate to get insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quick Financial Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Save at least 20% of your income</li>
              <li>• Keep emergency fund for 6 months</li>
              <li>• Diversify investments</li>
              <li>• Track expenses regularly</li>
              <li>• Use Section 80C for tax saving</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Chat */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Chat with AI Advisor
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="h-[400px] flex flex-col">

            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {sendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about SIP, tax saving..."
              />
              <Button type="submit">
                <Send className="w-4 h-4" />
              </Button>
            </form>

          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AIInsights;