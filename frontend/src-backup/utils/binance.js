// utils/binance.js

let binanceSymbols = [];

// Map for Indian stocks (NSE)
const STOCK_TO_TV = {
  RELIANCE: 'NSE:RELIANCE',
  TCS: 'NSE:TCS',
  HDFCBANK: 'NSE:HDFCBANK',
  INFY: 'NSE:INFY',
  ICICIBANK: 'NSE:ICICIBANK',
  HINDUNILVR: 'NSE:HINDUNILVR',
  ITC: 'NSE:ITC',
  SBIN: 'NSE:SBIN',
  BHARTIARTL: 'NSE:BHARTIARTL',
  BAJFINANCE: 'NSE:BAJFINANCE',
  WIPRO: 'NSE:WIPRO',
  TATAMOTORS: 'NSE:TATAMOTORS',
  AXISBANK: 'NSE:AXISBANK',
  KOTAKBANK: 'NSE:KOTAKBANK',
  LT: 'NSE:LT',
  ASIANPAINT: 'NSE:ASIANPAINT',
  MARUTI: 'NSE:MARUTI',
  TITAN: 'NSE:TITAN',
  NESTLEIND: 'NSE:NESTLEIND',
  ULTRACEMCO: 'NSE:ULTRACEMCO',
  SUNPHARMA: 'NSE:SUNPHARMA',
  HCLTECH: 'NSE:HCLTECH',
  TECHM: 'NSE:TECHM',
  ADANIENT: 'NSE:ADANIENT',
  ONGC: 'NSE:ONGC',
  NTPC: 'NSE:NTPC',
  POWERGRID: 'NSE:POWERGRID',
  TATASTEEL: 'NSE:TATASTEEL',
  JSWSTEEL: 'NSE:JSWSTEEL',
};

// Map for commodities
const COMMODITY_TO_TV = {
  GOLD: 'COMEX:GC1!',
  SILVER: 'COMEX:SI1!',
  OIL: 'NYMEX:CL1!',
  CRUDE: 'NYMEX:CL1!',
  BRENT: 'ICEEUR:B1!',
  NG: 'NYMEX:NG1!',
  NATURALGAS: 'NYMEX:NG1!',
  COPPER: 'COMEX:HG1!',
  PLATINUM: 'NYMEX:PL1!',
  PALLADIUM: 'NYMEX:PA1!',
};

// Load Binance symbols once
export const loadBinanceSymbols = async () => {
  try {
    const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    const data = await res.json();

    binanceSymbols = data.symbols
      .filter(s => s.status === "TRADING")
      .map(s => s.symbol);

    console.log("✅ Binance symbols loaded:", binanceSymbols.length);
  } catch (err) {
    console.error("❌ Failed to load Binance symbols", err);
  }
};

// Get TradingView symbol dynamically
export const getTVSymbol = (symbol, assetType = 'crypto') => {
  if (!symbol) return null;

  const base = symbol.toUpperCase();

  // Handle stocks
  if (assetType === 'stock') {
    // Check if we have a direct mapping
    if (STOCK_TO_TV[base]) {
      return STOCK_TO_TV[base];
    }
    // Default NSE format
    return `NSE:${base}`;
  }

  // Handle commodities
  if (assetType === 'commodity') {
    if (COMMODITY_TO_TV[base]) {
      return COMMODITY_TO_TV[base];
    }
    return null;
  }

  // Handle crypto (default)
  const usdtPair = `${base}USDT`;
  const btcPair = `${base}BTC`;

  if (binanceSymbols.includes(usdtPair)) {
    return `BINANCE:${usdtPair}`;
  }

  if (binanceSymbols.includes(btcPair)) {
    return `BINANCE:${btcPair}`;
  }

  return null; // no valid pair
};

// Fetch live price (Binance)
export const getBinancePrice = async (symbol) => {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`
    );
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
};