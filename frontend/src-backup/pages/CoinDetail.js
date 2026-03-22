import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { getTVSymbol, getBinancePrice } from "../utils/binance";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, Globe, RefreshCw, BarChart3, Activity, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COINGECKO = 'https://api.coingecko.com/api/v3';

const CMC_TO_TV = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', binancecoin: 'BINANCE:BNBUSDT',
    solana: 'BINANCE:SOLUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', polkadot: 'BINANCE:DOTUSDT', 'avalanche-2': 'BINANCE:AVAXUSDT',
    chainlink: 'BINANCE:LINKUSDT', 'matic-network': 'BINANCE:MATICUSDT', 'shiba-inu': 'BINANCE:SHIBUSDT',
    litecoin: 'BINANCE:LTCUSDT', uniswap: 'BINANCE:UNIUSDT', cosmos: 'BINANCE:ATOMUSDT',
    tron: 'BINANCE:TRXUSDT', 'near-protocol': 'BINANCE:NEARUSDT', aptos: 'BINANCE:APTUSDT',
    arbitrum: 'BINANCE:ARBUSDT', sui: 'BINANCE:SUIUSDT', pepe: 'BINANCE:PEPEUSDT',
};

// TradingView Advanced Chart Widget
const TradingViewChart = ({ symbol }) => {
    const containerRef = useRef(null);
    const tvSymbol = getTVSymbol(symbol, 'crypto'); // crypto is the asset type

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

    if (!tvSymbol) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Chart not available for this asset
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '600px' }}>
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        </div>
    );
};

// TradingView Technical Analysis Widget
const TechnicalAnalysisWidget = ({ symbol }) => {
    const containerRef = useRef(null);
    const tvSymbol = getTVSymbol(symbol, 'crypto'); // crypto is the asset type

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

    if (!tvSymbol) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Technical analysis not available for this asset
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', minHeight: '450px' }}>
            <div className="flex items-center justify-center h-full py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color }) => (
    <Card className="glass">
        <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`font-mono font-semibold text-sm ${color || ''}`}>{value}</p>
        </CardContent>
    </Card>
);

const CoinDetail = () => {
    const { coinId } = useParams();
    const navigate = useNavigate();
    const { user, loading, getAuthToken } = useAuth();
    const [coin, setCoin] = useState(null);
    const [loadingCoin, setLoadingCoin] = useState(true);
    const [liveData, setLiveData] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [activeTab, setActiveTab] = useState('chart');

    useEffect(() => { if (!loading && !user) navigate('/sign-in'); }, [user, loading, navigate]);

    const fetchCoin = useCallback(async () => {
        try {
            setLoadingCoin(true);
            const res = await fetch(
                `${COINGECKO}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
            );
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setCoin(data);
        } catch (e) {
            toast.error('Failed to load coin data');
        } finally {
            setLoadingCoin(false);
        }
    }, [coinId]);

    useEffect(() => { if (user) fetchCoin(); }, [user, fetchCoin]);
    useEffect(() => {
        if (!coin?.symbol) return;

        getBinancePrice(coin.symbol).then(setLiveData);
    }, [coin]);
    const fetchPrediction = async () => {
        if (loadingPrediction) return;
        setLoadingPrediction(true);
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE}/markets/crypto/predict/${coin.symbol}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setPrediction(data.prediction);
        } catch { toast.error('Prediction failed'); }
        finally { setLoadingPrediction(false); }
    };

    if (loading || loadingCoin) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
    );
    if (!coin) return null;

    const m = coin?.market_data || {};
    const price = m?.current_price?.inr ?? 0;
    const change24h = m?.price_change_percentage_24h ?? 0;
    const priceUSD = m?.current_price?.usd ?? 0;
    const isUp = change24h >= 0;

    const TABS = [
        { id: 'chart', label: 'Chart + Indicators', icon: BarChart3 },
        { id: 'technical', label: 'Technical Analysis', icon: Activity },
        { id: 'ai', label: 'AI Prediction', icon: Sparkles },
    ];

    return (
        <AppLayout>
            <button
                onClick={() => navigate('/markets')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Markets
            </button>

            {/* Header */}
            <div className="glass rounded-xl p-4 mb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img src={coin.image?.large} alt={coin.name} className="w-16 h-16 rounded-full ring-2 ring-primary/20" />
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h1 className="text-lg font-semibold">{coin.name}</h1>
                                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{coin.symbol?.toUpperCase()}</span>
                                {coin.market_cap_rank && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">#{coin.market_cap_rank}</span>}
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-2xl font-mono font-bold">
                                    ₹{liveData?.lastPrice
                                        ? Number(liveData.lastPrice).toLocaleString('en-IN')
                                        : price.toLocaleString('en-IN')}
                                </span>
                                <span className={`flex items-center gap-1 text-lg font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {isUp ? '+' : ''}{change24h.toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm">${priceUSD.toLocaleString('en-US', { maximumFractionDigits: 4 })} USD</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={fetchCoin} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                        {coin.links?.homepage?.[0] && (
                            <a href={coin.links.homepage[0]} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1"><Globe className="w-4 h-4" />Website</Button>
                            </a>
                        )}
                        <a href={`https://coinmarketcap.com/currencies/${coinId}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1"><ExternalLink className="w-4 h-4" />CMC</Button>
                        </a>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="24H High" value={`₹${(m?.high_24h?.inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} color="text-emerald-500" />
                <StatCard label="24H Low" value={`₹${(m?.low_24h?.inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} color="text-rose-500" />
                <StatCard label="Market Cap" value={`₹${((m?.market_cap?.inr || 0) / 1e9).toFixed(1)}B`} />
                <StatCard label="24H Volume" value={`₹${((m?.total_volume?.inr || 0) / 1e9).toFixed(1)}B`} />
                <StatCard label="USD Price" value={`$${priceUSD.toLocaleString('en-US', { maximumFractionDigits: 4 })}`} />
                <StatCard label="All Time High" value={`₹${(m?.ath?.inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                <StatCard label="ATH Change" value={`${(m?.ath_change_percentage?.inr || 0).toFixed(1)}%`} color={(m?.ath_change_percentage?.inr || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                <StatCard label="Rank" value={coin.market_cap_rank ? `#${coin.market_cap_rank}` : 'N/A'} color="text-primary" />
            </div>

            {/* Tabs */}
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
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        {coin.name} — {TABS.find(t => t.id === activeTab)?.label}
                        <span className="text-xs text-muted-foreground font-normal">Powered by TradingView</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {activeTab === 'chart' && (
                        <div className="p-0">
                            <TradingViewChart symbol={coin.symbol} />
                        </div>
                    )}
                    {activeTab === 'technical' && (
                        <div className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Technical Analysis - {coin.name}
                            </h3>
                            <TechnicalAnalysisWidget symbol={coin.symbol} />
                        </div>
                    )}
                    {activeTab === 'ai' && (
                        <div className="p-6">
                            {loadingPrediction ? (
                                <div className="flex items-center gap-3 py-12 justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                                    <p className="text-muted-foreground">Analyzing {coin.name}...</p>
                                </div>
                            ) : prediction ? (
                                <div className="space-y-4">
                                    <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{prediction}</ReactMarkdown></div>
                                    <Button variant="outline" size="sm" onClick={() => { setPrediction(null); fetchPrediction(); }} className="gap-1">
                                        <RefreshCw className="w-4 h-4" /> Refresh
                                    </Button>
                                    <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted">⚠️ AI-generated analysis only. Not financial advice.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                                    <p className="text-muted-foreground mb-4">Get AI analysis for {coin.name}</p>
                                    <Button onClick={fetchPrediction} className="gap-2"><Sparkles className="w-4 h-4" />Generate AI Prediction</Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ticker */}
            <Card className="glass mb-6 overflow-hidden">
                <CardContent className="p-0">
                </CardContent>
            </Card>

            {/* About */}
            {coin.description?.en && (
                <Card className="glass mb-6">
                    <CardHeader><CardTitle>About {coin.name}</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {coin.description.en.replace(/<[^>]*>/g, '').slice(0, 600)}...
                        </p>
                    </CardContent>
                </Card>
            )}
        </AppLayout>
    );
};

export default CoinDetail;