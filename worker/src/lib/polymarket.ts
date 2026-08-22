interface PolymarketMarket {
  question: string; description: string;
  outcomes: string[]; outcome_prices: unknown[];
  volume: number; liquidity: number; end_date: string;
}

export async function getPolymarketSentiment(query: string): Promise<{ markets: PolymarketMarket[]; source: string }> {
  try {
    const r = await fetch(
      `https://gamma-api.polymarket.com/markets?${new URLSearchParams({
        _limit: '5', active: 'true', closed: 'false', query,
      })}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (r.ok) {
      const markets = await r.json() as Array<Record<string, unknown>>;
      if (markets?.length) {
        const results = markets.slice(0, 5).map((m) => {
          let outcomePrices = (m.outcomePrices ?? []) as unknown[];
          if (typeof outcomePrices === 'string') {
            try { outcomePrices = JSON.parse(outcomePrices); } catch { outcomePrices = []; }
          }
          let outcomes = (m.outcomes ?? []) as string[];
          if (typeof outcomes === 'string') {
            try { outcomes = JSON.parse(outcomes); } catch { outcomes = []; }
          }
          return {
            question: (m.question as string) ?? '',
            description: ((m.description as string) ?? '').slice(0, 200),
            outcomes,
            outcome_prices: outcomePrices,
            volume: (m.volume as number) ?? 0,
            liquidity: (m.liquidity as number) ?? 0,
            end_date: (m.endDate as string) ?? '',
          };
        });
        return { markets: results, source: 'polymarket' };
      }
    }
  } catch (e) {
    console.warn('Polymarket fetch failed', e);
  }
  return { markets: [], source: 'polymarket' };
}
