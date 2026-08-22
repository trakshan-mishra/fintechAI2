# TradeTrack Pro

Institutional-style market intelligence and personal finance platform built for Indian investors. Real-time crypto, stocks, and commodity prices in INR, AI-powered analysis, SIP planning, portfolio tracking, and cross-asset market insights.

**Live:** [tradetrack-pro.pages.dev](https://tradetrack-pro.pages.dev)

---

## Features

### Markets
- **Crypto** — Real-time prices from CoinGecko + Binance (browser-direct, no rate-limit issues)
- **Stocks** — US megacaps + NSE majors via Yahoo Finance, all converted to INR
- **Commodities** — Gold, Silver, Crude Oil, Natural Gas, Copper, Platinum
- **Insights** — Cross-asset relationship engine: how USD/INR, crude oil, gold, Fed/RBI rates, inflation, and crypto-tech correlation affect each other, with signals and affected sectors

### AI Analysis
- **Trading Dashboard** — RSI, MACD, EMA, Bollinger Bands, Fibonacci, pivot points, signal scores
- **AI Predictions** — Per-asset analysis using live data + Gemini 2.5 Flash + Google Search
- **AI Chat** — Context-aware financial assistant with real-time web search
- **Receipt Scanner** — OCR-powered receipt parsing

### Discover (Groww-style)
- **SIP Calculator** — Interactive with growth chart
- **Return Rate Comparison** — FD, PPF, mutual funds, gold, crypto with 10-year projections
- **Best Fit** — Curated investment ideas by risk profile (conservative / balanced / aggressive)
- **Trending** — Top crypto and stock movers
- **Upcoming IPOs** — AI-searched latest IPO data

### Finance
- **Portfolio** — Holdings tracking with AI recommendations
- **Transactions** — Income/expense tracking with category breakdown
- **Invoices** — GST invoicing
- **Tax Summary** — Tax calculations
- **Scanner** — Receipt OCR with AI extraction

---

## Architecture

```
tradetrack/
├── frontend/          # React (CRA) + Tailwind + Radix UI
├── worker/            # Cloudflare Worker (Hono + D1)
└── backend/           # Legacy Python (reference only, not deployed)
```

### Frontend
- **React 19** + Create React App
- **Tailwind CSS** + shadcn/ui (Radix primitives)
- **Recharts** for charts, **TradingView** widgets for advanced charts
- **Firebase Auth** (Google + OTP)
- Deployed to **Cloudflare Pages**

### Backend (Cloudflare Worker)
- **Hono** framework on Cloudflare Workers
- **D1** (SQLite) for users, transactions, sessions, AI chats
- **Data sources:**
  - Crypto: CoinGecko → Kraken fallback (Binance blocks CF IPs with 403)
  - Stocks/Commodities: Yahoo Finance → INR conversion via live USD/INR
  - USD/INR: open.er-api.com
- **AI:** Gemini 2.5 Flash + Google Search grounding
- Deployed to `tradetrack-api.trakshanmishra477.workers.dev`

### Data Flow
```
Browser → CoinGecko/Binance (crypto, browser-direct)
Browser → Cloudflare Worker → Yahoo Finance (stocks/commodities)
Browser → Cloudflare Worker → Gemini (AI analysis)
Browser → Firebase Auth (Google/OTP)
```

---

## Local Development

### Frontend
```bash
cd frontend
yarn install
cp .env.production .env.local  # or set REACT_APP_BACKEND_URL
yarn start
```

### Worker
```bash
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler d1 execute tradetrack-db --remote --command "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, name TEXT, photo_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS transactions (transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, description TEXT, date TEXT NOT NULL, receipt_url TEXT, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_chats (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, messages TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS otp_codes (user_id TEXT PRIMARY KEY, phone TEXT, email TEXT, name TEXT, code TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);"
npx wrangler dev
```

---

## Deployment

### Frontend (Cloudflare Pages)
```bash
cd frontend
yarn build
npx wrangler pages deploy build --project-name tradetrack-pro --branch=main
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
| Frontend | React 19, Tailwind CSS, Radix UI, Recharts, TradingView |
| Backend | Cloudflare Workers, Hono, D1 (SQLite) |
| Auth | Firebase Auth (Google + OTP) |
| AI | Gemini 2.5 Flash + Google Search |
| Crypto Data | CoinGecko, Binance, Kraken |
| Stock Data | Yahoo Finance |
| FX Rates | open.er-api.com |

---

## Disclaimer

Not SEBI-registered. All AI analysis is for educational purposes only and is not financial advice. Always verify data with official sources before investing.
