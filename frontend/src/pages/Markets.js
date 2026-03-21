import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { TrendingUp, TrendingDown, BarChart3, Bitcoin, Zap, Sparkles } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const Markets = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [commodityData, setCommodityData] = useState([]);
  const [activeTab, setActiveTab] = useState('crypto');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMarketData = async () => {
    try {
      const [cryptoRes, stockRes, commodityRes] = await Promise.all([
        api.getCryptoData(displayLimit),
        api.getStockData(),
        api.getCommodityData()
      ]);
      setCryptoData(cryptoRes.data);
      setStockData(stockRes.data);
      setCommodityData(commodityRes.data);
    } catch (error) {
      console.error('Fetch market data error:', error);
      toast.error('Failed to load market data');
    }
  };

  const loadMoreCrypto = async () => {
    setLoadingMore(true);
    try {
      const newLimit = displayLimit + 20;
      const response = await api.getCryptoData(newLimit);
      setCryptoData(response.data);
      setDisplayLimit(newLimit);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredCrypto = searchQuery
    ? cryptoData.filter(coin => 
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cryptoData;

  const filteredStocks = searchQuery
    ? stockData.filter(stock =>
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stockData;

  const fetchPrediction = async (symbol) => {
    setLoadingPrediction(true);
    try {
      const response = await api.getCryptoPrediction(symbol);
      setPrediction(response.data);
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Failed to generate prediction');
    } finally {
      setLoadingPrediction(false);
    }
  };

  const handlePredictionClick = (coin) => {
    setSelectedCrypto(coin);
    fetchPrediction(coin.symbol);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const renderCryptoCard = (coin, index) => {
    const sparklineData = coin.sparkline_in_7d?.price?.slice(-20).map((price, i) => ({
      value: price
    })) || [];

    return (
      <Card key={index} className="glass hover-lift" data-testid={`crypto-card-${index}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={coin.image} alt={coin.name} className="w-10 h-10" />
              <div>
                <p className="font-bold text-lg">{coin.symbol.toUpperCase()}</p>
                <p className="text-sm text-muted-foreground">{coin.name}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              coin.price_change_percentage_24h > 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-500'
            }`}>
              {coin.price_change_percentage_24h > 0 ? '+' : ''}
              {coin.price_change_percentage_24h?.toFixed(2)}%
            </div>
          </div>

          <div className="mb-4">
            <p className="text-3xl font-mono font-bold mb-1">
              ₹{coin.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">
              MCap: ₹{(coin.market_cap / 1e9).toFixed(2)}B
            </p>
          </div>

          {sparklineData.length > 0 && (
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={coin.price_change_percentage_24h > 0 ? '#10b981' : '#ef4444'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <Button
            onClick={() => handlePredictionClick(coin)}
            variant="outline"
            className="w-full glass-strong"
            data-testid={`predict-button-${index}`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Prediction
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderStockCard = (stock, index) => (
    <Card key={index} className="glass hover-lift" data-testid={`stock-card-${index}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-bold text-xl">{stock.symbol}</p>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary mt-1 inline-block">
              {stock.exchange}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            stock.change > 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {stock.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {stock.change > 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
          </div>
        </div>

        <p className="text-3xl font-mono font-bold mb-2">
          ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Change:</span>
          <span className={`font-mono font-semibold ${
            stock.change > 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {stock.change > 0 ? '+' : ''}₹{stock.change.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const renderCommodityCard = (commodity, index) => (
    <Card key={index} className="glass hover-lift" data-testid={`commodity-card-${index}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-bold text-lg">{commodity.name}</p>
            <p className="text-sm text-muted-foreground">{commodity.unit}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            commodity.change_percent > 0
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-rose-500/10 text-rose-500'
          }`}>
            {commodity.change_percent > 0 ? '+' : ''}{commodity.change_percent.toFixed(2)}%
          </div>
        </div>

        <p className="text-3xl font-mono font-bold mb-1">
          ₹{commodity.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Change:</span>
          <span className={`font-mono font-semibold ${
            commodity.change > 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {commodity.change > 0 ? '+' : ''}₹{commodity.change.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <Header title="Markets" />

      <div className="mb-6 flex gap-4 items-center">
        <Input
          placeholder={`Search ${activeTab === 'crypto' ? 'cryptocurrencies' : activeTab === 'stocks' ? 'stocks' : 'commodities'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md glass-strong"
          data-testid="market-search-input"
        />
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="glass" data-testid="market-tabs">
          <TabsTrigger value="crypto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="crypto-tab">
            <Bitcoin className="w-4 h-4 mr-2" />
            Cryptocurrency
          </TabsTrigger>
          <TabsTrigger value="stocks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="stocks-tab">
            <BarChart3 className="w-4 h-4 mr-2" />
            Indian Stocks
          </TabsTrigger>
          <TabsTrigger value="commodities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="commodities-tab">
            <Zap className="w-4 h-4 mr-2" />
            Commodities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="mt-6">
          {filteredCrypto.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCrypto.map((coin, index) => renderCryptoCard(coin, index))}
              </div>
              {!searchQuery && cryptoData.length >= displayLimit && (
                <div className="mt-8 text-center">
                  <Button 
                    onClick={loadMoreCrypto} 
                    disabled={loadingMore}
                    size="lg"
                    data-testid="load-more-crypto"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Cryptocurrencies'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center text-muted-foreground">
                <Bitcoin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery ? 'No cryptocurrencies found' : 'Loading cryptocurrency data...'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stocks" className="mt-6">
          {filteredStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStocks.map((stock, index) => renderStockCard(stock, index))}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery ? 'No stocks found' : 'Loading stock market data...'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="commodities" className="mt-6">
          {commodityData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {commodityData.map((commodity, index) => renderCommodityCard(commodity, index))}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Loading commodity data...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Crypto Prediction Modal */}
      <Dialog open={!!selectedCrypto} onOpenChange={() => { setSelectedCrypto(null); setPrediction(null); }}>
        <DialogContent className="glass-strong max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="prediction-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Price Prediction: {selectedCrypto?.symbol.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {loadingPrediction ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Analyzing market trends...</p>
            </div>
          ) : prediction ? (
            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              <div className="p-4 rounded-xl glass">
                <div className="flex items-center gap-3 mb-3">
                  <img src={selectedCrypto?.image} alt={selectedCrypto?.name} className="w-10 h-10" />
                  <div>
                    <p className="font-bold text-lg">{selectedCrypto?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: ₹{selectedCrypto?.current_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{prediction.prediction}</ReactMarkdown>
              </div>
              <div className="p-4 rounded-xl glass-strong text-sm text-muted-foreground">
                ⚠️ This is AI-generated analysis and should not be considered financial advice. 
                Always do your own research before making investment decisions.
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Card className="glass mt-8" data-testid="market-info-card">
        <CardHeader>
          <CardTitle>Market Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl glass-strong">
              <p className="text-sm text-muted-foreground mb-2">Data Sources</p>
              <p className="font-semibold text-sm">CoinGecko • NSE • BSE • MCX</p>
            </div>
            <div className="p-4 rounded-xl glass-strong">
              <p className="text-sm text-muted-foreground mb-2">Update Frequency</p>
              <p className="font-semibold">Every 60 seconds</p>
            </div>
            <div className="p-4 rounded-xl glass-strong">
              <p className="text-sm text-muted-foreground mb-2">Currency</p>
              <p className="font-semibold">Indian Rupee (₹)</p>
            </div>
            <div className="p-4 rounded-xl glass-strong">
              <p className="text-sm text-muted-foreground mb-2">AI Predictions</p>
              <p className="font-semibold">Gemini 3 Flash</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Markets;
