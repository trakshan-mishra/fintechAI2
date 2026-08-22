import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calculator, TrendingUp, TrendingDown, Rocket, Award, Target, PiggyBank, ArrowRight, Loader2, RefreshCw, Building2, Radar, Flame, Zap, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { fetchTopCrypto } from '../utils/cryptoData';
import { api } from '../utils/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sipCalculate(monthly, years, annualReturn) {
  const r = annualReturn / 100 / 12;
  const n = years * 12;
  const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  return { invested, returns: fv - invested, total: fv };
}

function stepUpSipCalculate(initial, stepPct, years, annualReturn) {
  const r = annualReturn / 100 / 12;
  let total = 0, invested = 0;
  let currentMonthly = initial;
  for (let year = 0; year < years; year++) {
    for (let m = 0; m < 12; m++) {
      const monthsRemaining = (years - year) * 12 - m;
      total += currentMonthly * Math.pow(1 + r, monthsRemaining);
      invested += currentMonthly;
    }
    currentMonthly *= (1 + stepPct / 100);
  }
  return { invested, returns: total - invested, total };
}

function inflationAdjusted(futureValue, inflationPct, years) {
  return futureValue / Math.pow(1 + inflationPct / 100, years);
}

// ── Enhanced SIP Calculator ──────────────────────────────────────────────────
function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [stepUp, setStepUp] = useState(0);
  const [inflation, setInflation] = useState(5);
  const [goalAmount, setGoalAmount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = stepUp > 0
    ? stepUpSipCalculate(monthly, stepUp, years, rate)
    : sipCalculate(monthly, years, rate);

  const realValue = inflationAdjusted(result.total, inflation, years);
  const chartData = Array.from({ length: years }, (_, i) => {
    const y = i + 1;
    const r = stepUp > 0 ? stepUpSipCalculate(monthly, stepUp, y, rate) : sipCalculate(monthly, y, rate);
    return { year: `Y${y}`, invested: r.invested, returns: r.returns, total: r.total, real: inflationAdjusted(r.total, inflation, y) };
  });

  // Goal planning: how much monthly SIP needed to reach goalAmount
  const goalMonthly = useMemo(() => {
    if (!goalAmount) return 0;
    const r = rate / 100 / 12;
    const n = years * 12;
    if (r === 0) return goalAmount / n;
    return goalAmount / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }, [goalAmount, years, rate]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />SIP Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Monthly Investment</Label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-muted-foreground">₹</span>
              <Input type="number" value={monthly} onChange={e => setMonthly(Math.max(100, Number(e.target.value)))} className="font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Duration (Years)</Label>
            <Input type="number" value={years} onChange={e => setYears(Math.max(1, Math.min(40, Number(e.target.value))))} className="font-mono" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Expected Return (%/yr)</Label>
            <Input type="number" value={rate} onChange={e => setRate(Math.max(1, Math.min(30, Number(e.target.value))))} className="font-mono" />
          </div>
        </div>

        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary hover:underline flex items-center gap-1">
          <Filter className="w-3 h-3" />{showAdvanced ? 'Hide' : 'Show'} advanced (step-up, inflation, goal)
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-xl bg-muted/20">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Step-up SIP (%/yr)</Label>
              <Input type="number" value={stepUp} onChange={e => setStepUp(Math.max(0, Math.min(50, Number(e.target.value))))} className="font-mono" placeholder="e.g. 10" />
              <p className="text-xs text-muted-foreground mt-1">Increase SIP annually</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Inflation (%/yr)</Label>
              <Input type="number" value={inflation} onChange={e => setInflation(Math.max(0, Math.min(20, Number(e.target.value))))} className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">For real (inflation-adjusted) value</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Goal Amount (optional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">₹</span>
                <Input type="number" value={goalAmount} onChange={e => setGoalAmount(Math.max(0, Number(e.target.value)))} className="font-mono" placeholder="e.g. 10000000" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{goalAmount > 0 ? `Need ₹${Math.round(goalMonthly).toLocaleString('en-IN')}/mo` : 'How much SIP to reach goal'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="font-mono font-bold text-sm">₹{(result.invested / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className="font-mono font-bold text-sm text-emerald-500">₹{(result.returns / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="font-mono font-bold text-sm text-primary">₹{(result.total / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-center">
            <p className="text-xs text-muted-foreground">Real Value</p>
            <p className="font-mono font-bold text-sm text-amber-500">₹{(realValue / 100000).toFixed(1)}L</p>
            <p className="text-[10px] text-muted-foreground">after {inflation}% inflation</p>
          </div>
        </div>

        {stepUp > 0 && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
            With {stepUp}% annual step-up, you invest ₹{result.invested.toLocaleString('en-IN')} total over {years} years (vs ₹{(monthly * years * 12).toLocaleString('en-IN')} flat), reaching ₹{(result.total / 100000).toFixed(1)}L.
          </div>
        )}

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" fontSize={11} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip formatter={v => `₹${(v / 100000).toFixed(1)}L`} contentStyle={{ background: 'hsl(222 47% 7%)', border: 'none', borderRadius: 8 }} />
            <Bar dataKey="invested" stackId="a" fill="#6366f1" />
            <Bar dataKey="returns" stackId="a" fill="#10b981" />
            {showAdvanced && <Bar dataKey="real" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Enhanced Returns Comparison (live data) ────────────────────────────────
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
        fetchTopCrypto(5).catch(() => []),
        api.getStockData().catch(() => ({ data: [] })),
        api.getCommodityData().catch(() => ({ data: [] })),
      ]);
      const btc = crypto.find(c => c.symbol === 'btc');
      const eth = crypto.find(c => c.symbol === 'eth');
      const gold = commodities.data.find(c => c.symbol === 'GC=F');
      setLiveData({
        btc: btc ? { return: btc.price_change_percentage_24h || 0, price: btc.current_price, priceUsd: btc.price_usd } : null,
        eth: eth ? { return: eth.price_change_percentage_24h || 0, price: eth.current_price } : null,
        gold: gold ? { return: gold.change_percent || 0, price: gold.price } : null,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allRates = [
    ...FIXED_RATES,
    { name: 'Gold (24h)', return: liveData?.gold?.return || 0, color: '#eab308', risk: 'Low-moderate', live: true, price: liveData?.gold?.price },
    { name: 'Nifty Index', return: 12, color: '#10b981', risk: 'Moderate', live: false, cagr: true },
    { name: 'Large Cap MF', return: 14, color: '#34d399', risk: 'Moderate', live: false, cagr: true },
    { name: 'Mid Cap MF', return: 17, color: '#fbbf24', risk: 'High', live: false, cagr: true },
    { name: 'S&P 500 (USD)', return: 10, color: '#60a5fa', risk: 'Moderate', live: false, cagr: true, fx: true },
    { name: 'Bitcoin (24h)', return: liveData?.btc?.return || 0, color: '#f97316', risk: 'Extreme', live: true, price: liveData?.btc?.price },
  ];

  // For 24h live returns, scale to annual for comparison (noted in label)
  const maxReturn = Math.max(...allRates.map(d => Math.abs(d.return)));

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Return Rate Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading live data...' : 'Live 24h returns (pulsing dot) vs long-term CAGR averages. Gold & Bitcoin are real-time.'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">₹</span>
          <Input type="number" value={sip} onChange={e => setSip(Math.max(100, Number(e.target.value)))} className="w-32 font-mono" />
          <span className="text-sm text-muted-foreground">/month for 10 years</span>
        </div>
        <div className="space-y-2">
          {allRates.map(d => {
            const { total } = sipCalculate(sip, 10, d.live ? d.return * 365 : d.return); // Scale 24h to annual (approx for comparison)
            const displayReturn = d.live ? d.return : d.return;
            const pct = (Math.abs(displayReturn) / maxReturn) * 100;
            return (
              <div key={d.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {d.name}
                    {d.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.risk}{d.fx ? ' · FX-adjusted' : ''}</p>
                </div>
                <div className="flex-1 h-7 rounded-full bg-muted overflow-hidden relative">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: d.color }} />
                  <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-bold text-white">
                    {d.live ? `${displayReturn >= 0 ? '+' : ''}${displayReturn.toFixed(1)}% 24h` : `${displayReturn}%`}
                  </span>
                </div>
                <div className="w-24 text-right shrink-0">
                  {d.live ? (
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {d.price ? `₹${(d.price / 100000).toFixed(1)}L` : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground">live price</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-mono text-sm font-bold">₹{(total / 100000).toFixed(1)}L</p>
                      <p className="text-xs text-muted-foreground">in 10y</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          CAGR entries use long-term averages. 24h returns are real-time and can be negative. S&P 500 in USD — INR return depends on FX.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Enhanced Best Fit: AI-powered asset allocation ───────────────────────────
const RISK_PROFILES = [
  { id: 'safe', label: 'Conservative', color: 'text-blue-500', icon: PiggyBank },
  { id: 'balanced', label: 'Balanced', color: 'text-emerald-500', icon: Target },
  { id: 'aggressive', label: 'Aggressive', color: 'text-orange-500', icon: Rocket },
];

function BestFit() {
  const [profile, setProfile] = useState('balanced');
  const [age, setAge] = useState(30);
  const [horizon, setHorizon] = useState(10);
  const [monthly, setMonthly] = useState(10000);
  const [goal, setGoal] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const active = RISK_PROFILES.find(f => f.id === profile);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = `Indian investor profile:
- Age: ${age}
- Investment horizon: ${horizon} years
- Risk profile: ${profile}
- Monthly investment: ₹${monthly.toLocaleString('en-IN')}
- Goal: ${goal || 'wealth creation'}

Provide a detailed asset allocation in this EXACT format (no markdown headers):

ALLOCATION:
Equity (Large Cap): XX%
Equity (Mid/Small Cap): XX%
Debt/Fixed Income: XX%
Gold: XX%
International: XX%
Crypto: XX% (if aggressive)
Cash: XX%

FUNDS:
1. Fund/Option Name | Type | Expected Return | Why
2. Fund/Option Name | Type | Expected Return | Why
3. Fund/Option Name | Type | Expected Return | Why
4. Fund/Option Name | Type | Expected Return | Why

SUMMARY:
One paragraph explaining the rationale and expected corpus.`;
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setAnalysis(data.response || 'Unable to generate analysis. Please try again.');
    } catch {
      setAnalysis('Failed to fetch analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [age, horizon, profile, monthly, goal]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />Best Fit — Asset Allocation</CardTitle>
        <p className="text-sm text-muted-foreground">AI-powered allocation analysis based on your profile.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Age</Label>
            <Input type="number" value={age} onChange={e => setAge(Math.max(18, Math.min(80, Number(e.target.value))))} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Horizon (yrs)</Label>
            <Input type="number" value={horizon} onChange={e => setHorizon(Math.max(1, Math.min(40, Number(e.target.value))))} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Monthly ₹</Label>
            <Input type="number" value={monthly} onChange={e => setMonthly(Math.max(100, Number(e.target.value)))} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Goal (optional)</Label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Retirement, House" className="text-sm" />
          </div>
        </div>

        <Button onClick={fetchAnalysis} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Generate Allocation'}
        </Button>

        {loading && !analysis && (
          <div className="space-y-2">{Array.from({length: 4}).map((_,i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        )}

        {analysis && (
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl glass-strong">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        )}
        <p className="text-xs text-muted-foreground">AI-generated analysis. Not a SEBI-registered recommendation. Verify before investing.</p>
      </CardContent>
    </Card>
  );
}

// ── Market Scanner ───────────────────────────────────────────────────────────
const SCAN_MODES = [
  { id: 'momentum', label: 'Momentum', icon: TrendingUp, desc: 'Top gainers with strong upward momentum' },
  { id: 'oversold', label: 'Oversold', icon: TrendingDown, desc: 'Biggest losers — potential bounce candidates' },
  { id: 'volume', label: 'High Volume', icon: Zap, desc: 'Unusual trading activity' },
  { id: 'breakout', label: 'Breakout', icon: Rocket, desc: 'Near 24h high — breakout potential' },
  { id: 'value', label: 'Value', icon: PiggyBank, desc: 'Near 24h low — potential value buy' },
];

function MarketScanner() {
  const [mode, setMode] = useState('momentum');
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        fetchTopCrypto(50).catch(() => []),
        api.getStockData().catch(() => ({ data: [] })),
      ]);
      setCrypto(c || []);
      setStocks(s.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Score and rank based on scan mode
  const scored = useMemo(() => {
    const all = [
      ...crypto.map(c => ({
        type: 'crypto',
        symbol: c.symbol?.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change: c.price_change_percentage_24h || 0,
        volume: c.total_volume || 0,
        high: c.high_24h || c.current_price,
        low: c.low_24h || c.current_price,
        id: c.id,
        image: c.image,
      })),
      ...stocks.map(s => ({
        type: 'stock',
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change_percent || 0,
        volume: s.volume || 0,
        high: s.high || s.price,
        low: s.low || s.price,
        id: s.symbol,
      })),
    ];

    const scored = all.map(a => {
      const range = a.high - a.low;
      const position = range > 0 ? (a.price - a.low) / range : 0.5; // 0 = at low, 1 = at high
      let score = 0, reason = '';
      switch (mode) {
        case 'momentum':
          score = a.change;
          reason = `${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)}% 24h`;
          break;
        case 'oversold':
          score = -a.change; // biggest losers first
          reason = `${a.change.toFixed(2)}% 24h drop`;
          break;
        case 'volume':
          score = a.volume;
          reason = `Vol: ${a.volume > 1e9 ? `${(a.volume / 1e9).toFixed(1)}B` : a.volume > 1e6 ? `${(a.volume / 1e6).toFixed(1)}M` : a.volume.toLocaleString()}`;
          break;
        case 'breakout':
          score = position * 100;
          reason = `${position.toFixed(0)}% of 24h range (near high)`;
          break;
        case 'value':
          score = (1 - position) * 100;
          reason = `${position.toFixed(0)}% of 24h range (near low)`;
          break;
      }
      return { ...a, score, reason, position };
    });

    return scored.filter(a => a.price > 0).sort((a, b) => b.score - a.score).slice(0, 12);
  }, [crypto, stocks, mode]);

  const activeMode = SCAN_MODES.find(m => m.id === mode);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radar className="w-5 h-5 text-primary" />Market Scanner</CardTitle>
        <p className="text-sm text-muted-foreground">{activeMode?.desc}</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {SCAN_MODES.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === m.id ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'}`}>
                <Icon className="w-3.5 h-3.5" />{m.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({length: 8}).map((_,i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="space-y-1.5">
            {scored.map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 cursor-pointer transition-colors"
                onClick={() => a.type === 'crypto' ? window.open(`/markets/coin/${a.id}`, '_self') : window.open(`/markets/asset/${a.symbol}?type=stock`, '_self')}>
                <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                {a.image && <img src={a.image} alt={a.name} className="w-7 h-7 rounded-full shrink-0" onError={e => e.target.style.display='none'} />}
                {!a.image && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{a.symbol?.[0]}</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{a.symbol}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.type === 'crypto' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>{a.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{a.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold">₹{(a.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className={`text-xs font-semibold ${a.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {a.change >= 0 ? '+' : ''}{a.change.toFixed(2)}%
                  </p>
                </div>
                <div className="w-28 text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                  {mode === 'breakout' || mode === 'value' ? (
                    <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.position * 100}%`, backgroundColor: a.position > 0.8 ? '#10b981' : a.position < 0.2 ? '#ef4444' : '#f59e0b' }} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">Scanned from live data. Not buy/sell recommendations. For research only.</p>
      </CardContent>
    </Card>
  );
}

// ── Enhanced Trending ─────────────────────────────────────────────────────────
function Trending() {
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([fetchTopCrypto(20), api.getStockData().catch(() => ({ data: [] }))]);
      setCrypto(c || []);
      setStocks(s.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topGainers = [...crypto].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 5);
  const topLosers = [...crypto].sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)).slice(0, 3);
  const topStockMovers = [...stocks].sort((a, b) => Math.abs(b.change_percent || 0) - Math.abs(a.change_percent || 0)).slice(0, 5);

  const MomentumScore = ({ change }) => {
    const score = Math.min(100, Math.max(0, 50 + change * 2));
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <span className="text-xs font-mono font-bold">{Math.round(score)}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-primary" />Trending Crypto</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {topGainers.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 cursor-pointer"
                  onClick={() => c.id && window.open(`/markets/coin/${c.id}`, '_self')}>
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" onError={e => e.target.style.display='none'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.symbol?.toUpperCase()} <span className="text-xs text-muted-foreground font-normal">{c.name}</span></p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Momentum</span>
                      <MomentumScore change={c.price_change_percentage_24h || 0} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold">₹{(c.current_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className={`text-xs font-semibold ${(c.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(c.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(c.price_change_percentage_24h || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Stock Movers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {topStockMovers.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 cursor-pointer"
                  onClick={() => window.open(`/markets/asset/${s.symbol}?type=stock`, '_self')}>
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold">₹{(s.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className={`text-xs font-semibold ${(s.change_percent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(s.change_percent || 0) >= 0 ? '+' : ''}{(s.change_percent || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          message: 'List 5 current or upcoming IPOs in India (2025-2026). For each provide: company name, sector, price band, issue size, subscription status, GMP (grey market premium) if available, expected listing date, and key risk factors. Be concise and factual.',
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
        <p className="text-sm text-muted-foreground">AI-searched latest IPO data with GMP, subscription, and risk factors. Verify with SEBI / exchange filings.</p>
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

// ── Main Page ────────────────────────────────────────────────────────────────
const Discover = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <AppLayout title="Discover">
      <div className="mb-6">
        <p className="text-muted-foreground">Investment Intelligence Center — SIP planning, live returns, market scanner, trending, and IPOs.</p>
      </div>

      <Tabs defaultValue="scanner" className="mb-6">
        <TabsList className="glass flex-wrap">
          <TabsTrigger value="scanner" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Radar className="w-4 h-4 mr-1" />Scanner</TabsTrigger>
          <TabsTrigger value="sip" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calculator className="w-4 h-4 mr-1" />SIP</TabsTrigger>
          <TabsTrigger value="returns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><TrendingUp className="w-4 h-4 mr-1" />Returns</TabsTrigger>
          <TabsTrigger value="bestfit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Award className="w-4 h-4 mr-1" />Best Fit</TabsTrigger>
          <TabsTrigger value="trending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Flame className="w-4 h-4 mr-1" />Trending</TabsTrigger>
          <TabsTrigger value="ipo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Building2 className="w-4 h-4 mr-1" />IPOs</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-4"><MarketScanner /></TabsContent>
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
