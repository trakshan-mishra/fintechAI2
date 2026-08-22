const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const std = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

function ewm(prices: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const out = [prices[0]];
  for (let i = 1; i < prices.length; i++) out.push(alpha * prices[i] + (1 - alpha) * out[i - 1]);
  return out;
}

export function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return ewm(prices, period).at(-1) ?? null;
}

export function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const deltas = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? -d : 0));
  let avgGain = mean(gains.slice(0, period));
  let avgLoss = mean(losses.slice(0, period));
  for (let i = period; i < deltas.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function macd(prices: number[], fast = 12, slow = 26, signal = 9): [number | null, number | null, number | null] {
  if (prices.length < slow) return [null, null, null];
  const emaFast = ewm(prices, fast);
  const emaSlow = ewm(prices, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ewm(macdLine, signal);
  const last = macdLine.length - 1;
  return [macdLine[last], signalLine[last], macdLine[last] - signalLine[last]];
}

export function bollingerBands(prices: number[], period = 20, numStd = 2): [number | null, number | null, number | null, number | null] {
  if (prices.length < period) return [null, null, null, null];
  const window = prices.slice(-period);
  const m = mean(window);
  const s = std(window);
  const upper = m + numStd * s;
  const lower = m - numStd * s;
  const width = m ? (upper - lower) / m * 100 : 0;
  return [upper, m, lower, width];
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (highs.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return ema(trs, period);
}

export function fibonacciRetracement(high: number, low: number): Record<string, number> {
  const d = high - low;
  const levels: [string, number][] = [['0.236', 0.236], ['0.382', 0.382], ['0.500', 0.5], ['0.618', 0.618], ['0.786', 0.786]];
  return Object.fromEntries(levels.map(([k, v]) => [k, Math.round((high - d * v) * 1e6) / 1e6]));
}

export function pivotPoints(high: number, low: number, close: number) {
  const pp = (high + low + close) / 3;
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return {
    pivot: r(pp),
    resistance_1: r(2 * pp - low),
    resistance_2: r(pp + (high - low)),
    support_1: r(2 * pp - high),
    support_2: r(pp - (high - low)),
  };
}
