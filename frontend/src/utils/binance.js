// src/utils/binance.js

// ── Crypto: CoinGecko ID → TradingView symbol ────────────────────────────────
const CRYPTO_TV_MAP = {
  bitcoin:          'BINANCE:BTCUSDT',
  ethereum:         'BINANCE:ETHUSDT',
  binancecoin:      'BINANCE:BNBUSDT',
  solana:           'BINANCE:SOLUSDT',
  ripple:           'BINANCE:XRPUSDT',
  cardano:          'BINANCE:ADAUSDT',
  dogecoin:         'BINANCE:DOGEUSDT',
  polkadot:         'BINANCE:DOTUSDT',
  'avalanche-2':    'BINANCE:AVAXUSDT',
  chainlink:        'BINANCE:LINKUSDT',
  'matic-network':  'BINANCE:MATICUSDT',
  'shiba-inu':      'BINANCE:SHIBUSDT',
  litecoin:         'BINANCE:LTCUSDT',
  uniswap:          'BINANCE:UNIUSDT',
  cosmos:           'BINANCE:ATOMUSDT',
  tron:             'BINANCE:TRXUSDT',
  'near-protocol':  'BINANCE:NEARUSDT',
  aptos:            'BINANCE:APTUSDT',
  arbitrum:         'BINANCE:ARBUSDT',
  sui:              'BINANCE:SUIUSDT',
  pepe:             'BINANCE:PEPEUSDT',
  stellar:          'BINANCE:XLMUSDT',
  'ethereum-classic':'BINANCE:ETCUSDT',
  'bitcoin-cash':   'BINANCE:BCHUSDT',
  filecoin:         'BINANCE:FILUSDT',
  'internet-computer': 'BINANCE:ICPUSDT',
  vechain:          'BINANCE:VETUSDT',
  hedera:           'BINANCE:HBARUSDT',
};

// ── Indian Stocks (NSE) ──────────────────────────────────────────────────────
const NSE_STOCKS = new Set([
  'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','HINDUNILVR','SBIN','BHARTIARTL',
  'ITC','KOTAKBANK','LT','AXISBANK','BAJFINANCE','ASIANPAINT','MARUTI','TITAN',
  'SUNPHARMA','ULTRACEMCO','WIPRO','ONGC','NTPC','POWERGRID','M&M','BAJAJFINSV',
  'HCLTECH','NESTLEIND','TECHM','TATAMOTORS','COALINDIA','ADANIGREEN','ADANIPORTS',
  'JSWSTEEL','TATASTEEL','HINDALCO','DIVISLAB','DRREDDY','CIPLA','GRASIM','INDUSINDBK',
  'EICHERMOT','BPCL','BRITANNIA','HEROMOTOCO','APOLLOHOSP','TATACONSUM','SBILIFE',
  'HDFCLIFE','PIDILITIND','UPL','BAJAJ-AUTO',
]);

// ── US Stocks ────────────────────────────────────────────────────────────────
const US_STOCKS = {
  // NASDAQ
  AAPL:'NASDAQ:AAPL', MSFT:'NASDAQ:MSFT', GOOGL:'NASDAQ:GOOGL', GOOG:'NASDAQ:GOOG',
  AMZN:'NASDAQ:AMZN', META:'NASDAQ:META', NVDA:'NASDAQ:NVDA', TSLA:'NASDAQ:TSLA',
  NFLX:'NASDAQ:NFLX', ADBE:'NASDAQ:ADBE', PYPL:'NASDAQ:PYPL', INTC:'NASDAQ:INTC',
  AMD:'NASDAQ:AMD',   QCOM:'NASDAQ:QCOM', CSCO:'NASDAQ:CSCO', AVGO:'NASDAQ:AVGO',
  TXN:'NASDAQ:TXN',  AMAT:'NASDAQ:AMAT', LRCX:'NASDAQ:LRCX', KLAC:'NASDAQ:KLAC',
  PANW:'NASDAQ:PANW', CRWD:'NASDAQ:CRWD', ZS:'NASDAQ:ZS',
  // NYSE
  JPM:'NYSE:JPM',    BAC:'NYSE:BAC',   WMT:'NYSE:WMT',   JNJ:'NYSE:JNJ',
  V:'NYSE:V',        MA:'NYSE:MA',     UNH:'NYSE:UNH',   HD:'NYSE:HD',
  PG:'NYSE:PG',      DIS:'NYSE:DIS',   KO:'NYSE:KO',     PEP:'NYSE:PEP',
  XOM:'NYSE:XOM',    CVX:'NYSE:CVX',   BA:'NYSE:BA',     GS:'NYSE:GS',
  MS:'NYSE:MS',      C:'NYSE:C',       WFC:'NYSE:WFC',   IBM:'NYSE:IBM',
};

// ── Commodities ──────────────────────────────────────────────────────────────
const COMMODITY_TV_MAP = {
  GOLD:       'TVC:GOLD',
  SILVER:     'TVC:SILVER',
  CRUDE:      'TVC:USOIL',
  'CRUDE OIL':'TVC:USOIL',
  OIL:        'TVC:USOIL',
  NATURALGAS: 'TVC:NATGAS',
  GAS:        'TVC:NATGAS',
  PLATINUM:   'TVC:PLATINUM',
  COPPER:     'TVC:COPPER',
  WHEAT:      'CBOT:ZW1!',
  CORN:       'CBOT:ZC1!',
};

/**
 * Returns a TradingView symbol string for the given asset symbol + type.
 * Returns null if no mapping found (triggers "Chart not available" UI).
 */
export function getTVSymbol(symbol, assetType) {
  if (!symbol) return null;
  const s = symbol.toUpperCase().trim();

  if (assetType === 'crypto') {
    // symbol may be CoinGecko ID (bitcoin) or ticker (BTC)
    if (CRYPTO_TV_MAP[symbol.toLowerCase()]) return CRYPTO_TV_MAP[symbol.toLowerCase()];
    // Try ticker-based lookup
    return `BINANCE:${s}USDT`;
  }

  if (assetType === 'stock') {
    // US stocks
    if (US_STOCKS[s]) return US_STOCKS[s];
    // Indian NSE stocks
    if (NSE_STOCKS.has(s)) return `NSE:${s}`;
    // Heuristic: if symbol looks Indian (all caps, 2-20 chars, no dot), try NSE first
    if (/^[A-Z&-]{2,20}$/.test(s) && !s.includes('.')) {
      // Check if it's a known US exchange ticker pattern
      if (s.length <= 5 && !NSE_STOCKS.has(s)) return `NASDAQ:${s}`;
      return `NSE:${s}`;
    }
    return `NSE:${s}`;
  }

  if (assetType === 'commodity') {
    if (COMMODITY_TV_MAP[s]) return COMMODITY_TV_MAP[s];
    return null;
  }

  return null;
}

/**
 * Fetch live price from Binance for a crypto ticker (e.g. "BTC", "ETH")
 */
export async function getBinancePrice(ticker) {
  try {
    const symbol = ticker.toUpperCase().replace('USDT', '') + 'USDT';
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await res.json();
    return parseFloat(data.price) || null;
  } catch {
    return null;
  }
}

/**
 * loadBinanceSymbols — returns a list of active USDT trading pairs from Binance.
 * Used by TradingDashboard for symbol autocomplete/search.
 */
export async function loadBinanceSymbols() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await res.json();
    return (data.symbols || [])
      .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map(s => ({
        symbol: s.baseAsset,
        pair: s.symbol,
        label: `${s.baseAsset}/USDT`,
      }));
  } catch {
    // Fallback: return top coins if Binance unreachable
    return [
      'BTC','ETH','BNB','SOL','XRP','ADA','DOGE','DOT','AVAX','LINK',
      'MATIC','LTC','SHIB','TRX','UNI','XLM','ETC','BCH','ATOM','FIL',
    ].map(s => ({ symbol: s, pair: `${s}USDT`, label: `${s}/USDT` }));
  }
}