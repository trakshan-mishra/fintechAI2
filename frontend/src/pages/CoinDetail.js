import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { getTVSymbol } from '../utils/binance';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, Globe, RefreshCw, BarChart3, Activity, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TradingView Advanced Chart Widget
const TradingViewChart = ({ symbol }) => {
    const containerRef = useRef(null);
    const tvSymbol = getTVSymbol(symbol, 'crypto');

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true, symbol: tvSymbol, interval: 'D',
            timezone: 'Asia/Kolkata', theme: 'dark', style: '1', locale: 'en',
            backgroundColor: 'rgba(13,13,13,0)', gridColor: 'rgba(255,255,255,0.04)',
            hide_top_toolbar: false, hide_legend: false, save_image: false,
            support_host: 'https://www.tradingview.com'
        });
        container.appendChild(script);
        return () => { if (container) container.innerHTML = ''; };
    }, [tvSymbol]);

    if (!tvSymbol) return <div className="p-6 text-center text-muted-foreground">Chart not available for this asset</div>;
    return (
        <div ref={containerRef} style={{ width: '100%', height: '500px' }}>
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        </div>
    );
};

// TradingView Technical Analysis Widget
const TechnicalAnalysisWidget = ({ symbol }) => {
    const containerRef = useRef(null);
    const tvSymbol = getTVSymbol(symbol, 'crypto');
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            interval: '1D', width: '100%', isTransparent: true, height: 450,
            symbol: tvSymbol, showIntervalTabs: true, displayMode: 'multiple',
            locale: 'en', colorTheme: 'dark'
        });
        container.appendChild(script);
        return () => { if (container) container.innerHTML = ''; };
    }, [tvSymbol]);
    if (!tvSymbol) return <div className="p-6 text-center text-muted-foreground">Technical analysis not available</div>;
    return (
        <div ref={containerRef} style={{ width: '100%', minHeight: '450px' }}>
            <div className="flex items-center justify-center h-full py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        </div>
    );
};

const StatCard = ({ label, value, color }) => (
    <Card className="glass"><CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`font-mono font-semibold text-sm ${color || ''}`}>{value}</p>
    </CardContent></Card>
);

const CoinDetail = () => {
    const { coinId } = useParams();
    const navigate = useNavigate();
    const { user, loading, getAuthToken } = useAuth();
    const [coin, setCoin] = useState(null);
    const [loadingCoin, setLoadingCoin] = useState(true);
    const [prediction, setPrediction] = useState(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [activeTab, setActiveTab] = useState('chart');

    useEffect(() => { if (!loading && !user) navigate('/sign-in'); }, [user, loading, navigate]);

    // Fetch from Worker /markets/crypto (cached, rate-limit-proof) + CoinGecko metadata
    const fetchCoin = useCallback(async () => {
        try {
            setLoadingCoin(true);

            // 1. Get price data from Worker (reliable, cached)
            let priceData = null;
            try {
                const workerRes = await fetch(`${API_BASE}/markets/crypto?limit=100`);
                if (workerRes.ok) {
                    const allCoins = await workerRes.json();
                    priceData = allCoins.find(c => c.id === coinId) || allCoins.find(c => c.symbol === coinId);
                }
            } catch {}

            // 2. Also try browser-direct CoinGecko markets (same as Markets page)
            if (!priceData) {
                try {
                    const cgRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&ids=${coinId}&sparkline=true&price_change_percentage=24h,7d`);
                    if (cgRes.ok) {
                        const cgData = await cgRes.json();
                        if (cgData.length > 0) priceData = cgData[0];
                    }
                } catch {}
            }

            // 3. Get metadata from CoinGecko /coins/{id} (description, links, image)
            let metadata = {};
            try {
                const metaRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
                if (metaRes.ok) {
                    metadata = await metaRes.json();
                }
            } catch {}

            // Merge: priceData has live prices, metadata has description/links
            const merged = {
                id: coinId,
                symbol: priceData?.symbol || metadata?.symbol || coinId,
                name: priceData?.name || metadata?.name || coinId,
                image: { large: priceData?.image || metadata?.image?.large || '' },
                market_data: {
                    current_price: { inr: priceData?.current_price || 0, usd: priceData?.price_usd || 0 },
                    price_change_percentage_24h: priceData?.price_change_percentage_24h || 0,
                    high_24h: { inr: priceData?.high_24h || 0 },
                    low_24h: { inr: priceData?.low_24h || 0 },
                    market_cap: { inr: priceData?.market_cap || 0 },
                    total_volume: { inr: priceData?.total_volume || 0 },
                    ath: { inr: metadata?.market_data?.ath?.inr || 0 },
                    ath_change_percentage: { inr: metadata?.market_data?.ath_change_percentage?.inr || 0 },
                },
                market_cap_rank: priceData?.market_cap_rank || metadata?.market_cap_rank || 'N/A',
                description: metadata?.description || { en: '' },
                links: metadata?.links || {},
            };

            setCoin(merged);
        } catch (e) {
            console.error('CoinDetail fetch error:', e);
            toast.error('Failed to load coin data');
        } finally {
            setLoadingCoin(false);
        }
    }, [coinId]);

    useEffect(() => { if (user) fetchCoin(); }, [user, fetchCoin]);

    // Auto-refresh price every 30s
    useEffect(() => {
        if (!user) return;
        const i = setInterval(fetchCoin, 30000);
        return () => clearInterval(i);
    }, [user, fetchCoin]);

    const fetchPrediction = async () => {
        if (loadingPrediction) return;
        setLoadingPrediction(true);
        try {
            const token = await getAuthToken();
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}/markets/crypto/predict/${coin.symbol}`, { headers });
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
    const high24h = m?.high_24h?.inr ?? 0;
    const low24h = m?.low_24h?.inr ?? 0;
    const marketCap = m?.market_cap?.inr ?? 0;
    const totalVolume = m?.total_volume?.inr ?? 0;
    const isUp = change24h >= 0;

    const TABS = [
        { id: 'chart', label: 'Chart', icon: BarChart3 },
        { id: 'technical', label: 'Technical', icon: Activity },
        { id: 'ai', label: 'AI Prediction', icon: Sparkles },
    ];

    return (
        <AppLayout>
            <button onClick={() => navigate('/markets')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Markets
            </button>

            <div className="glass rounded-xl p-4 mb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img src={coin.image?.large} alt={coin.name} className="w-14 h-14 rounded-full ring-2 ring-primary/20" onError={e => e.target.style.display='none'} />
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h1 className="text-lg font-semibold">{coin.name}</h1>
                                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{coin.symbol?.toUpperCase()}</span>
                                {coin.market_cap_rank && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">#{coin.market_cap_rank}</span>}
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-2xl font-mono font-bold">₹{price.toLocaleString('en-IN', { maximumFractionDigits: price < 1 ? 6 : 0 })}</span>
                                <span className={`flex items-center gap-1 text-lg font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {isUp ? '+' : ''}{change24h.toFixed(2)}%
                                </span>
                            </div>
                            {priceUSD > 0 && <p className="text-muted-foreground text-sm">${priceUSD.toLocaleString('en-US', { maximumFractionDigits: priceUSD < 1 ? 6 : 2 })} USD</p>}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={fetchCoin} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                        {coin.links?.homepage?.[0] && (
                            <a href={coin.links.homepage[0]} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1"><Globe className="w-4 h-4" />Website</Button>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="24H High" value={`₹${high24h.toLocaleString('en-IN', { maximumFractionDigits: high24h < 1 ? 6 : 0 })}`} color="text-emerald-500" />
                <StatCard label="24H Low" value={`₹${low24h.toLocaleString('en-IN', { maximumFractionDigits: low24h < 1 ? 6 : 0 })}`} color="text-rose-500" />
                <StatCard label="Market Cap" value={`₹${(marketCap / 1e9).toFixed(1)}B`} />
                <StatCard label="24H Volume" value={`₹${(totalVolume / 1e9).toFixed(1)}B`} />
                <StatCard label="USD Price" value={`$${priceUSD.toLocaleString('en-US', { maximumFractionDigits: priceUSD < 1 ? 6 : 2 })}`} />
                <StatCard label="ATH" value={`₹${(m?.ath?.inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                <StatCard label="ATH Change" value={`${(m?.ath_change_percentage?.inr || 0).toFixed(1)}%`} color={(m?.ath_change_percentage?.inr || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                <StatCard label="Rank" value={coin.market_cap_rank ? `#${coin.market_cap_rank}` : 'N/A'} color="text-primary" />
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => { setActiveTab(id); if (id === 'ai' && !prediction) fetchPrediction(); }}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'}`}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            <Card className="glass mb-6 overflow-hidden">
                <CardContent className="p-0">
                    {activeTab === 'chart' && <div className="p-0"><TradingViewChart symbol={coin.symbol} /></div>}
                    {activeTab === 'technical' && (
                        <div className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Technical Analysis — {coin.name}</h3>
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
                                    <Button variant="outline" size="sm" onClick={() => { setPrediction(null); fetchPrediction(); }} className="gap-1"><RefreshCw className="w-4 h-4" />Refresh</Button>
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

            {coin.description?.en && (
                <Card className="glass mb-6">
                    <CardHeader><CardTitle>About {coin.name}</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{coin.description.en.replace(/<[^>]*>/g, '').slice(0, 600)}...</p>
                    </CardContent>
                </Card>
            )}
        </AppLayout>
    );
};

export default CoinDetail;
