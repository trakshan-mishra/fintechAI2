import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, RefreshCw, BarChart3, Activity, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Map our symbols to TradingView symbols
const STOCK_TO_TV = {
  RELIANCE: 'NSE:RELIANCE', TCS: 'NSE:TCS', HDFCBANK: 'NSE:HDFCBANK',
  INFY: 'NSE:INFY', ICICIBANK: 'NSE:ICICIBANK', HINDUNILVR: 'NSE:HINDUNILVR',
  ITC: 'NSE:ITC', SBIN: 'NSE:SBIN', BHARTIARTL: 'NSE:BHARTIARTL',
  BAJFINANCE: 'NSE:BAJFINANCE', WIPRO: 'NSE:WIPRO', TATAMOTORS: 'NSE:TATAMOTORS',
  AXISBANK: 'NSE:AXISBANK', KOTAKBANK: 'NSE:KOTAKBANK', LT: 'NSE:LT',
  ASIANPAINT: 'NSE:ASIANPAINT', MARUTI: 'NSE:MARUTI', TITAN: 'NSE:TITAN',
  NESTLEIND: 'NSE:NESTLEIND', ULTRACEMCO: 'NSE:ULTRACEMCO',
};

const COMMODITY_TO_TV = {
  GOLD: 'COMEX:GC1!', SILVER: 'COMEX:SI1!', OIL: 'NYMEX:CL1!',
  BRENT: 'ICEEUR:B1!', NG: 'NYMEX:NG1!', COPPER: 'COMEX:HG1!',
};

const getTVSymbol = (symbol, type) => {
  if (type === 'stock') return STOCK_TO_TV[symbol] || `NSE:${symbol}`;
  if (type === 'commodity') return COMMODITY_TO_TV[symbol] || `COMEX:${symbol}`;
  return symbol;
};

const TradingViewWidget = ({ tvSymbol, type = 'chart', height = 580 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;

    if (type === 'chart') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.innerHTML = JSON.stringify({
        autosize: true, symbol: tvSymbol, interval: 'D', timezone: 'Asia/Kolkata',
        theme: 'dark', style: '1', locale: 'en',
        backgroundColor: 'rgba(13,13,13,0)', gridColor: 'rgba(255,255,255,0.04)',
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'EMA@tv-basicstudies'],
        support_host: 'https://www.tradingview.com',
      });
      containerRef.current.style.height = `${height}px`;
    } else if (type === 'technical') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.innerHTML = JSON.stringify({
        interval: '1D', width: '100%', isTransparent: true, height: 420,
        symbol: tvSymbol, showIntervalTabs: true, displayMode: 'multiple',
        locale: 'en', colorTheme: 'dark',
      });
    } else if (type === 'ticker') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
      script.innerHTML = JSON.stringify({ symbol: tvSymbol, width: '100%', locale: 'en', colorTheme: 'dark', isTransparent: true });
    }

    containerRef.current.appendChild(script);
    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [tvSymbol, type, height]);

  return <div ref={containerRef} style={{ width: '100%', height: type === 'chart' ? `${height}px` : 'auto' }}><div></div></div>;
};

const AssetDetail = () => {
  const { symbol } = useParams();
  const [searchParams] = useSearchParams();
  const assetType = searchParams.get('type') || 'stock'; // 'stock' or 'commodity'
  const navigate = useNavigate();
  const { user, loading, getAuthToken } = useAuth();

  const [assetData, setAssetData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');

  // Universal search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState('');
  const [loadingAiSearch, setLoadingAiSearch] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/sign-in'); }, [user, loading, navigate]);

  useEffect(() => {
    if (user && symbol) fetchAssetData();
  }, [user, symbol, assetType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssetData = async () => {
    try {
      const endpoint = assetType === 'stock' ? `${API_BASE}/markets/stocks` : `${API_BASE}/markets/commodities`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const found = data.find(a => a.symbol?.toUpperCase() === symbol?.toUpperCase());
      setAssetData(found || { symbol, name: symbol, price: 0, change: 0, change_percent: 0 });
    } catch { toast.error('Failed to load asset data'); }
  };

  const fetchPrediction = async () => {
    if (prediction) return;
    setLoadingPrediction(true);
    try {
      const token = await getAuthToken();
      const endpoint = assetType === 'stock'
        ? `${API_BASE}/markets/stocks/predict/${symbol}`
        : `${API_BASE}/markets/commodities/predict/${symbol}`;
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPrediction(data.prediction);
    } catch { toast.error('Prediction failed'); }
    finally { setLoadingPrediction(false); }
  };

  // AI-powered internet search for any asset
  const searchAnything = async () => {
    if (!searchQuery.trim()) return;
    setLoadingAiSearch(true);
    setAiSearchResult('');
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/markets/search/ai`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, asset_type: assetType }),
      });
      const data = await res.json();
      setAiSearchResult(data.result);
    } catch { toast.error('Search failed'); }
    finally { setLoadingAiSearch(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  const tvSymbol = getTVSymbol(symbol, assetType);
  const isUp = (assetData?.change_percent || 0) >= 0;

  const TABS = [
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'technical', label: 'Technical Analysis', icon: Activity },
    { id: 'ai', label: 'AI Prediction', icon: Sparkles },
    { id: 'search', label: 'Research', icon: Search },
  ];

  return (
    <AppLayout>
      <button onClick={() => navigate('/markets')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </button>

      {/* Header */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold">{assetData?.name || symbol}</h1>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{symbol}</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${assetType === 'stock' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {assetType === 'stock' ? 'NSE Stock' : 'Commodity'}
              </span>
            </div>
            {assetData?.price > 0 ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-mono font-bold">₹{assetData.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                <span className={`flex items-center gap-1 text-lg font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isUp ? '+' : ''}{(assetData.change_percent || 0).toFixed(2)}%
                  <span className="text-sm ml-1">({isUp ? '+' : ''}₹{Math.abs(assetData.change || 0).toFixed(2)})</span>
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">Live data from TradingView chart below</p>
            )}
            {assetType === 'commodity' && assetData?.price_usd && (
              <p className="text-muted-foreground text-sm">${assetData.price_usd} USD • {assetData.unit}</p>
            )}
          </div>
          <Button onClick={fetchAssetData} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Stats for stocks */}
      {assetData && assetType === 'stock' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Symbol', value: assetData.symbol },
            { label: 'Exchange', value: assetData.exchange || 'NSE' },
            { label: 'Change', value: `${(assetData.change||0)>=0?'+':''}₹${(assetData.change||0).toFixed(2)}`, color: (assetData.change||0)>=0?'text-emerald-500':'text-rose-500' },
            { label: '% Change', value: `${(assetData.change_percent||0)>=0?'+':''}${(assetData.change_percent||0).toFixed(2)}%`, color: (assetData.change_percent||0)>=0?'text-emerald-500':'text-rose-500' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="glass"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`font-mono font-bold text-sm ${color||''}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { setActiveTab(id); if (id === 'ai' && !prediction) fetchPrediction(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="glass mb-6 overflow-hidden">
        <CardContent className="p-0">
          {activeTab === 'chart' && <TradingViewWidget tvSymbol={tvSymbol} type="chart" />}
          {activeTab === 'technical' && (
            <div className="p-4"><TradingViewWidget tvSymbol={tvSymbol} type="technical" /></div>
          )}
          {activeTab === 'ai' && (
            <div className="p-6">
              {loadingPrediction ? (
                <div className="flex items-center gap-3 py-12 justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                  <p className="text-muted-foreground">Analyzing {symbol}...</p>
                </div>
              ) : prediction ? (
                <div className="space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{prediction}</ReactMarkdown></div>
                  <Button variant="outline" size="sm" onClick={() => { setPrediction(null); fetchPrediction(); }} className="gap-1">
                    <RefreshCw className="w-4 h-4" />Refresh
                  </Button>
                  <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted">⚠️ AI analysis only. Not SEBI-registered advice.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <p className="text-muted-foreground mb-4">Get AI analysis for {symbol}</p>
                  <Button onClick={fetchPrediction} className="gap-2"><Sparkles className="w-4 h-4" />Generate Analysis</Button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'search' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Research Any Asset</h3>
                <p className="text-muted-foreground text-sm mb-4">Ask anything about {symbol} or any other stock, crypto, or commodity. AI will search and analyze.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder={`e.g. "Is ${symbol} a good buy now?" or "What is the outlook for gold in 2025?"`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchAnything()}
                    className="glass-strong"
                  />
                  {searchQuery && <Button variant="ghost" size="icon" onClick={() => { setSearchQuery(''); setAiSearchResult(''); }}><X className="w-4 h-4" /></Button>}
                  <Button onClick={searchAnything} disabled={loadingAiSearch || !searchQuery.trim()} className="gap-2">
                    <Search className="w-4 h-4" />{loadingAiSearch ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[`Is ${symbol} bullish or bearish?`, `Best time to buy ${symbol}?`, `${symbol} target price 2025`, `Compare ${symbol} with peers`].map(q => (
                    <button key={q} onClick={() => setSearchQuery(q)}
                      className="text-xs px-3 py-1.5 rounded-full glass hover:bg-accent transition-colors text-muted-foreground">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              {loadingAiSearch && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-muted-foreground">Researching {searchQuery}...</p>
                </div>
              )}
              {aiSearchResult && !loadingAiSearch && (
                <div className="p-4 rounded-xl glass space-y-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{aiSearchResult}</ReactMarkdown></div>
                  <p className="text-xs text-muted-foreground">⚠️ AI-generated research. Verify with official sources before investing.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticker info */}
      <Card className="glass mb-6 overflow-hidden">
        <CardContent className="p-0"><TradingViewWidget tvSymbol={tvSymbol} type="ticker" /></CardContent>
      </Card>
    </AppLayout>
  );
};

export default AssetDetail;