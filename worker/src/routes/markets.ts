import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getCryptoPrices, searchCrypto, getStocks, getCommodities, searchYfinanceGlobal } from '../lib/market';
import { getPolymarketSentiment } from '../lib/polymarket';
import { fetchLiveCryptoPrice } from '../lib/binance';
import { callLlm } from '../lib/gemini';

const marketRoutes = new Hono<AppEnv>();

marketRoutes.get('/crypto', async (c) => {
  const limit = Number(c.req.query('limit') ?? '20');
  return c.json(await getCryptoPrices(limit));
});

marketRoutes.get('/crypto/search', async (c) => {
  const query = c.req.query('query') ?? '';
  return c.json(await searchCrypto(query));
});

marketRoutes.get('/stocks', async (c) => c.json(await getStocks()));
marketRoutes.get('/commodities', async (c) => c.json(await getCommodities()));

marketRoutes.get('/stocks/search', async (c) => {
  const query = c.req.query('query') ?? '';
  const results = await searchYfinanceGlobal(query);
  if (!results.length) return c.json({ detail: 'Stock not found. Try ticker symbol (e.g., AAPL, RELIANCE, TSLA)' }, 404);
  return c.json(results[0]);
});

marketRoutes.get('/search', async (c) => {
  const query = (c.req.query('query') ?? '').trim();
  const assetType = c.req.query('asset_type') ?? 'auto';
  if (!query) return c.json({ detail: 'Query required' }, 400);
  const results = { query, stocks: [] as unknown[], crypto: [] as unknown[], commodities: [] as unknown[], polymarket: [] as unknown[] };
  const searchStocks = async () => { results.stocks = await searchYfinanceGlobal(query); };
  const searchCryptoFn = async () => { results.crypto = (await searchCrypto(query)).coins ?? []; };
  const searchSentiment = async () => { results.polymarket = (await getPolymarketSentiment(query)).markets ?? []; };
  if (assetType === 'stock' || assetType === 'commodity') await searchStocks();
  else if (assetType === 'crypto') await searchCryptoFn();
  else await Promise.all([searchStocks(), searchCryptoFn(), searchSentiment()]);
  return c.json(results);
});

marketRoutes.get('/sentiment', async (c) => {
  const query = c.req.query('query') ?? '';
  return c.json(await getPolymarketSentiment(query));
});

marketRoutes.get('/crypto/predict/:symbol', async (c) => {
  const rawSymbol = c.req.param('symbol');
  const symbol = rawSymbol.toUpperCase().replace('/USDT', '').replace('USDT', '');
  const [live, polyData] = await Promise.all([
    fetchLiveCryptoPrice(symbol),
    getPolymarketSentiment(`${symbol} crypto`),
  ]);
  if (!live) return c.json({ detail: `Could not fetch live data for ${symbol}` }, 502);
  const fmt = (v: number | null, d = 2): string => (v != null ? Number(v).toFixed(d) : 'N/A');
  const fib = live.fib_retracement ?? {};
  const pivots = live.pivot_points ?? {};
  let polyContext = '';
  const markets = polyData.markets ?? [];
  if (markets.length) {
    polyContext = '\nPREDICTION MARKET SENTIMENT (Polymarket):\n';
    for (const m of markets.slice(0, 3)) {
      polyContext += `  Q: ${m.question}\n`;
      (m.outcomes ?? []).forEach((outcome, i) => {
        const price = m.outcome_prices?.[i] ?? '?';
        polyContext += `    ${outcome}: ${price}\n`;
      });
    }
  }
  const today = new Date().toUTCString();
  const prompt = `LIVE DATA — ${symbol} — ${today}

PRICE:
  Current: $${Number(live.price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
  24H Change: ${fmt(live.change_24h_pct)}%
  24H High: $${fmt(live.high_24h_usd)}  |  Low: $${fmt(live.low_24h_usd)}
  Volume 24H: $${fmt(live.volume_24h_usd, 0)}

INDICATORS:
  RSI(14): ${fmt(live.rsi)}
  EMA50: $${fmt(live.ema50_usd)}  |  EMA200: $${fmt(live.ema200_usd)}
  MACD: ${fmt(live.macd_line, 6)}
  BB Width: ${fmt(live.bb_width_pct)}%
  ATR: $${fmt(live.atr, 4)}

KEY LEVELS:
  Fib 0.382: $${fib['0.382'] ?? 0}   Fib 0.618: $${fib['0.618'] ?? 0}
  Pivot R1: $${pivots.resistance_1 ?? 0}   Pivot S1: $${pivots.support_1 ?? 0}

SIGNAL: ${live.signal}  |  Score: ${fmt(live.overall_score, 0)}/100
${polyContext}
Based on this LIVE data + sentiment:
1. **Current Price Analysis**
2. **Key Support & Resistance** (from Fib/Pivot)
3. **24-48 Hour Outlook** — bull & bear scenarios with targets
4. **Trade Setup** — Entry, Target, Stop-loss
5. **Risk/Reward ratio**
6. **Sentiment Analysis** (from prediction markets if available)
7. **Final Recommendation** — Buy/Hold/Sell`;
  const system = 'You are a professional cryptocurrency analyst. Use ONLY the live market data provided. Also use Google Search to validate with latest news.';
  const analysis = await callLlm(c.env.GEMINI_API_KEY, system, prompt, { maxTokens: 4096, timeoutMs: 45000, useSearch: true });
  return c.json({
    symbol,
    timestamp: new Date().toISOString(),
    live_data: live,
    prediction: analysis,
    polymarket: polyData,
  });
});

export default marketRoutes;
