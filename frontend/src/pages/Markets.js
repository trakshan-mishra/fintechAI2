import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { TrendingUp, TrendingDown, BarChart3, Bitcoin, Zap, Search, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Markets = () => {
  const navigate = useNavigate();
  const { user, loading, getAuthToken } = useAuth();
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [commodityData, setCommodityData] = useState([]);
  const [activeTab, setActiveTab] = useState('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  const fetchMarketData = useCallback(async () => {
    // Load crypto first — it's fastest and the default tab
    try {
      const c = await api.getCryptoData(displayLimit);
      setCryptoData(c.data);
      setLastUpdated(new Date());
    } catch { /* non-fatal */ }
    // Load stocks + commodities in parallel after crypto is shown
    try {
      const [s, co] = await Promise.all([api.getStockData(), api.getCommodityData()]);
      setStockData(s.data);
      setCommodityData(co.data);
    } catch { toast.error('Failed to load stock/commodity data'); }
  }, [displayLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) { fetchMarketData(); const i = setInterval(fetchMarketData, 60000); return () => clearInterval(i); }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
  if (!searchQuery.trim()) {
    setSearchResults([]);
    return;
  }

  const t = setTimeout(async () => {
    setIsSearching(true);
    try {
      let res;

      if (activeTab === "crypto") {
        res = await api.searchCrypto(searchQuery);
        setSearchResults(res.data.coins || []);
      } else if (activeTab === "stocks") {
        res = await api.searchStocks(searchQuery);
        const data = await res.json();
        setSearchResults([data]);
      } else if (activeTab === "commodities") {
        res = await api.searchCommodities(searchQuery);
        const data = await res.json();
        setSearchResults([data]);
      }

    } catch {}
    finally {
      setIsSearching(false);
    }
  }, 500);

  return () => clearTimeout(t);
}, [searchQuery, activeTab]);

  const fetchPrediction = async () => {
    setLoadingPrediction(true);
    try {
      const token = await getAuthToken();
      const url = selectedType === 'stock'
        ? `${API_BASE}/markets/stocks/predict/${selectedItem.symbol}`
        : `${API_BASE}/markets/commodities/predict/${selectedItem.symbol}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setPrediction(d.prediction);
    } catch { toast.error('Failed to get AI analysis'); }
    finally { setLoadingPrediction(false); }
  };

  const displayedCrypto = searchQuery && activeTab === 'crypto' ? searchResults : cryptoData;
  const filteredStocks = searchQuery ? stockData.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.symbol.toLowerCase().includes(searchQuery.toLowerCase())) : stockData;
  const filteredCommodities = searchQuery ? commodityData.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.symbol.toLowerCase().includes(searchQuery.toLowerCase())) : commodityData;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  const Badge = ({ value }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${value >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
      {value >= 0 ? '+' : ''}{value?.toFixed(2)}%
    </span>
  );

  return (
    <AppLayout>
      <Header title="Markets" />
      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={activeTab === 'crypto' ? 'Search any crypto...' : activeTab === 'stocks' ? 'Search stocks...' : 'Search commodities...'}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 glass-strong" />
          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </div>
        {searchQuery && <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>Clear</Button>}
        <Button variant="outline" size="sm" onClick={async () => { setRefreshing(true); await fetchMarketData(); setRefreshing(false); toast.success('Refreshed!'); }} disabled={refreshing} className="gap-1 ml-auto">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button size="sm" onClick={() => navigate('/portfolio')} className="gap-1">
          <BarChart3 className="w-4 h-4" /> My Portfolio
        </Button>
        {lastUpdated && <span className="text-xs text-muted-foreground hidden lg:block">Updated: {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearchQuery(''); setSearchResults([]); }} className="mb-6">
        <TabsList className="glass">
          <TabsTrigger value="crypto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Bitcoin className="w-4 h-4 mr-1" />Crypto</TabsTrigger>
          <TabsTrigger value="stocks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BarChart3 className="w-4 h-4 mr-1" />Indian Stocks</TabsTrigger>
          <TabsTrigger value="commodities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Zap className="w-4 h-4 mr-1" />Commodities</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="mt-4">
          {displayedCrypto.length > 0 ? (
            <>
              {searchQuery && <p className="text-sm text-muted-foreground mb-3">Live results for "{searchQuery}"</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedCrypto.map((coin, i) => {
                  const change = coin.price_change_percentage_24h || 0;
                  const isUp = change >= 0;
                  const spark = coin.sparkline_in_7d?.price?.slice(-20).map(p => ({ value: p })) || [];
                  return (
                    <Card key={coin.id || i} className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all" onClick={() => coin.id && navigate(`/markets/coin/${coin.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <img src={coin.image || coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" onError={e => e.target.style.display='none'} />
                            <div><p className="font-bold text-sm">{coin.symbol?.toUpperCase()}</p><p className="text-xs text-muted-foreground">{coin.name}</p></div>
                          </div>
                          <Badge value={change} />
                        </div>
                        {coin.current_price ? (
                          <p className="text-xl font-mono font-bold mb-1">₹{coin.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        ) : <p className="text-xs text-muted-foreground mb-2">Loading...</p>}
                        {coin.price_usd != null && <p className="text-xs text-muted-foreground">${coin.price_usd.toLocaleString('en-US', { maximumFractionDigits: 4 })} USD</p>}
                        <p className="text-xs text-muted-foreground mb-2">MCap: ₹{((coin.market_cap || 0) / 1e9).toFixed(1)}B</p>
                        {spark.length > 0 && <ResponsiveContainer width="100%" height={40}><LineChart data={spark}><Line type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer>}
                        <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" />Full chart</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {!searchQuery && cryptoData.length >= displayLimit && (
                <div className="mt-4 text-center">
                  <Button onClick={async () => { setLoadingMore(true); try { const r = await api.getCryptoData(displayLimit+20); setCryptoData(r.data); setDisplayLimit(d=>d+20); } finally { setLoadingMore(false); } }} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="glass"><CardContent className="p-16 text-center"><Bitcoin className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>{searchQuery && !isSearching ? `No results for "${searchQuery}"` : 'Loading...'}</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="stocks" className="mt-4">
          {filteredStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStocks.map((stock, i) => (
                <Card key={i} className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate(`/markets/asset/${stock.symbol}?type=stock`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div><div className="flex items-center gap-1.5"><p className="font-bold">{stock.symbol}</p><span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{stock.exchange}</span></div><p className="text-xs text-muted-foreground">{stock.name}</p></div>
                      <Badge value={stock.change_percent} />
                    </div>
                    <p className="text-xl font-mono font-bold mb-1">₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    <p className={`text-sm font-mono ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stock.change >= 0 ? '+' : ''}₹{Math.abs(stock.change||0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" />Click for AI analysis</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass"><CardContent className="p-16 text-center"><BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>{searchQuery ? 'No stocks found' : 'Loading...'}</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="commodities" className="mt-4">
          {filteredCommodities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCommodities.map((c, i) => (
                <Card key={i} className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate(`/markets/asset/${c.symbol}?type=commodity`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.unit}</p></div>
                      <Badge value={c.change_percent} />
                    </div>
                    <p className="text-xl font-mono font-bold mb-1">₹{c.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    {c.price_usd && <p className="text-xs text-muted-foreground">${c.price_usd} USD</p>}
                    <p className={`text-sm font-mono mt-1 ${(c.change||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(c.change||0) >= 0 ? '+' : ''}₹{Math.abs(c.change||0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" />Click for AI analysis</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass"><CardContent className="p-16 text-center"><Zap className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Loading...</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="glass"><CardContent className="p-3">
        <div className="grid grid-coX`Zls-2 md:grid-cols-4 gap-3 text-xs">
          {[['Sources','CoinMarketCap • CoinGecko • Yahoo Finance'],['Updates','Every 60 seconds'],['Currency','Indian Rupee (₹)'],['AI','Gemini 2.0 Flash']].map(([k,v])=>(
            <div key={k}><p className="text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
          ))}
        </div>
      </CardContent></Card>

      {/* Stock / Commodity Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setPrediction(null); }}>
        <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedType === 'stock' ? <BarChart3 className="w-5 h-5 text-primary" /> : <Zap className="w-5 h-5 text-primary" />}
              {selectedItem?.name} <span className="text-muted-foreground font-normal">({selectedItem?.symbol})</span>
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl glass flex items-end justify-between">
                <div>
                  <p className="text-4xl font-mono font-bold">₹{selectedItem.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedType === 'commodity' ? selectedItem.unit : selectedItem.exchange}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${(selectedItem.change_percent||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {(selectedItem.change_percent||0) >= 0 ? '+' : ''}{(selectedItem.change_percent||0).toFixed(2)}%
                  </p>
                  <p className={`text-sm font-mono ${(selectedItem.change||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {(selectedItem.change||0) >= 0 ? '+' : ''}₹{Math.abs(selectedItem.change||0).toFixed(2)} today
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(selectedType === 'stock' ? [
                  ['Symbol', selectedItem.symbol],
                  ['Exchange', selectedItem.exchange],
                  ['Price Change', `${(selectedItem.change||0) >= 0 ? '+' : ''}₹${(selectedItem.change||0).toFixed(2)}`],
                  ['% Change', `${(selectedItem.change_percent||0) >= 0 ? '+' : ''}${(selectedItem.change_percent||0).toFixed(2)}%`],
                ] : [
                  ['Symbol', selectedItem.symbol],
                  ['Unit', selectedItem.unit],
                  ['USD Price', `$${selectedItem.price_usd || 'N/A'}`],
                  ['Change ₹', `${(selectedItem.change||0) >= 0 ? '+' : ''}₹${Math.abs(selectedItem.change||0).toFixed(2)}`],
                ]).map(([label, value]) => (
                  <div key={label} className="p-3 rounded-lg glass-strong">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-mono font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {!prediction && !loadingPrediction && (
                <Button onClick={fetchPrediction} className="w-full gap-2">
                  <Sparkles className="w-4 h-4" />
                  Get AI Analysis for {selectedItem.symbol}
                </Button>
              )}
              {loadingPrediction && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-muted-foreground">Analyzing {selectedItem.name}...</p>
                </div>
              )}
              {prediction && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI Analysis</h3>
                    <Button variant="outline" size="sm" onClick={fetchPrediction}>Refresh</Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl glass">
                    <ReactMarkdown>{prediction}</ReactMarkdown>
                  </div>
                  <p className="text-xs text-muted-foreground p-2 rounded bg-muted">⚠️ AI analysis only. Not SEBI-registered financial advice.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Markets;