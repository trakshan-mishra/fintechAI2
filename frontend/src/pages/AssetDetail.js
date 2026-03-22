import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, RefreshCw, BarChart3, Activity, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { getTVSymbol } from '../utils/binance';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TradingView Advanced Chart Widget
const TradingViewChart = ({ tvSymbol }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;
    
    containerRef.current.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(13,13,13,0)',
      gridColor: 'rgba(255,255,255,0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
        'BB@tv-basicstudies'
      ],
      support_host: 'https://www.tradingview.com'
    });

    containerRef.current.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '600px' }}>
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
};

// TradingView Technical Analysis Widget
const TechnicalAnalysisWidget = ({ tvSymbol }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;
    
    containerRef.current.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: true,
      height: 450,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: 'multiple',
      locale: 'en',
      colorTheme: 'dark'
    });

    containerRef.current.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol]);

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: '450px' }}>
      <div className="flex items-center justify-center h-full py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
};

// Symbol Info Widget
const SymbolInfoWidget = ({ tvSymbol }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;
    
    containerRef.current.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: '100%',
      locale: 'en',
      colorTheme: 'dark',
      isTransparent: true
    });

    containerRef.current.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol]);

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: '200px' }}>
      <div className="flex items-center justify-center h-full py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    </div>
  );
};

// ✅ TABS at module level — was defined after early returns inside render → Script error. crash
const ASSET_TABS = [
  { id: 'chart',     label: 'Live Chart',         icon: 'BarChart3' },
  { id: 'technical', label: 'Technical Analysis',  icon: 'Activity'  },
  { id: 'ai',        label: 'AI Prediction',       icon: 'Sparkles'  },
  { id: 'search',    label: 'Research',            icon: 'Search'    },
];

const AssetDetail = () => {
  const { symbol } = useParams();
  const [searchParams] = useSearchParams();
  const assetType = searchParams.get('type') || 'stock';
  const navigate = useNavigate();
  const { user, loading, getAuthToken } = useAuth();

  const [assetData, setAssetData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [loadingData, setLoadingData] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState('');
  const [loadingAiSearch, setLoadingAiSearch] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  const fetchAssetData = useCallback(async () => {
    if (!symbol) return;
    
    setLoadingData(true);
    try {
      const endpoint = assetType === 'stock' 
        ? `${API_BASE}/markets/stocks` 
        : `${API_BASE}/markets/commodities`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      const found = data.find(a => a.symbol?.toUpperCase() === symbol?.toUpperCase());
      
      setAssetData(found || { 
        symbol, 
        name: symbol, 
        price: 0, 
        change: 0, 
        change_percent: 0 
      });
    } catch (error) {
      console.error('Failed to load asset data:', error);
      toast.error('Failed to load asset data');
    } finally {
      setLoadingData(false);
    }
  }, [symbol, assetType]);

  useEffect(() => {
    if (user && symbol) {
      fetchAssetData();
      // Refresh every 60 seconds
      const interval = setInterval(fetchAssetData, 60000);
      return () => clearInterval(interval);
    }
  }, [user, symbol, fetchAssetData]);

  const fetchPrediction = useCallback(async () => {
    if (prediction) {
      setPrediction(null);
      return;
    }
    setLoadingPrediction(true);
    try {
      const token = await getAuthToken();
      const endpoint = assetType === 'stock'
        ? `${API_BASE}/markets/stocks/predict/${symbol}`
        : `${API_BASE}/markets/commodities/predict/${symbol}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPrediction(data.prediction);
    } catch (error) {
      console.error('Prediction failed:', error);
      toast.error('Failed to get AI analysis');
    } finally {
      setLoadingPrediction(false);
    }
  }, [prediction, assetType, symbol, getAuthToken]);

  const searchAnything = async () => {
    if (!searchQuery.trim()) return;
    
    setLoadingAiSearch(true);
    setAiSearchResult('');
    
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/markets/search/ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          asset_type: assetType
        })
      });
      
      const data = await res.json();
      setAiSearchResult(data.result);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setLoadingAiSearch(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading asset data...</p>
        </div>
      </div>
    );
  }

  const tvSymbol = getTVSymbol(symbol, assetType);
  const isUp = (assetData?.change_percent || 0) >= 0;
  const tabIcons = { BarChart3, Activity, Sparkles, Search };
  const TABS = ASSET_TABS;

  if (!tvSymbol) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Chart not available for {symbol}</p>
          <Button onClick={() => navigate('/markets')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Markets
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/markets')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </button>

      {/* Header */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold">{assetData?.name || symbol}</h1>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">
                {symbol}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                assetType === 'stock' 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {assetType === 'stock' ? 'NSE Stock' : 'Commodity'}
              </span>
            </div>
            {assetData?.price > 0 ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-mono font-bold">
                  ₹{assetData.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center gap-1 text-lg font-semibold ${
                  isUp ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isUp ? '+' : ''}{(assetData.change_percent || 0).toFixed(2)}%
                  <span className="text-sm ml-1">
                    ({isUp ? '+' : ''}₹{Math.abs(assetData.change || 0).toFixed(2)})
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">Live data from TradingView chart below</p>
            )}
            {assetType === 'commodity' && assetData?.price_usd && (
              <p className="text-muted-foreground text-sm">
                ${assetData.price_usd} USD • {assetData.unit}
              </p>
            )}
          </div>
          <Button onClick={fetchAssetData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {assetData && assetType === 'stock' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Symbol', value: assetData.symbol },
            { label: 'Exchange', value: assetData.exchange || 'NSE' },
            { 
              label: 'Change', 
              value: `${(assetData.change || 0) >= 0 ? '+' : ''}₹${(assetData.change || 0).toFixed(2)}`,
              color: (assetData.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
            },
            {
              label: '% Change',
              value: `${(assetData.change_percent || 0) >= 0 ? '+' : ''}${(assetData.change_percent || 0).toFixed(2)}%`,
              color: (assetData.change_percent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }
          ].map(({ label, value, color }) => (
            <Card key={label} className="glass">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`font-mono font-bold text-sm ${color || ''}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(({ id, label, icon: iconKey }) => {
          const Icon = tabIcons[iconKey];
          return (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              if (id === 'ai' && !prediction) fetchPrediction();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-primary text-primary-foreground'
                : 'glass hover:bg-accent'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card className="glass mb-6 overflow-hidden">
        <CardContent className="p-0">
          {activeTab === 'chart' && (
            <div className="p-0">
              <TradingViewChart tvSymbol={tvSymbol} />
            </div>
          )}
          
          {activeTab === 'technical' && (
            <div className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Technical Analysis - {symbol}
              </h3>
              <TechnicalAnalysisWidget tvSymbol={tvSymbol} />
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div className="p-6">
              {loadingPrediction ? (
                <div className="flex flex-col items-center gap-3 py-12 justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing {symbol}...</p>
                  <p className="text-xs text-muted-foreground">This may take 10-15 seconds</p>
                </div>
              ) : prediction ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI Analysis for {symbol}
                    </h3>
                    <Button variant="outline" size="sm" onClick={fetchPrediction} className="gap-1">
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{prediction}</ReactMarkdown>
                  </div>
                  <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted">
                    ⚠️ AI-generated analysis. Not SEBI-registered financial advice.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <p className="text-muted-foreground mb-4">Get AI-powered analysis for {symbol}</p>
                  <Button onClick={fetchPrediction} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate AI Analysis
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'search' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Research Any Asset</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Ask anything about {symbol} or any other stock, crypto, or commodity. AI will search and analyze.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={`e.g., "Is ${symbol} a good buy now?" or "What is the outlook for ${symbol}?"`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchAnything()}
                    className="glass-strong"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearchQuery('');
                        setAiSearchResult('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={searchAnything}
                    disabled={loadingAiSearch || !searchQuery.trim()}
                    className="gap-2"
                  >
                    {loadingAiSearch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {loadingAiSearch ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    `Is ${symbol} bullish or bearish?`,
                    `Best time to buy ${symbol}?`,
                    `${symbol} target price 2025`,
                    `Compare ${symbol} with peers`
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => setSearchQuery(q)}
                      className="text-xs px-3 py-1.5 rounded-full glass hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              
              {loadingAiSearch && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div>
                    <p className="text-muted-foreground">Researching {searchQuery}...</p>
                    <p className="text-xs text-muted-foreground mt-1">Analyzing web sources...</p>
                  </div>
                </div>
              )}
              
              {aiSearchResult && !loadingAiSearch && (
                <div className="p-4 rounded-xl glass space-y-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{aiSearchResult}</ReactMarkdown>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ AI-generated research. Verify with official sources before investing.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Symbol Info Widget */}
      <Card className="glass mb-6 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Market Data - {symbol}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SymbolInfoWidget tvSymbol={tvSymbol} />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AssetDetail;