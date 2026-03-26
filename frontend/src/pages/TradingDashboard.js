// src/pages/TradingDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Sparkles, RefreshCw, TrendingUp, TrendingDown, 
  Activity, BarChart3, Zap, AlertCircle, Target,
  TrendingUp as Bullish, TrendingDown as Bearish,
  DollarSign, Clock, Award, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Popular symbols for quick selection
const POPULAR_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'];

const TradingDashboard = () => {
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();
  const [symbol, setSymbol] = useState('BTC');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentTradingSearches');
    return saved ? JSON.parse(saved) : [];
  });

  // Save recent search
  const saveToRecent = (sym) => {
    const updated = [sym, ...recentSearches.filter(s => s !== sym)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentTradingSearches', JSON.stringify(updated));
  };

  // Fetch prediction from backend
  const getPrediction = async () => {
    if (!symbol.trim()) {
      toast.error('Please enter a symbol');
      return;
    }

    setLoading(true);
    setAnalysis(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/sign-in');
        return;
      }

      const response = await fetch(
        `${API_BASE}/markets/crypto/predict/${symbol.trim().toUpperCase()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 401) {
        toast.error('Session expired. Please login again');
        navigate('/sign-in');
        return;
      }

      if (response.status === 502) {
        toast.error(`Symbol "${symbol.toUpperCase()}" not found on Binance. Try BTC, ETH, SOL`);
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
      saveToRecent(symbol.toUpperCase());
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(error.message || 'Failed to get analysis. Make sure you are logged in and the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Get signal color based on score
  const getSignalColor = (signal) => {
    if (!signal) return 'text-gray-400';
    if (signal === 'STRONG_BUY') return 'text-green-500';
    if (signal === 'BUY') return 'text-emerald-400';
    if (signal === 'NEUTRAL') return 'text-yellow-500';
    if (signal === 'SELL') return 'text-orange-500';
    if (signal === 'STRONG_SELL') return 'text-red-500';
    return 'text-gray-400';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-emerald-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  // Calculate RSI interpretation
  const getRsiInterpretation = (rsi) => {
    if (!rsi) return { text: 'N/A', color: 'text-gray-400' };
    if (rsi > 70) return { text: 'Overbought - Potential Correction', color: 'text-red-500' };
    if (rsi < 30) return { text: 'Oversold - Potential Bounce', color: 'text-green-500' };
    if (rsi > 50) return { text: 'Bullish Momentum', color: 'text-emerald-500' };
    return { text: 'Bearish Momentum', color: 'text-orange-500' };
  };

  // Create sparkline data (mock for visualization)
  const createSparklineData = () => {
    if (!analysis?.live_data?.price_usd) return [];
    const basePrice = analysis.live_data.price_usd;
    return Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: basePrice * (0.98 + Math.sin(i * 0.3) * 0.02 + Math.random() * 0.01)
    }));
  };

  const sparklineData = createSparklineData();

  return (
    <AppLayout>
      <Header title="Professional Trading Dashboard" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL - Controls & Quick Stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Symbol Input Card */}
          <Card className="glass border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-bold">AI Trading Assistant</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Symbol</label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="BTC, ETH, SOL..."
                    className="font-mono text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && getPrediction()}
                  />
                </div>
                
                <Button
                  onClick={getPrediction}
                  disabled={loading}
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {loading ? 'Analyzing...' : 'Generate AI Analysis'}
                </Button>
              </div>

              {/* Popular Symbols */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Popular:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SYMBOLS.map(sym => (
                    <button
                      key={sym}
                      onClick={() => {
                        setSymbol(sym);
                        setTimeout(() => getPrediction(), 100);
                      }}
                      className="px-3 py-1 text-sm rounded-full bg-muted hover:bg-primary/20 transition-colors"
                    >
                      {sym}/USDT
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Recent:</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(sym => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSymbol(sym);
                          setTimeout(() => getPrediction(), 100);
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-muted/50 hover:bg-primary/20 transition-colors"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signal Score Card */}
          {analysis?.indicators && (
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Signal Score</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getSignalColor(analysis.indicators.signal)} bg-opacity-10 bg-current`}>
                    {analysis.indicators.signal || 'NEUTRAL'}
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor(analysis.indicators.overall_score)}`}>
                    {analysis.indicators.overall_score?.toFixed(1) || '--'}
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${analysis.indicators.overall_score >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${analysis.indicators.overall_score || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs">Trend Score</p>
                    <p className="font-bold text-lg">{analysis.indicators.trend_score?.toFixed(0) || '--'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs">Momentum Score</p>
                    <p className="font-bold text-lg">{analysis.indicators.momentum_score?.toFixed(0) || '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Price Card */}
          {analysis?.live_data && (
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{analysis.symbol}/USDT</h3>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-mono font-bold">
                    ${analysis.live_data.price_usd?.toFixed(2)}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${analysis.live_data.change_24h_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {analysis.live_data.change_24h_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {analysis.live_data.change_24h_pct >= 0 ? '+' : ''}{analysis.live_data.change_24h_pct?.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">24H High</p>
                    <p className="font-mono">${analysis.live_data.high_24h_usd?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">24H Low</p>
                    <p className="font-mono">${analysis.live_data.low_24h_usd?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">24H Volume</p>
                    <p className="font-mono">${(analysis.live_data.volume_24h_usd / 1e6).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">USD/INR</p>
                    <p className="font-mono">₹{analysis.live_data.usd_inr?.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT PANEL - Analysis & Indicators */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab Navigation */}
          {analysis && (
            <div className="flex gap-2 flex-wrap">
              {['analysis', 'indicators', 'levels'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeTab === tab 
                      ? 'bg-primary text-primary-foreground' 
                      : 'glass hover:bg-accent'
                  }`}
                >
                  {tab === 'analysis' && <Sparkles className="w-4 h-4 inline mr-1" />}
                  {tab === 'indicators' && <Activity className="w-4 h-4 inline mr-1" />}
                  {tab === 'levels' && <Target className="w-4 h-4 inline mr-1" />}
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && (
            <Card className="glass">
              <CardContent className="p-6">
                {!analysis?.prediction && !loading ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
                    <h3 className="text-xl font-bold mb-2">AI Trading Assistant</h3>
                    <p className="text-muted-foreground mb-6">
                      Enter a cryptocurrency symbol to get professional AI-powered analysis<br/>
                      including RSI, MACD, EMA, Bollinger Bands, and Fibonacci levels
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto text-sm">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <TrendingUp className="w-5 h-5 text-primary mb-1" />
                        <p className="font-semibold">Trend Analysis</p>
                        <p className="text-xs text-muted-foreground">EMA50/200 crossover</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <Activity className="w-5 h-5 text-primary mb-1" />
                        <p className="font-semibold">Momentum</p>
                        <p className="text-xs text-muted-foreground">RSI + MACD</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <Zap className="w-5 h-5 text-primary mb-1" />
                        <p className="font-semibold">Volatility</p>
                        <p className="text-xs text-muted-foreground">Bollinger Bands + ATR</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <Target className="w-5 h-5 text-primary mb-1" />
                        <p className="font-semibold">Levels</p>
                        <p className="text-xs text-muted-foreground">S/R + Fibonacci</p>
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                    <p className="text-muted-foreground">Analyzing {symbol}/USDT with real-time data...</p>
                    <p className="text-xs text-muted-foreground mt-2">Calculating RSI, MACD, EMA, Bollinger Bands</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">AI Analysis for {analysis.symbol}</h3>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={getPrediction}
                        className="gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </Button>
                    </div>
                    
                    {/* Price Sparkline */}
                    <div className="mb-6 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="index" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip 
                            formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                            contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={analysis.live_data?.change_24h_pct >= 0 ? '#10b981' : '#ef4444'} 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{analysis.prediction}</ReactMarkdown>
                    </div>
                    
                    <div className="mt-6 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>⚠️ AI-generated analysis based on real-time market data and mathematical indicators. Not financial advice. Always do your own research.</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Technical Indicators Tab */}
          {activeTab === 'indicators' && analysis?.indicators && (
            <Card className="glass">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Technical Indicators
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* RSI Card */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">RSI (14)</p>
                      <p className={`font-mono text-xl font-bold ${getScoreColor(analysis.indicators.rsi)}`}>
                        {analysis.indicators.rsi?.toFixed(1)}
                      </p>
                    </div>
                    <p className={`text-sm ${getRsiInterpretation(analysis.indicators.rsi).color}`}>
                      {getRsiInterpretation(analysis.indicators.rsi).text}
                    </p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${analysis.indicators.rsi > 70 ? 'bg-red-500' : analysis.indicators.rsi < 30 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${analysis.indicators.rsi || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* MACD Card */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">MACD</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">MACD Line</p>
                        <p className={`font-mono ${analysis.indicators.macd_line > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {analysis.indicators.macd_line?.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Signal Line</p>
                        <p className="font-mono">{analysis.indicators.signal_line?.toFixed(4)}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-muted-foreground text-xs">Histogram</p>
                      <p className={`font-mono text-sm ${analysis.indicators.macd_histogram > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {analysis.indicators.macd_histogram > 0 ? '+' : ''}{analysis.indicators.macd_histogram?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  {/* EMA Card */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">Moving Averages</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EMA50:</span>
                        <span className="font-mono">${analysis.indicators.ema50_usd?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EMA200:</span>
                        <span className="font-mono">${analysis.indicators.ema200_usd?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground">Trend:</span>
                        <span className={analysis.indicators.trend_score >= 50 ? 'text-green-500' : 'text-red-500'}>
                          {analysis.indicators.trend_score >= 50 ? 'Bullish' : 'Bearish'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bollinger Bands Card */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">Bollinger Bands</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upper:</span>
                        <span className="font-mono">${analysis.indicators.bb_upper?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Middle:</span>
                        <span className="font-mono">${analysis.indicators.bb_middle?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lower:</span>
                        <span className="font-mono">${analysis.indicators.bb_lower?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground">Width:</span>
                        <span className={analysis.indicators.bb_width_pct < 3 ? 'text-yellow-500' : ''}>
                          {analysis.indicators.bb_width_pct?.toFixed(1)}% {analysis.indicators.bb_width_pct < 3 && '(Squeeze!)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* ATR Card */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">Volatility</p>
                    <div>
                      <p className="text-muted-foreground text-sm">ATR (14)</p>
                      <p className="font-mono text-lg">${analysis.indicators.atr?.toFixed(4)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg hourly movement: {(analysis.indicators.atr / analysis.live_data?.price_usd * 100)?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* ATH Info */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">All Time High</p>
                    <div>
                      <p className="text-muted-foreground text-sm">24H High</p>
                      <p className="font-mono text-lg">${analysis.live_data?.high_24h_usd?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Distance to high: {((analysis.live_data?.high_24h_usd - analysis.live_data?.price_usd) / analysis.live_data?.price_usd * 100)?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Levels Tab */}
          {activeTab === 'levels' && analysis?.indicators && (
            <Card className="glass">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Key Price Levels
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resistance Levels */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Bullish className="w-5 h-5 text-red-500" />
                      <p className="font-semibold">Resistance Levels</p>
                    </div>
                    <div className="space-y-2">
                      {analysis.indicators.fib_retracement && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">R2 (0.236):</span>
                            <span className="font-mono">${analysis.indicators.fib_retracement['0.236']?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">R1 (0.382):</span>
                            <span className="font-mono">${analysis.indicators.fib_retracement['0.382']?.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {analysis.indicators.pivot_points && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pivot R1:</span>
                          <span className="font-mono">${analysis.indicators.pivot_points.resistance_1?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">24H High:</span>
                        <span className="font-mono text-red-500">${analysis.live_data?.high_24h_usd?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Support Levels */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Bearish className="w-5 h-5 text-green-500" />
                      <p className="font-semibold">Support Levels</p>
                    </div>
                    <div className="space-y-2">
                      {analysis.indicators.fib_retracement && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">S1 (0.618):</span>
                            <span className="font-mono">${analysis.indicators.fib_retracement['0.618']?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">S2 (0.786):</span>
                            <span className="font-mono">${analysis.indicators.fib_retracement['0.786']?.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {analysis.indicators.pivot_points && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pivot S1:</span>
                          <span className="font-mono">${analysis.indicators.pivot_points.support_1?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">EMA50:</span>
                        <span className="font-mono">${analysis.indicators.ema50_usd?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EMA200:</span>
                        <span className="font-mono">${analysis.indicators.ema200_usd?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fibonacci Levels Full View */}
                {analysis.indicators.fib_retracement && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/30">
                    <p className="font-semibold mb-2">Fibonacci Retracement (24H Range)</p>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      {Object.entries(analysis.indicators.fib_retracement).map(([level, price]) => (
                        <div key={level}>
                          <p className="text-muted-foreground">{level}</p>
                          <p className="font-mono font-bold">${price?.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trade Setup */}
                <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="font-bold mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Recommended Trade Setup
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Signal</p>
                      <p className={`font-bold ${getSignalColor(analysis.indicators.signal)}`}>
                        {analysis.indicators.signal || 'NEUTRAL'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-bold">{analysis.indicators.overall_score?.toFixed(0)}/100</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Zone</p>
                      <p className="font-mono text-xs">
                        S1: ${analysis.indicators.pivot_points?.support_1?.toFixed(2)} - 
                        ${analysis.live_data?.price_usd?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-mono text-xs">
                        Below S2: ${analysis.indicators.pivot_points?.support_2?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mathematical Indicators Explanation */}
      <Card className="glass mt-6">
        <CardContent className="p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Mathematical Indicators Used
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-primary font-mono">RSI(14)</span>
              <p className="text-muted-foreground text-xs mt-1">RSI = 100 - (100/(1+RS))<br/>RS = Avg Gain / Avg Loss</p>
            </div>
            <div>
              <span className="text-primary font-mono">EMA(50/200)</span>
              <p className="text-muted-foreground text-xs mt-1">EMA = Price × α + EMA_prev × (1-α)<br/>α = 2/(n+1)</p>
            </div>
            <div>
              <span className="text-primary font-mono">MACD</span>
              <p className="text-muted-foreground text-xs mt-1">MACD = EMA12 - EMA26<br/>Signal = EMA9 of MACD</p>
            </div>
            <div>
              <span className="text-primary font-mono">Bollinger Bands</span>
              <p className="text-muted-foreground text-xs mt-1">Upper = SMA20 + 2σ<br/>Lower = SMA20 - 2σ</p>
            </div>
            <div>
              <span className="text-primary font-mono">ATR</span>
              <p className="text-muted-foreground text-xs mt-1">TR = max(H-L, |H-PC|, |L-PC|)<br/>ATR = EMA(TR, 14)</p>
            </div>
            <div>
              <span className="text-primary font-mono">Fibonacci</span>
              <p className="text-muted-foreground text-xs mt-1">Level = High - (High-Low) × Ratio<br/>Ratios: 0.236, 0.382, 0.5, 0.618, 0.786</p>
            </div>
            <div>
              <span className="text-primary font-mono">Pivot Points</span>
              <p className="text-muted-foreground text-xs mt-1">PP = (H+L+C)/3<br/>R1 = 2×PP - L, S1 = 2×PP - H</p>
            </div>
            <div>
              <span className="text-primary font-mono">VWAP</span>
              <p className="text-muted-foreground text-xs mt-1">VWAP = Σ(TP × Vol) / Σ(Vol)<br/>TP = (H+L+C)/3</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TradingDashboard;