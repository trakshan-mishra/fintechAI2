import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3, Bitcoin, Zap, Search, RefreshCw, Loader2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

// ✅ FIX 1: Badge defined at MODULE level — never inside a render or after an early return.
// Defining it inside the component body (especially after an early return) causes React's
// "Rules of Hooks" violation and the "Script error." uncaught runtime crash.
const Badge = ({ value }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      value >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
    }`}
  >
    {value >= 0 ? '+' : ''}
    {Number(value ?? 0).toFixed(2)}%
  </span>
);

const Markets = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [allCrypto, setAllCrypto] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [allCommodities, setAllCommodities] = useState([]);

  const [displayedCrypto, setDisplayedCrypto] = useState([]);
  const [displayedStocks, setDisplayedStocks] = useState([]);
  const [displayedCommodities, setDisplayedCommodities] = useState([]);

  const [activeTab, setActiveTab] = useState('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  // ✅ Crypto: CoinGecko direct (public API, no CORS issues)
  const loadAllCryptos = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error('CoinGecko error');
      const data = await res.json();
      setAllCrypto(data);
      setDisplayedCrypto(data.slice(0, displayLimit));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Crypto load failed:', err);
      // Silently fall back — backend /markets/crypto has its own fallback
      try {
        const res = await fetch(`${API_BASE}/markets/crypto?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setAllCrypto(data);
          setDisplayedCrypto(data.slice(0, displayLimit));
        }
      } catch {
        toast.error('Failed to load crypto data');
      }
    }
  }, [displayLimit]);

  // ✅ FIX 2: Stocks now routed through backend which uses Alpha Vantage
  const loadAllStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/markets/stocks`);
      if (!res.ok) throw new Error('Stocks API error');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllStocks(data);
        setDisplayedStocks(data);
      }
    } catch (err) {
      console.error('Stock load failed:', err);
      toast.error('Could not load stock data');
    }
  }, []);

  // ✅ FIX 3: Commodities routed through backend which uses Alpha Vantage
  const loadAllCommodities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/markets/commodities`);
      if (!res.ok) throw new Error('Commodities API error');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllCommodities(data);
        setDisplayedCommodities(data);
      }
    } catch (err) {
      console.error('Commodity load failed:', err);
      toast.error('Could not load commodities data');
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoadingInitial(true);
      Promise.all([loadAllCryptos(), loadAllStocks(), loadAllCommodities()]).finally(() =>
        setLoadingInitial(false)
      );
    }
  }, [user, loadAllCryptos, loadAllStocks, loadAllCommodities]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadAllCryptos();
      loadAllStocks();
      loadAllCommodities();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, loadAllCryptos, loadAllStocks, loadAllCommodities]);

  // ✅ FIX 4: Universal search — for stocks/commodities, search backend (Alpha Vantage aware).
  // For crypto, filter the already-loaded CoinGecko data locally.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayedCrypto(allCrypto.slice(0, displayLimit));
      setDisplayedStocks(allStocks);
      setDisplayedCommodities(allCommodities);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase();

      if (activeTab === 'crypto') {
        // Local filter on already-loaded data
        const filtered = allCrypto.filter(
          (coin) =>
            coin.name?.toLowerCase().includes(q) ||
            coin.symbol?.toLowerCase().includes(q) ||
            coin.id?.toLowerCase().includes(q)
        );
        setDisplayedCrypto(filtered);
        setIsSearching(false);
      } else if (activeTab === 'stocks') {
        // ✅ Search through backend (Alpha Vantage symbol search)
        try {
          const res = await fetch(
            `${API_BASE}/markets/stocks/search?query=${encodeURIComponent(searchQuery)}`
          );
          if (res.ok) {
            const data = await res.json();
            setDisplayedStocks(Array.isArray(data) ? data : []);
          } else {
            // Fallback: local filter
            setDisplayedStocks(
              allStocks.filter(
                (s) =>
                  s.name?.toLowerCase().includes(q) || s.symbol?.toLowerCase().includes(q)
              )
            );
          }
        } catch {
          setDisplayedStocks(
            allStocks.filter(
              (s) =>
                s.name?.toLowerCase().includes(q) || s.symbol?.toLowerCase().includes(q)
            )
          );
        }
        setIsSearching(false);
      } else {
        // Commodities — local filter only (small dataset)
        setDisplayedCommodities(
          allCommodities.filter(
            (c) =>
              c.name?.toLowerCase().includes(q) || c.symbol?.toLowerCase().includes(q)
          )
        );
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, allCrypto, allStocks, allCommodities, displayLimit]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllCryptos(), loadAllStocks(), loadAllCommodities()]);
    setRefreshing(false);
    toast.success('Markets refreshed!');
  };

  const loadMore = () => setDisplayLimit((prev) => prev + 50);

  // ✅ Early returns AFTER all hooks — no hooks below this point
  if (loading || loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading markets data...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Header title="Markets" />

      {/* Search and controls */}
      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${
              activeTab === 'crypto'
                ? 'cryptocurrencies'
                : activeTab === 'stocks'
                ? 'Indian stocks (NSE/BSE)'
                : 'commodities'
            }...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-strong"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
        </div>
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
            Clear
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1 ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button size="sm" onClick={() => navigate('/portfolio')} className="gap-1">
          <BarChart3 className="w-4 h-4" />
          My Portfolio
        </Button>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground hidden lg:block">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cryptocurrencies</p>
                <p className="text-2xl font-bold font-mono">{allCrypto.length}</p>
              </div>
              <Bitcoin className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Indian Stocks (NSE)</p>
                <p className="text-2xl font-bold font-mono">{allStocks.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Commodities</p>
                <p className="text-2xl font-bold font-mono">{allCommodities.length}</p>
              </div>
              <Zap className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setSearchQuery('');
        }}
        className="mb-6"
      >
        <TabsList className="glass">
          <TabsTrigger
            value="crypto"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Bitcoin className="w-4 h-4 mr-1" />
            Crypto ({displayedCrypto.length})
          </TabsTrigger>
          <TabsTrigger
            value="stocks"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Stocks ({displayedStocks.length})
          </TabsTrigger>
          <TabsTrigger
            value="commodities"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Zap className="w-4 h-4 mr-1" />
            Commodities ({displayedCommodities.length})
          </TabsTrigger>
        </TabsList>

        {/* CRYPTO TAB */}
        <TabsContent value="crypto" className="mt-4">
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              Found {displayedCrypto.length} result(s) for &quot;{searchQuery}&quot;
            </p>
          )}
          {displayedCrypto.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedCrypto.map((coin, i) => {
                  const change = coin.price_change_percentage_24h || 0;
                  const isUp = change >= 0;
                  const spark =
                    coin.sparkline_in_7d?.price?.slice(-20).map((p) => ({ value: p })) || [];
                  return (
                    <Card
                      key={coin.id || i}
                      className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all"
                      onClick={() => coin.id && navigate(`/markets/coin/${coin.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {coin.image && (
                              <img
                                src={coin.image}
                                alt={coin.name}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm">{coin.symbol?.toUpperCase()}</p>
                                {coin.market_cap_rank && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    #{coin.market_cap_rank}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {coin.name}
                              </p>
                            </div>
                          </div>
                          <Badge value={change} />
                        </div>
                        <p className="text-xl font-mono font-bold mb-1">
                          ₹
                          {coin.current_price?.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {spark.length > 0 && (
                          <ResponsiveContainer width="100%" height={40}>
                            <LineChart data={spark}>
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={isUp ? '#10b981' : '#ef4444'}
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {!searchQuery && displayedCrypto.length < allCrypto.length && (
                <div className="text-center mt-6">
                  <Button onClick={loadMore} variant="outline">
                    Load More Cryptocurrencies
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center">
                <Bitcoin className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? 'No cryptocurrencies found' : 'Loading...'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* STOCKS TAB */}
        <TabsContent value="stocks" className="mt-4">
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              Found {displayedStocks.length} result(s) for &quot;{searchQuery}&quot;
            </p>
          )}
          {displayedStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedStocks.map((stock, i) => (
                <Card
                  key={stock.symbol || i}
                  className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/markets/asset/${stock.symbol}?type=stock`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold">{stock.symbol}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {stock.exchange || 'NSE'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{stock.name}</p>
                      </div>
                      <Badge value={stock.change_percent || 0} />
                    </div>
                    <p className="text-xl font-mono font-bold mb-1">
                      ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p
                      className={`text-sm font-mono ${
                        (stock.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {(stock.change || 0) >= 0 ? '+' : ''}₹
                      {Math.abs(stock.change || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? 'No stocks found' : 'No stocks available'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* COMMODITIES TAB */}
        <TabsContent value="commodities" className="mt-4">
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              Found {displayedCommodities.length} result(s) for &quot;{searchQuery}&quot;
            </p>
          )}
          {displayedCommodities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedCommodities.map((comm, i) => (
                <Card
                  key={comm.symbol || i}
                  className="glass hover-lift cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/markets/asset/${comm.symbol}?type=commodity`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm">{comm.name}</p>
                        <p className="text-xs text-muted-foreground">{comm.unit}</p>
                      </div>
                      <Badge value={comm.change_percent || 0} />
                    </div>
                    <p className="text-xl font-mono font-bold mb-1">
                      ₹{comm.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    {comm.price_usd && (
                      <p className="text-xs text-muted-foreground">${comm.price_usd} USD</p>
                    )}
                    <p
                      className={`text-sm font-mono mt-1 ${
                        (comm.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {(comm.change || 0) >= 0 ? '+' : ''}₹
                      {Math.abs(comm.change || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? 'No commodities found' : 'No commodities available'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer info */}
      <Card className="glass">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Data Sources</p>
              <p className="font-medium">CoinGecko • Alpha Vantage • TradingView</p>
            </div>
            <div>
              <p className="text-muted-foreground">Live Updates</p>
              <p className="font-medium">Every 60 seconds</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currency</p>
              <p className="font-medium">Indian Rupee (₹)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Assets</p>
              <p className="font-medium">
                {(allCrypto.length + allStocks.length + allCommodities.length).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Markets;