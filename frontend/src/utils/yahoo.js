// utils/yahoo.js
// ⚠️  Direct Yahoo Finance calls from the browser are blocked by CORS in production.
// These helpers now proxy through your backend, which handles Yahoo Finance / Alpha Vantage
// server-side where CORS is not an issue.

const API_BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

/** Search for a stock by name or ticker (uses Alpha Vantage on backend) */
export const searchYahoo = async (query) => {
  const res = await fetch(`${API_BASE}/markets/stocks/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) return { quotes: [] };
  const data = await res.json();
  return { quotes: Array.isArray(data) ? data : [] };
};

/** Get stock quote details — returns the stock from the backend's cached data */
export const getStockDetails = async (symbol) => {
  const res = await fetch(`${API_BASE}/markets/stocks`);
  if (!res.ok) return null;
  const stocks = await res.json();
  return stocks.find((s) => s.symbol?.toUpperCase() === symbol?.toUpperCase()) || null;
};

/** Get commodity price by symbol from backend (Alpha Vantage powered) */
export const getCommodity = async (symbol) => {
  const res = await fetch(`${API_BASE}/markets/commodities`);
  if (!res.ok) return null;
  const comms = await res.json();
  return comms.find((c) => c.symbol?.toUpperCase() === symbol?.toUpperCase()) || null;
};