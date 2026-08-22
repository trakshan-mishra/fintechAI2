// src/utils/cryptoData.js
// Reliable real-time crypto data fetched DIRECTLY from the browser.
// Bypasses the backend Worker (which gets rate-limited by CoinGecko on shared
// Cloudflare egress IPs and falls back to ₹0 mock coins).
//
// Sources (all CORS-enabled, browser-safe):
//   1. CoinGecko `/coins/markets` (vs_currency=inr) — rich metadata + sparkline
//   2. Binance `/ticker/24hr` batch — real-time price + 24h change (fallback)
// USD→INR rate via open.er-api (cached 10 min).

const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const COINGECKO_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets';
const COINGECKO_SEARCH = 'https://api.coingecko.com/api/v3/search';
const BINANCE_TICKER = 'https://api.binance.com/api/v3/ticker/24hr';

let _fx = { rate: null, ts: 0 };

export async function getUsdInr() {
  if (_fx.rate && Date.now() - _fx.ts < 10 * 60 * 1000) return _fx.rate;
  try {
    const res = await fetch(FX_URL);
    if (res.ok) {
      const rate = (await res.json())?.rates?.INR;
      if (rate && rate > 0) { _fx = { rate, ts: Date.now() }; return rate; }
    }
  } catch { /* fall through */ }
  return _fx.rate || 95.75; // sane fallback (current ~rate)
}

// Static metadata for the Binance fallback (CoinGecko ids + images for top coins).
const TOP_META = {
  BTC:   { id: 'bitcoin',      name: 'Bitcoin',     image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png' },
  ETH:   { id: 'ethereum',     name: 'Ethereum',    image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png' },
  BNB:   { id: 'binancecoin',  name: 'BNB',         image: 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon.png' },
  SOL:   { id: 'solana',       name: 'Solana',      image: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png' },
  XRP:   { id: 'ripple',       name: 'XRP',         image: 'https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  DOGE:  { id: 'dogecoin',     name: 'Dogecoin',    image: 'https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png' },
  ADA:   { id: 'cardano',      name: 'Cardano',     image: 'https://coin-images.coingecko.com/coins/images/975/large/cardano.png' },
  AVAX:  { id: 'avalanche-2',  name: 'Avalanche',   image: 'https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red.png' },
  TRX:   { id: 'tron',         name: 'TRON',        image: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png' },
  LINK:  { id: 'chainlink',    name: 'Chainlink',   image: 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  DOT:   { id: 'polkadot',     name: 'Polkadot',    image: 'https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png' },
  MATIC: { id: 'matic-network', name: 'Polygon',    image: 'https://coin-images.coingecko.com/coins/images/4713/large/polygon.png' },
  LTC:   { id: 'litecoin',     name: 'Litecoin',    image: 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png' },
  SHIB:  { id: 'shiba-inu',    name: 'Shiba Inu',   image: 'https://coin-images.coingecko.com/coins/images/11939/large/shiba.png' },
  UNI:   { id: 'uniswap',      name: 'Uniswap',     image: 'https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg' },
};
const FALLBACK_SYMBOLS = Object.keys(TOP_META);

// Fetch from Binance and normalize to the CoinGecko coin shape (prices in INR).
async function fetchFromBinance(limit, rate) {
  const syms = FALLBACK_SYMBOLS.slice(0, Math.min(limit, FALLBACK_SYMBOLS.length));
  const param = encodeURIComponent(JSON.stringify(syms.map(s => `${s}USDT`)));
  const res = await fetch(`${BINANCE_TICKER}?symbols=${param}`);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const rows = await res.json();
  return rows.map(row => {
    const base = row.symbol.replace('USDT', '');
    const meta = TOP_META[base] || { id: base.toLowerCase(), name: base, image: '' };
    const priceUsd = parseFloat(row.lastPrice);
    return {
      id: meta.id,
      symbol: base.toLowerCase(),
      name: meta.name,
      image: meta.image,
      current_price: priceUsd * rate,
      price_usd: priceUsd,
      market_cap: parseFloat(row.quoteVolume) * rate,
      total_volume: parseFloat(row.volume) * rate,
      market_cap_rank: null,
      price_change_percentage_24h: parseFloat(row.priceChangePercent),
      high_24h: parseFloat(row.highPrice) * rate,
      low_24h: parseFloat(row.lowPrice) * rate,
      sparkline_in_7d: { price: [] },
      _source: 'binance',
    };
  });
}

// Returns an array of top cryptocurrencies (price in INR), or throws if all sources fail.
export async function fetchTopCrypto(limit = 20) {
  const rate = await getUsdInr();
  try {
    const res = await fetch(`${COINGECKO_MARKETS}?vs_currency=inr&order=market_cap_desc&per_page=${Math.min(limit, 100)}&page=1&sparkline=true&price_change_percentage=24h,7d`);
    if (res.ok) {
      const data = await res.json();
      // Reject zero/mock payloads (CoinGecko returning empty on rate-limit)
      if (Array.isArray(data) && data.length && (data[0].current_price || 0) > 0) {
        return data.map(c => ({
          ...c,
          price_usd: c.current_price ? c.current_price / rate : null,
          market_cap_usd: c.market_cap ? c.market_cap / rate : null,
          _source: 'coingecko',
        }));
      }
    }
  } catch { /* try fallback */ }
  return fetchFromBinance(limit, rate);
}

// Browser-direct crypto search (CoinGecko). Returns { coins: [...] } shaped like the API.
export async function searchCrypto(query) {
  if (!query?.trim()) return { coins: [] };
  const rate = await getUsdInr();
  try {
    const sres = await fetch(`${COINGECKO_SEARCH}?query=${encodeURIComponent(query)}`);
    if (!sres.ok) return { coins: [] };
    const coins = (await sres.json()).coins?.slice(0, 8) || [];
    if (!coins.length) return { coins: [] };
    const ids = coins.map(c => c.id).join(',');
    const pres = await fetch(`${COINGECKO_MARKETS}?vs_currency=inr&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d`);
    if (!pres.ok) return { coins };
    const data = await pres.json();
    return { coins: data.map(c => ({ ...c, price_usd: c.current_price ? c.current_price / rate : null, _source: 'coingecko' })) };
  } catch {
    return { coins: [] };
  }
}

// True if a coin payload looks like the ₹0 mock fallback (unusable).
export function isMockCoin(coin) {
  return coin && (coin.current_price == null || coin.current_price === 0) && !coin._source;
}
