import { ema, rsi, macd, bollingerBands, atr, fibonacciRetracement, pivotPoints } from './indicators';
import { getLiveUsdInr } from './fx';

export async function getBinanceKlines(symbol = 'BTCUSDT', interval = '1h', limit = 250) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const data = await res.json() as unknown[][];
  return {
    closes: data.map((x) => parseFloat(x[4] as string)),
    highs: data.map((x) => parseFloat(x[2] as string)),
    lows: data.map((x) => parseFloat(x[3] as string)),
    volumes: data.map((x) => parseFloat(x[5] as string)),
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
    let binanceSym = symbol.toUpperCase().replace(/[/-]/g, '');
    if (!binanceSym.endsWith('USDT')) binanceSym += 'USDT';
    const [{ closes, highs, lows, volumes }, usdInr] = await Promise.all([
      getBinanceKlines(binanceSym, '1h', 200),
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
      symbol: symbol.toUpperCase(),
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
      signal, source: 'binance',
    };
  } catch (e) {
    console.error(`Binance fetch failed for ${symbol}`, e);
    return null;
  }
}
