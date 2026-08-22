// src/hooks/useCryptoWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { getUsdInr } from '../utils/cryptoData';

// Binance WebSocket: real-time crypto prices, free, no auth, browser-direct.
// wss://stream.binance.com:9443/ws/btcusdt@trade
// Combined stream: wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade

const WS_BASE = 'wss://stream.binance.com:9443/stream?streams=';

// Map CoinGecko symbols to Binance USDT pairs
const SYMBOL_TO_PAIR = {
  btc: 'btcusdt', eth: 'ethusdt', bnb: 'bnbusdt', sol: 'solusdt',
  xrp: 'xrpusdt', ada: 'adausdt', doge: 'dogeusdt', dot: 'dotusdt',
  avax: 'avaxusdt', link: 'linkusdt', matic: 'maticusdt', ltc: 'ltcusdt',
  trx: 'trxusdt', uni: 'uniusdt', atom: 'atomusdt', etc: 'etcusdt',
  xlm: 'xlmusdt', bch: 'bchusdt', fil: 'filusdt', near: 'nearusdt',
  apt: 'aptusdt', arb: 'arbusdt', sui: 'suiusdt', pepe: 'pepeusdt',
};

/**
 * Live crypto prices via Binance WebSocket.
 * @param {string[]} symbols - CoinGecko symbols (e.g. ['btc', 'eth', 'sol'])
 * @returns {{ prices: Object, connected: boolean }}
 *   prices: { btc: { priceUsd, priceInr, change24h, lastUpdate }, ... }
 */
export function useCryptoWebSocket(symbols = []) {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const usdInrRef = useRef(95.75);
  const reconnectTimer = useRef(null);

  // Keep USD/INR rate fresh
  useEffect(() => {
    getUsdInr().then(r => { usdInrRef.current = r; });
    const interval = setInterval(() => getUsdInr().then(r => { usdInrRef.current = r; }), 600000);
    return () => clearInterval(interval);
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (!symbols.length) return;

    const pairs = symbols
      .map(s => SYMBOL_TO_PAIR[s.toLowerCase()] || `${s.toLowerCase()}usdt`)
      .filter(Boolean);
    if (!pairs.length) return;

    const streamStr = pairs.map(p => `${p}@trade`).join('/');
    const wsUrl = `${WS_BASE}${streamStr}`;

    let closed = false;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Also fetch 24hr ticker data for change %
        pairs.forEach(pair => {
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair.toUpperCase()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d) {
                const sym = pair.replace('usdt', '');
                setPrices(prev => ({
                  ...prev,
                  [sym]: {
                    ...prev[sym],
                    change24h: parseFloat(d.priceChangePercent),
                    high24h: parseFloat(d.highPrice),
                    low24h: parseFloat(d.lowPrice),
                    volume24h: parseFloat(d.volume),
                  },
                }));
              }
            })
            .catch(() => {});
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Combined stream format: { stream: "btcusdt@trade", data: { ... } }
          const data = msg.data || msg;
          if (!data.p) return; // trade price

          const pair = (msg.stream || '').replace('@trade', '') || '';
          const sym = pair.replace('usdt', '');
          const priceUsd = parseFloat(data.p);
          const priceInr = priceUsd * usdInrRef.current;

          setPrices(prev => ({
            ...prev,
            [sym]: {
              ...prev[sym],
              priceUsd,
              priceInr,
              lastUpdate: Date.now(),
            },
          }));
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [symbols.join(',')]);

  return { prices, connected };
}

/**
 * Single-coin live price via WebSocket.
 * @param {string} symbol - e.g. 'BTC', 'ETH'
 */
export function useLivePrice(symbol) {
  const sym = symbol.toLowerCase().replace('usdt', '').replace('/', '');
  const { prices, connected } = useCryptoWebSocket([sym]);
  return { price: prices[sym] || null, connected };
}
