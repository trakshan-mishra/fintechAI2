import { ema, rsi, macd, bollingerBands, atr, fibonacciRetracement, pivotPoints } from './indicators';
import { getLiveUsdInr } from './fx';

// Kraken pair mapping (Binance blocks CF Worker IPs with 403).
const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XXBTZUSD', ETH: 'XETHZUSD', SOL: 'SOLUSD', XRP: 'XXRPZUSD',
  ADA: 'ADAUSD', DOT: 'DOTUSD', LTC: 'XLTCZUSD', AVAX: 'AVAXUSD',
  LINK: 'LINKUSD', MATIC: 'MATICUSD', BCH: 'BCHUSD', XLM: 'XXLMZUSD',
  ATOM: 'ATOMUSD', TRX: 'TRXUSD', UNI: 'UNIUSD', NEAR: 'NEARUSD',
  APT: 'APTUSD', ARB: 'ARBUSD', SUI: 'SUIUSD', PEPE: 'PEPEUSD',
  ETC: 'XETCZUSD', FTT: 'FTTUSD', ICP: 'ICPUSD', FIL: 'FILUSD',
};

// Kraken OHLC interval: 60 = 1h
export async function getKrakenKlines(symbol: string, interval = 60, limit = 720) {
  const pair = KRAKEN_PAIRS[symbol.toUpperCase()] || `${symbol.toUpperCase()}USD`;
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Kraken OHLC ${res.status}`);
  const data = await res.json() as { error: unknown[]; result: Record<string, unknown[][]> };
  if (data.error?.length) throw new Error(`Kraken error: ${JSON.stringify(data.error)}`);
  const key = Object.keys(data.result).find((k) => k !== 'last');
  if (!key) throw new Error('Kraken: no pair data');
  const candles = (data.result[key] as unknown[][]).slice(-limit);
  // Kraken OHLC: [time, open, high, low, close, vwap, volume, count]
  return {
    closes: candles.map((c) => parseFloat(c[4] as string)),
    highs: candles.map((c) => parseFloat(c[2] as string)),
    lows: candles.map((c) => parseFloat(c[3] as string)),
    volumes: candles.map((c) => parseFloat(c[6] as string)),
  };
}

const round = (v: number | null, d = 2): number | null => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

export interface LiveCryptoPrice {
  symbol: string; price_usd: number | null; price_inr: number | null;
  high_24h_usd: number | null; low_24h_usd: number | null;
  change_24h_pct: number | null; volume_24h_usd: number | null;
  usd_inr: number | null; ema50_usd: number | null; ema200_usd: number | null;
  rsi: number | null; macd_line: number | null; signal_line: number | null;
  macd_histogram: number | null; bb_upper: number | null; bb_middle: number | null;
  bb_lower: number | null; bb_width_pct: number | null; atr: number | null;
  fib_retracement: Record<string, number>; pivot_points: ReturnType<typeof pivotPoints>;
  trend_score: number | null; momentum_score: number | null;
  overall_score: number | null; signal: string; source: string;
}

export async function fetchLiveCryptoPrice(symbol: string): Promise<LiveCryptoPrice | null> {
  try {
    const cleanSymbol = symbol.toUpperCase().replace('/USDT', '').replace('USDT', '');
    const [{ closes, highs, lows, volumes }, usdInr] = await Promise.all([
      getKrakenKlines(cleanSymbol, 60, 720),
      getLiveUsdInr(),
    ]);
    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);
    const rsi14 = rsi(closes, 14);
    const [macdLine, signalLine, macdHist] = macd(closes);
    const [bbUpper, bbMiddle, bbLower, bbWidth] = bollingerBands(closes);
    const atrVal = atr(highs, lows, closes);
    const current = closes.at(-1) ?? 0;
    const high24h = Math.max(...highs.slice(-24));
    const low24h = Math.min(...lows.slice(-24));
    const change24h = closes.length >= 25 ? ((closes.at(-1) ?? 0) - (closes.at(-25) ?? 0)) / (closes.at(-25) ?? 1) * 100 : 0;
    const trendScore = ema50 && ema200 ? (current > ema50 ? 40 : 0) + (current > ema200 ? 40 : 0) + (ema50 > ema200 ? 20 : 0) : 0;
    const momentumScore = (rsi14 && rsi14 > 50 ? 33 : 0) + (macdLine != null && signalLine != null && macdLine > signalLine ? 33 : 0) + (bbWidth != null && bbWidth < 3 ? 34 : 0);
    const score = (trendScore + momentumScore) / 2;
    const signal = score >= 75 ? 'STRONG_BUY' : score >= 60 ? 'BUY' : score >= 40 ? 'NEUTRAL' : score >= 25 ? 'SELL' : 'STRONG_SELL';
    return {
      symbol: cleanSymbol,
      price_usd: round(current, 6), price_inr: round(current * usdInr, 2),
      high_24h_usd: round(high24h, 6), low_24h_usd: round(low24h, 6),
      change_24h_pct: round(change24h, 2),
      volume_24h_usd: round(volumes.slice(-24).reduce((a, b) => a + b, 0), 2),
      usd_inr: round(usdInr, 2),
      ema50_usd: round(ema50, 6), ema200_usd: round(ema200, 6),
      rsi: round(rsi14, 2),
      macd_line: round(macdLine, 6), signal_line: round(signalLine, 6), macd_histogram: round(macdHist, 6),
      bb_upper: round(bbUpper, 6), bb_middle: round(bbMiddle, 6), bb_lower: round(bbLower, 6), bb_width_pct: round(bbWidth, 2),
      atr: round(atrVal, 6),
      fib_retracement: fibonacciRetracement(high24h, low24h),
      pivot_points: pivotPoints(highs.at(-1) ?? 0, lows.at(-1) ?? 0, closes.at(-1) ?? 0),
      trend_score: round(trendScore, 2), momentum_score: round(momentumScore, 2),
      overall_score: round(score, 2),
      signal, source: 'kraken',
    };
  } catch (e) {
    console.error(`Kraken fetch failed for ${symbol}`, e);
    return null;
  }
}
