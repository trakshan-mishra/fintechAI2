import { cacheSet, cacheGet } from './cache';

export async function getLiveUsdInr(): Promise<number> {
  const cached = cacheGet<number>('usd_inr');
  if (cached) return cached;

  for (const url of [
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
  ]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const data = await r.json() as { rates?: { INR?: number } };
        const rate = data?.rates?.INR;
        if (rate && rate > 0) {
          cacheSet('usd_inr', rate, 600);
          return rate;
        }
      }
    } catch { /* try next */ }
  }
  return 95.75;
}
