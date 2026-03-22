// utils/search.js
// All market searches go through the backend to avoid browser CORS blocks.
// Crypto   → CoinGecko (via backend /markets/crypto/search)
// Stocks   → Alpha Vantage symbol search (via backend /markets/stocks/search)

const API_BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

export const searchAll = async (query) => {
  if (!query || !query.trim()) return { crypto: [], stocks: [] };

  try {
    const [cryptoRes, stocksRes] = await Promise.allSettled([
      fetch(`${API_BASE}/markets/crypto/search?query=${encodeURIComponent(query)}`),
      fetch(`${API_BASE}/markets/stocks/search?query=${encodeURIComponent(query)}`),
    ]);

    const crypto =
      cryptoRes.status === 'fulfilled' && cryptoRes.value.ok
        ? (await cryptoRes.value.json()).coins || []
        : [];

    const stocks =
      stocksRes.status === 'fulfilled' && stocksRes.value.ok
        ? await stocksRes.value.json()
        : [];

    return { crypto, stocks };
  } catch (err) {
    console.error('searchAll error:', err);
    return { crypto: [], stocks: [] };
  }
};