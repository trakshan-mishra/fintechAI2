import { cacheSet, cacheGet } from './cache';
import { getLiveUsdInr } from './fx';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const DEFAULT_STOCKS: Record<string, string> = {
  // US megacaps
  AAPL: 'Apple Inc.', GOOGL: 'Alphabet Inc.', MSFT: 'Microsoft Corp.',
  AMZN: 'Amazon.com Inc.', TSLA: 'Tesla Inc.', NVDA: 'NVIDIA Corp.',
  META: 'Meta Platforms', NFLX: 'Netflix Inc.',
  AMD: 'AMD', INTC: 'Intel Corp.', ORCL: 'Oracle Corp.',
  ADBE: 'Adobe Inc.', PYPL: 'PayPal', CRM: 'Salesforce',
  UBER: 'Uber', SHOP: 'Shopify', SQ: 'Block Inc.',
  JPM: 'JPMorgan Chase', BAC: 'Bank of America', V: 'Visa', MA: 'Mastercard',
  WMT: 'Walmart', DIS: 'Disney', KO: 'Coca-Cola', PEP: 'PepsiCo',
  XOM: 'ExxonMobil', CVX: 'Chevron', PFE: 'Pfizer', JNJ: 'Johnson & Johnson',
  UNH: 'UnitedHealth', BA: 'Boeing', GS: 'Goldman Sachs',
  // NSE majors
  'RELIANCE.NS': 'Reliance Industries', 'TCS.NS': 'Tata Consultancy Services',
  'INFY.NS': 'Infosys', 'HDFCBANK.NS': 'HDFC Bank',
  'ICICIBANK.NS': 'ICICI Bank', 'SBIN.NS': 'State Bank of India',
  'BHARTIARTL.NS': 'Bharti Airtel', 'ITC.NS': 'ITC Limited',
  'KOTAKBANK.NS': 'Kotak Mahindra Bank', 'LT.NS': 'Larsen & Toubro',
  'HINDUNILVR.NS': 'Hindustan Unilever', 'BAJFINANCE.NS': 'Bajaj Finance',
  'ASIANPAINT.NS': 'Asian Paints', 'MARUTI.NS': 'Maruti Suzuki',
  'TITAN.NS': 'Titan Company', 'WIPRO.NS': 'Wipro',
  'ONGC.NS': 'Oil & Natural Gas Corp', 'NTPC.NS': 'NTPC Limited',
  'TATAMOTORS.NS': 'Tata Motors', 'SUNPHARMA.NS': 'Sun Pharmaceutical',
  // NSE expanded
  'AXISBANK.NS': 'Axis Bank', 'HCLTECH.NS': 'HCL Technologies',
  'ULTRACEMCO.NS': 'UltraTech Cement', 'NESTLEIND.NS': 'Nestle India',
  'POWERGRID.NS': 'Power Grid Corp', 'TATASTEEL.NS': 'Tata Steel',
  'COALINDIA.NS': 'Coal India', 'DRREDDY.NS': 'Dr Reddys Labs',
  'CIPLA.NS': 'Cipla', 'GRASIM.NS': 'Grasim Industries',
  'ADANIPORTS.NS': 'Adani Ports', 'EICHERMOT.NS': 'Eicher Motors',
  'BPCL.NS': 'BPCL', 'BRITANNIA.NS': 'Britannia', 'HEROMOTOCO.NS': 'Hero MotoCorp',
  'DIVISLAB.NS': 'Divis Labs', 'TATACONSUM.NS': 'Tata Consumer',
  'BAJAJ-AUTO.NS': 'Bajaj Auto', 'UPL.NS': 'UPL',
  'SHRIRAMFIN.NS': 'Shriram Finance', 'SBILIFE.NS': 'SBI Life',
  'HDFCLIFE.NS': 'HDFC Life', 'TECHM.NS': 'Tech Mahindra',
  'ADANIENT.NS': 'Adani Enterprises', 'ZOMATO.NS': 'Zomato',
  'DMART.NS': 'Avenue Supermarts', 'PNB.NS': 'Punjab National Bank',
  'CANBK.NS': 'Canara Bank', 'INDUSINDBK.NS': 'IndusInd Bank',
  'M&M.NS': 'Mahindra & Mahindra', 'BAJAJFINSV.NS': 'Bajaj Finserv',
  'PIDILITIND.NS': 'Pidilite Industries', 'DABUR.NS': 'Dabur India',
  'GODREJCP.NS': 'Godrej Consumer', 'MARICO.NS': 'Marico',
  'HAVELLS.NS': 'Havells India', 'DLF.NS': 'DLF',
  'IOC.NS': 'Indian Oil Corp', 'GAIL.NS': 'GAIL India',
  'MOTHERSON.NS': 'Motherson Sumi', 'BOSCHLTD.NS': 'Bosch',
};

const DEFAULT_COMMODITIES: Record<string, string> = {
  'GC=F': 'Gold', 'SI=F': 'Silver', 'CL=F': 'Crude Oil (WTI)',
  'BZ=F': 'Crude Oil (Brent)', 'NG=F': 'Natural Gas', 'HG=F': 'Copper',
  'PL=F': 'Platinum', 'PA=F': 'Palladium',
  'ZW=F': 'Wheat', 'ZC=F': 'Corn', 'ZS=F': 'Soybeans', 'KC=F': 'Coffee',
  'SB=F': 'Sugar', 'CC=F': 'Cocoa', 'CT=F': 'Cotton',
  'LE=F': 'Live Cattle', 'GF=F': 'Feeder Cattle',
  'ZN=F': 'US 10Y Treasury', 'ZB=F': 'US 30Y Treasury',
};

const PRICE_FIELDS = ['current_price', 'high_24h', 'low_24h', 'ath', 'atl', 'price_change_24h'];
const VOLUME_FIELDS = ['market_cap', 'total_volume', 'fully_diluted_valuation'];

// ── Binance fallback metadata (replaces the ₹0 mock) ──────────────────────────
const BINANCE_FALLBACK: [string, string, string, string][] = [
  ['BTC', 'bitcoin', 'Bitcoin', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'],
  ['ETH', 'ethereum', 'Ethereum', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'],
  ['BNB', 'binancecoin', 'BNB', 'https://assets.coingecko.com/coins/images/825/large/bnb-icon.png'],
  ['SOL', 'solana', 'Solana', 'https://assets.coingecko.com/coins/images/4128/large/solana.png'],
  ['XRP', 'ripple', 'XRP', 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'],
  ['DOGE', 'dogecoin', 'Dogecoin', 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png'],
  ['ADA', 'cardano', 'Cardano', 'https://assets.coingecko.com/coins/images/975/large/cardano.png'],
  ['AVAX', 'avalanche-2', 'Avalanche', 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red.png'],
  ['TRX', 'tron', 'TRON', 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png'],
  ['LINK', 'chainlink', 'Chainlink', 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png'],
  ['DOT', 'polkadot', 'Polkadot', 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png'],
  ['MATIC', 'matic-network', 'Polygon', 'https://assets.coingecko.com/coins/images/4713/large/polygon.png'],
];

interface Coin {
  id: string; symbol: string; name: string; image?: string;
  current_price: number; price_usd?: number; market_cap?: number;
  total_volume?: number; market_cap_rank?: number;
  price_change_percentage_24h?: number; high_24h?: number; low_24h?: number;
  sparkline_in_7d?: { price: number[] };
  [key: string]: unknown;
}

function convertCryptoToInr(data: Coin[], usdInr: number): Coin[] {
  for (const coin of data) {
    coin.price_usd = coin.current_price;
    coin.market_cap_usd = coin.market_cap;
    for (const f of PRICE_FIELDS) {
      if (coin[f] != null) {
        const raw = coin[f] as number;
        const decimals = Math.abs(raw) < 1 ? 4 : 2;
        const mult = 10 ** decimals;
        coin[f] = Math.round(raw * usdInr * mult) / mult;
      }
    }
    for (const f of VOLUME_FIELDS) {
      if (coin[f] != null) coin[f] = Math.round((coin[f] as number) * usdInr);
    }
    if (coin.sparkline_in_7d?.price) {
      coin.sparkline_in_7d.price = coin.sparkline_in_7d.price.map((p) => round2(p * usdInr));
    }
  }
  return data;
}

// Real-time Kraken fallback — works from Cloudflare Worker IPs (Binance blocks them 403).
const KRAKEN_PAIRS: Record<string, [string, string, string, string]> = {
  BTC:   ['XXBTZUSD', 'bitcoin', 'Bitcoin', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'],
  ETH:   ['XETHZUSD', 'ethereum', 'Ethereum', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'],
  SOL:   ['SOLUSD', 'solana', 'Solana', 'https://assets.coingecko.com/coins/images/4128/large/solana.png'],
  XRP:   ['XXRPZUSD', 'ripple', 'XRP', 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'],
  ADA:   ['ADAUSD', 'cardano', 'Cardano', 'https://assets.coingecko.com/coins/images/975/large/cardano.png'],
  DOT:   ['DOTUSD', 'polkadot', 'Polkadot', 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png'],
  LTC:   ['XLTCZUSD', 'litecoin', 'Litecoin', 'https://assets.coingecko.com/coins/images/2/large/litecoin.png'],
  AVAX:  ['AVAXUSD', 'avalanche-2', 'Avalanche', 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red.png'],
  LINK:  ['LINKUSD', 'chainlink', 'Chainlink', 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png'],
  MATIC: ['MATICUSD', 'matic-network', 'Polygon', 'https://assets.coingecko.com/coins/images/4713/large/polygon.png'],
};

async function getKrakenFallbackCrypto(limit: number): Promise<Coin[]> {
  try {
    const usdInr = await getLiveUsdInr();
    const entries = Object.entries(KRAKEN_PAIRS).slice(0, Math.min(limit, Object.keys(KRAKEN_PAIRS).length));
    const pairNames = entries.map(([, v]) => v[0]).join(',');
    const r = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pairNames}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Kraken ${r.status}`);
    const data = await r.json() as { result?: Record<string, { c: string[]; p: string[]; l: string[]; h: string[]; v: string[] }> };
    if (!data.result) return [];
    return entries.map(([base, meta]): Coin => {
      const [pair, cid, name, image] = meta;
      const row = data.result![pair] || data.result![`${pair}USDT`];
      const priceUsd = row ? parseFloat(row.c[0]) : 0;
      const prevClose = row ? parseFloat(row.p[1]) : priceUsd;
      return {
        id: cid, symbol: base.toLowerCase(), name, image,
        current_price: round2(priceUsd * usdInr),
        price_usd: priceUsd,
        market_cap: Math.round((row ? parseFloat(row.v[1]) : 0) * priceUsd * usdInr),
        total_volume: Math.round((row ? parseFloat(row.v[0]) : 0) * priceUsd * usdInr),
        market_cap_rank: undefined,
        price_change_percentage_24h: prevClose ? (priceUsd - prevClose) / prevClose * 100 : 0,
        high_24h: round2((row ? parseFloat(row.h[1]) : priceUsd) * usdInr),
        low_24h: round2((row ? parseFloat(row.l[1]) : priceUsd) * usdInr),
        sparkline_in_7d: { price: [] },
      };
    });
  } catch (e) {
    console.error('Kraken fallback failed', e);
    return [];
  }
}

export async function getCryptoPrices(limit = 20): Promise<Coin[]> {
  const cacheKey = `crypto_inr_${limit}`;
  const cached = cacheGet<Coin[]>(cacheKey);
  if (cached) return cached;
  try {
    const usdInr = await getLiveUsdInr();
    const params = new URLSearchParams({
      vs_currency: 'usd', order: 'market_cap_desc',
      per_page: String(Math.min(limit, 100)), page: '1',
      sparkline: 'false', price_change_percentage: '24h,7d',
    });
    const resp = await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'TradeTrackWorker/1.0' },
    });
    if (resp.ok) {
      const data = convertCryptoToInr(await resp.json() as Coin[], usdInr);
      if (data.length && (data[0].current_price || 0) > 0) {
        cacheSet(cacheKey, data, 120);
        return data;
      }
    }
  } catch (e) {
    console.error('Crypto API error', e);
  }
  const kraken = await getKrakenFallbackCrypto(limit);
  if (kraken.length) {
    cacheSet(cacheKey, kraken, 60);
    return kraken;
  }
  return cached ?? [];
}

export async function searchCrypto(query: string): Promise<{ coins: Coin[] }> {
  try {
    const usdInr = await getLiveUsdInr();
    const searchResp = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!searchResp.ok) return { coins: [] };
    const coins = ((await searchResp.json() as { coins?: Coin[] }).coins ?? []).slice(0, 5);
    if (!coins.length) return { coins: [] };
    const ids = coins.map((c) => c.id).join(',');
    const priceResp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?${new URLSearchParams({
        vs_currency: 'usd', ids, order: 'market_cap_desc',
        sparkline: 'true', price_change_percentage: '24h,7d',
      })}`,
      { headers: { Accept: 'application/json' } },
    );
    if (priceResp.ok) return { coins: convertCryptoToInr(await priceResp.json() as Coin[], usdInr) };
    return { coins };
  } catch (e) {
    console.error('Crypto search error', e);
    return { coins: [] };
  }
}

interface StockRow {
  symbol: string; name: string; price: number; price_usd: number | null;
  change: number; change_percent: number; high: number; low: number;
  volume: number; currency: string;
}

async function fetchSingle(sym: string, name: string, usdInr: number): Promise<StockRow | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    );
    if (!r.ok) return null;
    const data = await r.json() as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
    const result = data?.chart?.result?.[0];
    if (!result?.meta) return null;
    const meta = result.meta as Record<string, number | string>;
    const price = meta.regularMarketPrice as number;
    const prev = (meta.previousClose || meta.chartPreviousClose || 1) as number;
    if (price == null) return null;
    const clean = sym.replace('.NS', '').replace('.BO', '');
    const currency = (meta.currency as string) ?? 'USD';
    const isIndianStock = sym.endsWith('.NS') || sym.endsWith('.BO');
    const mult = isIndianStock ? 1 : usdInr;
    return {
      symbol: clean, name,
      price: round2(price * mult),
      price_usd: isIndianStock ? null : round2(price),
      change: round2((price - prev) * mult),
      change_percent: round2((price - prev) / prev * 100),
      high: round2((meta.regularMarketDayHigh as number ?? price) * mult),
      low: round2((meta.regularMarketDayLow as number ?? price) * mult),
      volume: meta.regularMarketVolume as number ?? 0,
      currency: 'INR',
    };
  } catch (e) {
    console.warn(`Yahoo chart fetch failed for ${sym}`, e);
    return null;
  }
}

async function fetchMarketData(symbols: string[], names: Record<string, string> = {}): Promise<StockRow[]> {
  if (!symbols.length) return [];
  const usdInr = await getLiveUsdInr();
  const order = new Map(symbols.map((s, i) => [s.replace('.NS', '').replace('.BO', ''), i]));
  const settled = await Promise.all(symbols.map((s) => fetchSingle(s, names[s] || s, usdInr)));
  const results = settled.filter((r): r is StockRow => r !== null);
  results.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
  return results;
}

export async function getStocks(): Promise<StockRow[]> {
  const cached = cacheGet<StockRow[]>('stocks_default');
  if (cached) return cached;
  const results = await fetchMarketData(Object.keys(DEFAULT_STOCKS), DEFAULT_STOCKS);
  if (results.length) cacheSet('stocks_default', results, 120);
  return results;
}

export async function getCommodities(): Promise<StockRow[]> {
  const cached = cacheGet<StockRow[]>('commodities_default');
  if (cached) return cached;
  const results = await fetchMarketData(Object.keys(DEFAULT_COMMODITIES), DEFAULT_COMMODITIES);
  if (results.length) cacheSet('commodities_default', results, 180);
  return results;
}

export async function searchYfinanceGlobal(query: string): Promise<StockRow[]> {
  try {
    const r = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?${new URLSearchParams({
        q: query, quotesCount: '8', newsCount: '0',
      })}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    );
    if (!r.ok) return [];
    const data = await r.json() as { quotes?: Array<{ symbol: string; shortname?: string; longname?: string }> };
    const quotes = (data?.quotes ?? []).filter((q) => q.symbol);
    if (!quotes.length) return [];
    const symbols = quotes.slice(0, 8).map((q) => q.symbol);
    const names: Record<string, string> = {};
    for (const q of quotes) names[q.symbol] = q.shortname || q.longname || q.symbol;
    return await fetchMarketData(symbols, names);
  } catch (e) {
    console.warn('Yahoo search failed', e);
    return [];
  }
}
