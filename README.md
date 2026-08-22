# TradeTrack Pro

Institutional-style market intelligence and personal finance platform built for Indian investors. Real-time crypto prices via WebSocket, 48 stocks and 19 commodities in INR, AI-powered analysis, SIP planning, market scanner, and cross-asset market insights.

**Live:** [tradetrack-pro.pages.dev](https://tradetrack-pro.pages.dev)

---

## Features

### Markets
- **Crypto** — Real-time prices via Binance WebSocket (browser-direct, free, no polling), with CoinGecko + Kraken fallback
- **Stocks** — 48 stocks (US megacaps + NSE majors) via Yahoo Finance, all converted to INR
- **Commodities** — 19 commodities (Gold, Silver, Crude, NatGas, Wheat, Corn, Coffee, etc.) in INR
- **Insights Tab** — Cross-asset relationship engine with "Why it moves" sections, cross-asset signals, and affected sectors. Covers USD/INR, crude oil, gold, Fed/RBI rates, crypto-tech correlation, and inflation

### Discover (Investment Intelligence Center)
- **Market Scanner** — Scans crypto + stocks by Momentum, Oversold, High Volume, Breakout, or Value. Ranks candidates with live metrics
- **SIP Calculator** — Step-up SIP, inflation-adjusted real value, goal planning, interactive growth chart
- **Return Comparison** — Live 24h returns for Gold & Bitcoin vs long-term CAGR for FD, PPF, mutual funds, S&P 500
- **Best Fit** — AI-powered asset allocation based on age, horizon, risk profile, and goal
- **Trending** — Top crypto and stock movers with momentum scores
- **Upcoming IPOs** — AI-searched IPO data with GMP, subscription, and risk factors

### AI Analysis
- **Trading Dashboard** — RSI, MACD, EMA, Bollinger Bands, Fibonacci, pivot points, signal scores (Kraken OHLC data)
- **AI Predictions** — Per-asset analysis (crypto, stocks, commodities) using live data + Gemini + Google Search
- **AI Chat** — Context-aware financial assistant with web search and chat history
- **Receipt Scanner** — OCR-powered receipt parsing

### Finance
- **Portfolio** — Holdings tracking with AI recommendations
- **Transactions** — Income/expense tracking with category breakdown
- **Invoices** — GST invoicing
- **Tax Summary** — Tax calculations

### Mobile UX
- Bottom navigation bar (Home, Discover, Markets, AI, Settings)
- Code-splitting — pages lazy-load on demand (main bundle 424KB, not 1.6MB)
- Safe-area insets for notched phones
- Inline header menu (no floating button overlap)
- Responsive charts and grids

---

## Architecture

```
tradetrack/
├── frontend/          # React 19 (CRA) + Tailwind + Radix UI
├── worker/            # Cloudflare Worker (Hono + D1 + Workers AI)
└── backend/           # Legacy Python (reference only, not deployed)
```

### Frontend
- **React 19** + Create React App with **code-splitting** (React.lazy for all pages)
- **Tailwind CSS** + shadcn/ui (Radix primitives)
- **Recharts** for charts, **TradingView** widgets for advanced charts
- **Binance WebSocket** for real-time crypto prices (browser-direct, free)
- **Firebase Auth** (Google ID tokens + OTP session tokens)
- Deployed to **Cloudflare Pages** (manual deploy via wrangler)

### Backend (Cloudflare Worker)
- **Hono** framework on Cloudflare Workers
- **D1** (SQLite) for users, transactions, sessions, OTP codes, AI chats
- **Workers AI** binding (free tier, 10K neurons/day) as AI fallback
- **Data sources:**
  - Crypto prices: CoinGecko → Kraken fallback (Binance blocks CF IPs with 403)
  - Crypto predictions: Kraken OHLC (real-time indicators)
  - Stocks/Commodities: Yahoo Finance → INR conversion via live USD/INR
  - USD/INR: open.er-api.com (cached 10 min)
- **AI:** Multi-key Gemini 2.5 Flash rotation (3 keys) + Workers AI fallback + graceful data-only fallback
- Deployed to `tradetrack-api.trakshanmishra477.workers.dev`

### Data Flow
```
Browser → Binance WebSocket (real-time crypto prices, no polling)
Browser → CoinGecko API (crypto metadata + sparklines)
Browser → Cloudflare Worker → Yahoo Finance (stocks/commodities in INR)
Browser → Cloudflare Worker → Gemini/Workers AI (AI analysis)
Browser → Firebase Auth (Google ID tokens + OTP sessions)
```

### AI Fallback Chain
```
Gemini Key 1 → Gemini Key 2 → Gemini Key 3 → Workers AI (free) → Data-only fallback
```
Errors are never shown to users — they see data or a graceful message.

---

## Local Development

### Frontend
```bash
cd frontend
yarn install
cp .env.production .env.local  # sets REACT_APP_BACKEND_URL to Worker
yarn start
```

### Worker
```bash
cd worker
npm install

# Set secrets
npx wrangler secret put GEMINI_API_KEYS        # comma-separated keys
npx wrangler secret put GEMINI_SCANNER_KEY      # dedicated key for scanner
npx wrangler secret put FIREBASE_PROJECT_ID     # e.g. capsaf-3ae54

# Create D1 tables
npx wrangler d1 execute tradetrack-db --remote --command "
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, name TEXT, photo_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS transactions (transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, description TEXT, date TEXT NOT NULL, receipt_url TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_chats (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, messages TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS otp_codes (user_id TEXT PRIMARY KEY, phone TEXT, email TEXT, name TEXT, code TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
"

npx wrangler dev
```

---

## Deployment

### Frontend (Cloudflare Pages)
```bash
cd frontend
yarn build
npx wrangler pages deploy build --project-name tradetrack-pro --branch=main --commit-dirty=true
```

### Worker (Cloudflare Workers)
```bash
cd worker
npx wrangler deploy
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, Radix UI, Recharts, TradingView, Binance WebSocket |
| Backend | Cloudflare Workers, Hono, D1 (SQLite), Workers AI |
| Auth | Firebase Auth (Google ID tokens + OTP sessions) |
| AI | Gemini 2.5 Flash (multi-key) + Workers AI fallback |
| Crypto Data | CoinGecko, Binance WS, Kraken |
| Stock Data | Yahoo Finance (48 stocks) |
| Commodity Data | Yahoo Finance (19 commodities) |
| FX Rates | open.er-api.com (live USD/INR) |

---

## Project Structure

```
frontend/
├── src/
│   ├── App.js                    # Routes with lazy loading
│   ├── pages/                    # 16 lazy-loaded pages
│   │   ├── Dashboard.js          # Stats + crypto cards
│   │   ├── Discover.js           # Scanner + SIP + Returns + Best Fit + Trending + IPOs
│   │   ├── Markets.js            # Crypto/Stocks/Commodities/Insights tabs
│   │   ├── TradingDashboard.js   # AI trading analysis with indicators
│   │   ├── CoinDetail.js         # Per-coin chart + technical + AI prediction
│   │   ├── AssetDetail.js        # Per-asset chart + AI (stocks/commodities)
│   │   └── ...
│   ├── components/
│   │   ├── MarketDynamics.jsx    # Cross-asset relationship engine
│   │   └── layout/               # AppLayout, Sidebar, MobileNav, Header
│   ├── hooks/
│   │   └── useCryptoWebSocket.js # Binance WS real-time prices
│   └── utils/
│       ├── cryptoData.js         # Browser-direct CoinGecko/Binance fetch
│       ├── api.js                # Worker API client
│       └── binance.js            # TradingView symbol mapping

worker/
├── src/
│   ├── index.ts                  # Hono app + CORS
│   ├── auth.ts                   # Firebase JWT + session token auth
│   ├── env.ts                    # Type definitions
│   ├── lib/
│   │   ├── market.ts             # Crypto/Stocks/Commodities (48 stocks, 19 commodities)
│   │   ├── gemini.ts             # Multi-key AI fallback chain
│   │   ├── binance.ts            # Kraken OHLC for predictions
│   │   ├── indicators.ts         # RSI, MACD, EMA, Bollinger, ATR, Fibonacci
│   │   ├── fx.ts                 # Live USD/INR
│   │   ├── polymarket.ts         # Prediction market sentiment
│   │   └── duckduckgo.ts         # Web search for AI context
│   └── routes/
│       ├── auth.ts               # Google sync + OTP signup/verify
│       ├── markets.ts            # Crypto/Stocks/Commodities + predictions
│       ├── transactions.ts       # CRUD + stats
│       └── ai.ts                 # Chat + market search
├── wrangler.toml
└── tsconfig.json
```

---

## Disclaimer

Not SEBI-registered. All AI analysis is for educational purposes only and is not financial advice. Always verify data with official sources before investing.
