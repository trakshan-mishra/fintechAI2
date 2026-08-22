import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calculator, TrendingUp, TrendingDown, Rocket, Award, Target, PiggyBank, ArrowRight, Loader2, RefreshCw, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { toast } from 'sonner';
import { fetchTopCrypto } from '../utils/cryptoData';
import { api } from '../utils/api';

// ── SIP Calculator ────────────────────────────────────────────────────────────
function sipCalculate(monthly, years, annualReturn) {
  const r = annualReturn / 100 / 12;
  const n = years * 12;
  const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  return { invested, returns: fv - invested, total: fv };
}

function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);

  const { invested, returns, total } = sipCalculate(monthly, years, rate);
  const chartData = Array.from({ length: years }, (_, i) => {
    const y = i + 1;
    const r = sipCalculate(monthly, y, rate);
    return { year: `Y${y}`, invested: r.invested, returns: r.returns, total: r.total };
  });

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />SIP Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Monthly Investment</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-muted-foreground">₹</span>
              <Input type="number" value={monthly} onChange={e => setMonthly(Math.max(100, Number(e.target.value)))} className="font-mono" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Duration (Years)</label>
            <Input type="number" value={years} onChange={e => setYears(Math.max(1, Math.min(40, Number(e.target.value))))} className="font-mono" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Expected Return (%/yr)</label>
            <Input type="number" value={rate} onChange={e => setRate(Math.max(1, Math.min(30, Number(e.target.value))))} className="font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="font-mono font-bold text-sm">₹{(invested / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className="font-mono font-bold text-sm text-emerald-500">₹{(returns / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="font-mono font-bold text-sm text-primary">₹{(total / 100000).toFixed(1)}L</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" fontSize={11} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip formatter={v => `₹${(v / 100000).toFixed(1)}L`} contentStyle={{ background: 'hsl(222 47% 7%)', border: 'none', borderRadius: 8 }} />
            <Bar dataKey="invested" stackId="a" fill="#6366f1" />
            <Bar dataKey="returns" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Return Rate Comparison (live data) ───────────────────────────────────────
// Fixed-income rates are published rates (don't change intraday).
// Crypto, gold, and stock returns are fetched live.
const FIXED_RATES = [
  { name: 'Savings A/C', return: 3, color: '#94a3b8', risk: 'No risk', live: false },
  { name: 'FD (Bank)', return: 6.5, color: '#60a5fa', risk: 'Very low', live: false },
  { name: 'PPF', return: 7.1, color: '#818cf8', risk: 'Very low', live: false },
];

function ReturnComparison() {
  const [sip, setSip] = useState(5000);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [crypto, stocks, commodities] = await Promise.all([
        fetchTopCrypto(3).catch(() => []),
        api.getStockData().catch(() => ({ data: [] })),
        api.getCommodityData().catch(() => ({ data: [] })),
      ]);

      const btc = crypto.find(c => c.symbol === 'btc');
      const gold = commodities.data.find(c => c.symbol === 'GC=F');
      const nifty = stocks.data.find(s => s.symbol === 'NIFTY');

      setLiveData({
        crypto: btc ? { return: Math.abs(btc.price_change_percentage_24h || 0), price: btc.current_price, live: true } : null,
        gold: gold ? { return: Math.abs(gold.change_percent || 0), price: gold.price, live: true } : null,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Merge fixed + live rates
  const allRates = [
    ...FIXED_RATES,
    { name: 'Gold (24h)', return: liveData?.gold?.return || 9, color: '#eab308', risk: 'Low-moderate', live: true, price: liveData?.gold?.price },
    { name: 'Bitcoin (24h)', return: liveData?.crypto?.return || 45, color: '#f97316', risk: 'Extreme', live: true, price: liveData?.crypto?.price },
    // Long-term CAGR averages (for SIP comparison)
    { name: 'Nifty Index', return: 12, color: '#10b981', risk: 'Moderate', live: false },
    { name: 'Large Cap MF', return: 14, color: '#34d399', risk: 'Moderate', live: false },
    { name: 'Mid Cap MF', return: 17, color: '#fbbf24', risk: 'High', live: false },
    { name: 'Small Cap MF', return: 20, color: '#f97316', risk: 'Very high', live: false },
  ];

  const maxReturn = Math.max(...allRates.map(d => d.return));

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Return Rate Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading live data...' : 'Live 24h returns for Gold & Bitcoin. Others are long-term historical CAGR averages.'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">₹</span>
          <Input type="number" value={sip} onChange={e => setSip(Math.max(100, Number(e.target.value)))} className="w-32 font-mono" />
          <span className="text-sm text-muted-foreground">/month for 10 years</span>
        </div>
        <div className="space-y-2">
          {allRates.map(d => {
            const { total } = sipCalculate(sip, 10, d.return);
            const pct = (d.return / maxReturn) * 100;
            return (
              <div key={d.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                <div className="w-32 shrink-0">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {d.name}
                    {d.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.risk}</p>
                </div>
                <div className="flex-1 h-7 rounded-full bg-muted overflow-hidden relative">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-bold text-white">
                    {d.live ? `${d.return.toFixed(1)}% 24h` : `${d.return}%`}
                  </span>
                </div>
                <div className="w-24 text-right shrink-0">
                  <p className="font-mono text-sm font-bold">₹{(total / 100000).toFixed(1)}L</p>
                  <p className="text-xs text-muted-foreground">{d.live ? '10y @ rate' : 'in 10y'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Best Fit Investments (AI-powered, dynamic) ───────────────────────────────
const RISK_PROFILES = [
  { id: 'safe', label: 'Conservative', desc: 'Capital protection, low risk', color: 'text-blue-500', icon: PiggyBank, prompt: 'Conservative investor in India. Suggest 4 specific low-risk investment options with current returns. Include govt schemes, FDs, and debt funds. Format as: name | type | current return' },
  { id: 'balanced', label: 'Balanced', desc: 'Growth + stability, moderate risk', color: 'text-emerald-500', icon: Target, prompt: 'Balanced investor in India. Suggest 4 specific moderate-risk mutual funds and index funds with their 5-year CAGR. Format as: name | type | 5yr CAGR' },
  { id: 'aggressive', label: 'Aggressive', desc: 'High growth, high risk', color: 'text-orange-500', icon: Rocket, prompt: 'Aggressive investor in India. Suggest 4 high-growth investment options including small-cap funds, sectoral funds, and crypto. Include current returns. Format as: name | type | return' },
];

function BestFit() {
  const [profile, setProfile] = useState('balanced');
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const active = RISK_PROFILES.find(f => f.id === profile);

  const fetchFunds = useCallback(async (riskProfile) => {
    const p = RISK_PROFILES.find(f => f.id === riskProfile);
    if (!p) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: p.prompt }),
      });
      const data = await res.json();
      // Parse the AI response into structured items
      const lines = (data.response || '').split('\n').filter(l => l.includes('|') || l.includes('-'));
      const parsed = lines.slice(0, 6).map(line => {
        const parts = line.split(/[|｜-]/).map(s => s.trim()).filter(Boolean);
        return {
          name: parts[0]?.replace(/^\d+\.\s*/, '').replace(/[*#]/g, '') || line.slice(0, 40),
          type: parts[1] || 'Investment',
          return: parts[2] || '—',
        };
      }).filter(f => f.name.length > 2);

      setFunds(parsed.length > 0 ? parsed : [{ name: 'AI suggestion unavailable', type: 'Try refreshing', return: '' }]);
    } catch {
      setFunds([{ name: 'Unable to fetch suggestions', type: 'Please try again', return: '' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunds(profile); }, [profile, fetchFunds]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />Best Fit For You</CardTitle>
        <p className="text-sm text-muted-foreground">AI-powered investment ideas based on your risk profile.</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {RISK_PROFILES.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.id} onClick={() => setProfile(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${profile === f.id ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'}`}>
                <Icon className="w-4 h-4" />{f.label}
              </button>
            );
          })}
        </div>
        <div className="mb-3 p-3 rounded-xl bg-muted/30">
          <p className={`text-sm font-bold ${active.color}`}>{active.desc}</p>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({length: 4}).map((_,i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {funds.map((f, i) => (
              <div key={i} className="p-3 rounded-xl glass-strong hover:border-primary/50 transition-all cursor-pointer">
                <p className="font-semibold text-sm">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.type}</p>
                {f.return && <p className="font-mono text-sm text-emerald-500 mt-1">{f.return}</p>}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">AI-generated suggestions. Not a recommendation. Verify with SEBI/AMFI before investing. Mutual fund investments are subject to market risks.</p>
      </CardContent>
    </Card>
  );
}

// ── Trending ─────────────────────────────────────────────────────────────────
function Trending() {
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([fetchTopCrypto(10), api.getStockData().catch(() => ({ data: [] }))]);
      setCrypto(c || []);
      setStocks(s.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topGainers = [...crypto].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 5);
  const topStockMovers = [...stocks].sort((a, b) => Math.abs(b.change_percent || 0) - Math.abs(a.change_percent || 0)).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Top Crypto Movers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : topGainers.length > 0 ? (
            <div className="space-y-2">
              {topGainers.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer" onClick={() => c.id && window.open(`/markets/coin/${c.id}`, '_self')}>
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" onError={e => e.target.style.display='none'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.symbol?.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold">₹{(c.current_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className={`text-xs font-semibold ${(c.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(c.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(c.price_change_percentage_24h || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Stock Movers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : topStockMovers.length > 0 ? (
            <div className="space-y-2">
              {topStockMovers.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer" onClick={() => window.open(`/markets/asset/${s.symbol}?type=stock`, '_self')}>
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold">₹{(s.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className={`text-xs font-semibold ${(s.change_percent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(s.change_percent || 0) >= 0 ? '+' : ''}{(s.change_percent || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── IPOs ─────────────────────────────────────────────────────────────────────
function IPOSection() {
  const [ipos, setIpos] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'List 5 current or upcoming IPOs in India (2025-2026). For each: company name, sector, price band, expected listing date, and GMP (grey market premium) if available. Be concise.',
        }),
      });
      const data = await res.json();
      setIpos(data.response || 'No IPO data available right now.');
    } catch {
      setIpos('Unable to fetch IPO data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIPOs(); }, [fetchIPOs]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Upcoming IPOs</CardTitle>
        <p className="text-sm text-muted-foreground">AI-searched latest IPO data. Always verify with SEBI / exchange filings.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Searching for latest IPOs...</span>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{ipos}</ReactMarkdown>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={fetchIPOs} className="mt-4 gap-1" disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </CardContent>
    </Card>
  );
}

import ReactMarkdown from 'react-markdown';

// ── Main Page ────────────────────────────────────────────────────────────────
const Discover = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <AppLayout>
      <Header title="Discover" />
      <div className="mb-6">
        <p className="text-muted-foreground">Investment ideas, SIP planning, trending stocks, and IPOs — all in one place.</p>
      </div>

      <Tabs defaultValue="sip" className="mb-6">
        <TabsList className="glass">
          <TabsTrigger value="sip" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calculator className="w-4 h-4 mr-1" />SIP Calculator</TabsTrigger>
          <TabsTrigger value="returns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><TrendingUp className="w-4 h-4 mr-1" />Returns</TabsTrigger>
          <TabsTrigger value="bestfit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Award className="w-4 h-4 mr-1" />Best Fit</TabsTrigger>
          <TabsTrigger value="trending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><TrendingUp className="w-4 h-4 mr-1" />Trending</TabsTrigger>
          <TabsTrigger value="ipo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Building2 className="w-4 h-4 mr-1" />IPOs</TabsTrigger>
        </TabsList>

        <TabsContent value="sip" className="mt-4"><SIPCalculator /></TabsContent>
        <TabsContent value="returns" className="mt-4"><ReturnComparison /></TabsContent>
        <TabsContent value="bestfit" className="mt-4"><BestFit /></TabsContent>
        <TabsContent value="trending" className="mt-4"><Trending /></TabsContent>
        <TabsContent value="ipo" className="mt-4"><IPOSection /></TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Educational tools only. Not SEBI-registered investment advice. Verify all data before investing.
      </p>
    </AppLayout>
  );
};

export default Discover;
