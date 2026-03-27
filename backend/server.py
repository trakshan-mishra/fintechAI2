# Real-time market data + AI predictions with Gemini google_search grounding

from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os, logging, uuid, httpx, asyncio, base64, io, csv, json, re
from pathlib import Path
import pandas as pd
import numpy as np
import warnings
import yfinance as yf
warnings.filterwarnings('ignore')

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME")

if not mongo_url or not db_name:
    raise Exception("❌ Missing MONGO_URL or DB_NAME environment variables")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")   

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json"
}

# ─── In-Memory Cache ──────────────────────────────────────────────────────────
import time as _time
_cache: dict = {}

def cache_set(key: str, value, ttl_seconds: int = 60):
    _cache[key] = {"value": value, "expires": _time.time() + ttl_seconds}

def cache_get(key: str):
    entry = _cache.get(key)
    if entry and _time.time() < entry["expires"]:
        return entry["value"]
    _cache.pop(key, None)
    return None

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("firebase_uid", unique=True, sparse=True)
    await db.users.create_index("email", unique=True, sparse=True)
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.portfolios.create_index([("user_id", 1)])
    await db.ai_chats.create_index([("user_id", 1), ("session_id", 1)])
    logger.info("DB indexes created")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    receipt_url: Optional[str] = None

class Transaction(TransactionCreate):
    transaction_id: str
    user_id: str
    created_at: datetime

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class PortfolioHolding(BaseModel):
    symbol: str
    name: str
    asset_type: str
    quantity: float
    avg_buy_price: float
    current_price: Optional[float] = None
    exchange: Optional[str] = None

class PortfolioImport(BaseModel):
    holdings: List[PortfolioHolding]
    source: str

class AISearchRequest(BaseModel):
    query: str
    asset_type: Optional[str] = "general"

class GlobalSearchRequest(BaseModel):
    query: str
    asset_type: Optional[str] = "auto"

# ─── USD/INR Rate ─────────────────────────────────────────────────────────────

async def get_live_usd_inr() -> float:
    cached = cache_get("usd_inr")
    if cached:
        return cached
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get("https://api.exchangerate-api.com/v4/latest/USD")
            if r.status_code == 200:
                rate = r.json().get("rates", {}).get("INR", 83.5)
                cache_set("usd_inr", rate, ttl_seconds=600)
                return rate
    except Exception as e:
        logger.warning(f"USD/INR fetch failed: {e}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get("https://open.er-api.com/v6/latest/USD")
            if r.status_code == 200:
                rate = r.json().get("rates", {}).get("INR", 83.5)
                cache_set("usd_inr", rate, ttl_seconds=600)
                return rate
    except Exception:
        pass
    return 83.5

# ─── Web Search (DuckDuckGo - Free) ──────────────────────────────────────────

_NEEDS_SEARCH_PATTERNS = [
    r"\b(price|rate|value|cost)\b.*\b(of|for)\b",
    r"\b(current|today|now|latest|live|real.?time)\b",
    r"\b(how much|what is|tell me)\b.*\b(worth|cost|price)\b",
    r"\b(stock|share|crypto|bitcoin|eth|gold|silver|crude|commodity)\b",
    r"\b(market|nifty|sensex|nasdaq|dow|s&p)\b",
    r"\b(news|update|happening|trending|forecast|predict)\b",
    r"\b(buy|sell|hold|invest|trade)\b",
    r"\b(sentiment|analysis|outlook|target)\b",
    r"\b(polymarket|prediction.?market|betting.?odds)\b",
    r"\b(weather|temperature|election|gdp|inflation|rbi|fed)\b",
]

def _should_search(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in _NEEDS_SEARCH_PATTERNS)

async def web_search(query: str, max_results: int = 5) -> str:
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
            )
            if r.status_code == 200:
                data = r.json()
                snippets = []
                if data.get("Abstract"):
                    snippets.append(data["Abstract"])
                for topic in data.get("RelatedTopics", [])[:max_results]:
                    if isinstance(topic, dict) and topic.get("Text"):
                        snippets.append(topic["Text"])
                if snippets:
                    return "\n".join(snippets[:max_results])
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
    return ""

# ─── Gemini LLM with Google Search Grounding ─────────────────────────────────

async def call_gemini(messages: list, use_search: bool = True) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI service not configured. Please set GEMINI_API_KEY."

    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    body = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 4096,
            "temperature": 0.7,
        }
    }

    if use_search:
        body["tools"] = [{"google_search": {}}]

    try:
        async with httpx.AsyncClient(timeout=45.0) as c:
            resp = await c.post(url, headers={"Content-Type": "application/json"}, json=body)
            resp.raise_for_status()
            data = resp.json()
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            text_parts = [p.get("text", "") for p in parts if "text" in p]
            return "".join(text_parts).strip() or "No response generated."
    except httpx.HTTPStatusError as e:
        logger.error(f"Gemini API error: {e.response.status_code} - {e.response.text[:300]}")
        return f"AI temporarily unavailable (HTTP {e.response.status_code}). Please try again."
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        return "AI service temporarily unavailable. Please try again."

async def call_llm(system: str, prompt: str, max_tokens: int = 4096, timeout: float = 45.0, use_search: bool = False) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI service not configured."

    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    body = {
        "contents": [{"role": "user", "parts": [{"text": f"{system} {prompt}"}]}],
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.7}
    }
    if use_search:
        body["tools"] = [{"google_search": {}}]

    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            resp = await c.post(url, headers={"Content-Type": "application/json"}, json=body)
            resp.raise_for_status()
            data = resp.json()
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            return "".join(p.get("text", "") for p in parts if "text" in p).strip() or "No response."
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return "AI analysis temporarily unavailable."

# ─── Mock Crypto Data (Fallback) ─────────────────────────────────────────────

def get_mock_crypto_data():
    return [
        {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "current_price": 0, "market_cap": 0,
         "price_change_percentage_24h": 0, "total_volume": 0, "market_cap_rank": 1,
         "image": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
         "sparkline_in_7d": {"price": []}},
        {"id": "ethereum", "symbol": "eth", "name": "Ethereum", "current_price": 0, "market_cap": 0,
         "price_change_percentage_24h": 0, "total_volume": 0, "market_cap_rank": 2,
         "image": "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
         "sparkline_in_7d": {"price": []}},
    ]

# ─── Trading Indicators ───────────────────────────────────────────────────────

class TradingIndicators:
    @staticmethod
    def calculate_sma(prices, period):
        if len(prices) < period: return None
        return float(np.mean(prices[-period:]))

    @staticmethod
    def calculate_ema(prices, period):
        if len(prices) < period: return None
        return float(pd.Series(prices).ewm(span=period, adjust=False).mean().iloc[-1])

    @staticmethod
    def calculate_rsi(prices, period=14):
        if len(prices) < period + 1: return None
        s = pd.Series(prices)
        delta = s.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        avg_gain = gain.iloc[1:period+1].mean()
        avg_loss = loss.iloc[1:period+1].mean()
        for i in range(period + 1, len(prices)):
            avg_gain = (avg_gain * (period - 1) + gain.iloc[i]) / period
            avg_loss = (avg_loss * (period - 1) + loss.iloc[i]) / period
        if avg_loss == 0: return 100.0
        return float(100 - (100 / (1 + avg_gain / avg_loss)))

    @staticmethod
    def calculate_macd(prices, fast=12, slow=26, signal=9):
        if len(prices) < slow: return (None, None, None)
        s = pd.Series(prices)
        macd = s.ewm(span=fast, adjust=False).mean() - s.ewm(span=slow, adjust=False).mean()
        sig = macd.ewm(span=signal, adjust=False).mean()
        return (float(macd.iloc[-1]), float(sig.iloc[-1]), float((macd - sig).iloc[-1]))

    @staticmethod
    def calculate_bollinger_bands(prices, period=20, num_std=2.0):
        if len(prices) < period: return (None, None, None, None)
        sma = float(np.mean(prices[-period:]))
        std = float(np.std(prices[-period:]))
        upper, lower = sma + num_std * std, sma - num_std * std
        width = ((upper - lower) / sma * 100) if sma else 0
        return (upper, sma, lower, width)

    @staticmethod
    def calculate_atr(highs, lows, closes, period=14):
        if len(highs) < period + 1: return None
        trs = [max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1])) for i in range(1, len(highs))]
        return TradingIndicators.calculate_ema(trs, period)

    @staticmethod
    def calculate_fibonacci_retracement(high, low):
        d = high - low
        return {k: round(high - d * v, 6) for k, v in [("0.236", 0.236), ("0.382", 0.382), ("0.500", 0.500), ("0.618", 0.618), ("0.786", 0.786)]}

    @staticmethod
    def calculate_pivot_points(high, low, close):
        pp = (high + low + close) / 3
        return {"pivot": round(pp, 6), "resistance_1": round(2*pp-low, 6), "resistance_2": round(pp+(high-low), 6),
                "support_1": round(2*pp-high, 6), "support_2": round(pp-(high-low), 6)}

# ─── Binance Crypto Data ─────────────────────────────────────────────────────

async def get_binance_klines(symbol="BTCUSDT", interval="1h", limit=250):
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    async with httpx.AsyncClient(timeout=10.0) as c:
        res = await c.get(url)
        res.raise_for_status()
        data = res.json()
    return ([float(x[4]) for x in data], [float(x[2]) for x in data],
            [float(x[3]) for x in data], [float(x[5]) for x in data])

async def fetch_live_crypto_price(symbol: str) -> dict:
    try:
        binance_sym = symbol.upper().replace("/", "").replace("-", "")
        if not binance_sym.endswith("USDT"):
            binance_sym = binance_sym + "USDT"
        (closes, highs, lows, volumes), usd_inr = await asyncio.gather(
            get_binance_klines(binance_sym, "1h", 200),
            get_live_usd_inr()
        )
        ind = TradingIndicators()
        ema50 = ind.calculate_ema(closes, 50)
        ema200 = ind.calculate_ema(closes, 200)
        rsi = ind.calculate_rsi(closes, 14)
        macd_line, signal_line, macd_hist = ind.calculate_macd(closes)
        bb_upper, bb_middle, bb_lower, bb_width = ind.calculate_bollinger_bands(closes)
        atr = ind.calculate_atr(highs, lows, closes)
        current = closes[-1]
        high_24h, low_24h = max(highs[-24:]), min(lows[-24:])
        change_24h = ((closes[-1] - closes[-25]) / closes[-25] * 100) if len(closes) >= 25 else 0

        trend_score = (40 if current > ema50 else 0) + (40 if current > ema200 else 0) + (20 if ema50 and ema200 and ema50 > ema200 else 0) if ema50 and ema200 else 0
        momentum_score = (33 if rsi and rsi > 50 else 0) + (33 if macd_line and signal_line and macd_line > signal_line else 0) + (34 if bb_width and bb_width < 3 else 0)
        score = (trend_score + momentum_score) / 2
        signal = "STRONG_BUY" if score >= 75 else "BUY" if score >= 60 else "NEUTRAL" if score >= 40 else "SELL" if score >= 25 else "STRONG_SELL"

        return {
            "symbol": symbol.upper(), "price_usd": round(current, 6), "price_inr": round(current * usd_inr, 2),
            "high_24h_usd": round(high_24h, 6), "low_24h_usd": round(low_24h, 6),
            "change_24h_pct": round(change_24h, 2), "volume_24h_usd": round(sum(volumes[-24:]), 2),
            "usd_inr": round(usd_inr, 2),
            "ema50_usd": round(ema50, 6) if ema50 else None, "ema200_usd": round(ema200, 6) if ema200 else None,
            "rsi": round(rsi, 2) if rsi else None,
            "macd_line": round(macd_line, 6) if macd_line else None,
            "signal_line": round(signal_line, 6) if signal_line else None,
            "macd_histogram": round(macd_hist, 6) if macd_hist else None,
            "bb_upper": round(bb_upper, 6) if bb_upper else None, "bb_middle": round(bb_middle, 6) if bb_middle else None,
            "bb_lower": round(bb_lower, 6) if bb_lower else None, "bb_width_pct": round(bb_width, 2) if bb_width else None,
            "atr": round(atr, 6) if atr else None,
            "fib_retracement": ind.calculate_fibonacci_retracement(high_24h, low_24h),
            "pivot_points": ind.calculate_pivot_points(highs[-1], lows[-1], closes[-1]),
            "trend_score": round(trend_score, 2), "momentum_score": round(momentum_score, 2),
            "overall_score": round(score, 2), "signal": signal, "source": "binance",
        }
    except Exception as e:
        logger.error(f"Binance fetch failed for {symbol}: {e}")
        return {}

# ─── Polymarket Sentiment ─────────────────────────────────────────────────────

async def get_polymarket_sentiment(query: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(
                "https://gamma-api.polymarket.com/markets",
                params={"_limit": 5, "active": "true", "closed": "false", "query": query}
            )
            if r.status_code == 200:
                markets = r.json()
                if markets:
                    results = []
                    for m in markets[:5]:
                        outcome_prices = m.get("outcomePrices", "[]")
                        if isinstance(outcome_prices, str):
                            try:
                                outcome_prices = json.loads(outcome_prices)
                            except Exception:
                                outcome_prices = []
                        outcomes = m.get("outcomes", "[]")
                        if isinstance(outcomes, str):
                            try:
                                outcomes = json.loads(outcomes)
                            except Exception:
                                outcomes = []
                        results.append({
                            "question": m.get("question", ""),
                            "description": m.get("description", "")[:200],
                            "outcomes": outcomes,
                            "outcome_prices": outcome_prices,
                            "volume": m.get("volume", 0),
                            "liquidity": m.get("liquidity", 0),
                            "end_date": m.get("endDate", ""),
                        })
                    return {"markets": results, "source": "polymarket"}
    except Exception as e:
        logger.warning(f"Polymarket fetch failed: {e}")
    return {"markets": [], "source": "polymarket"}

# ─── Market Data Helpers (yfinance - Global) ─────────────────────────────────

def fetch_market_data(symbols: list, default_names: dict = None):
    if not symbols:
        return []
    results = []
    for sym in symbols:
        try:
            ticker = yf.Ticker(sym)
            info = ticker.fast_info
            name = (default_names or {}).get(sym, sym)
            clean_symbol = sym.replace(".NS", "").replace(".BO", "")
            results.append({
                "symbol": clean_symbol,
                "name": name,
                "price": round(info.last_price, 2),
                "change": round(info.last_price - info.previous_close, 2),
                "change_percent": round(((info.last_price - info.previous_close) / info.previous_close) * 100, 2),
                "high": round(info.day_high, 2),
                "low": round(info.day_low, 2),
                "volume": int(info.last_volume),
                "currency": getattr(info, 'currency', 'USD'),
            })
        except Exception as e:
            logger.warning(f"Could not fetch data for {sym}: {e}")
    return results


# ─── Market Endpoints ─────────────────────────────────────────────────────────

def _convert_crypto_to_inr(data: list, usd_inr: float) -> list:
    """Convert CoinGecko USD fields to INR, preserve price_usd for reference."""
    price_fields = ["current_price", "high_24h", "low_24h", "ath", "atl", "price_change_24h"]
    volume_fields = ["market_cap", "total_volume", "fully_diluted_valuation"]
    for coin in data:
        coin["price_usd"] = coin.get("current_price")
        coin["market_cap_usd"] = coin.get("market_cap")
        for f in price_fields:
            if coin.get(f) is not None:
                raw = coin[f]
                coin[f] = round(raw * usd_inr, 4 if abs(raw) < 1 else 2)
        for f in volume_fields:
            if coin.get(f) is not None:
                coin[f] = round(coin[f] * usd_inr, 0)
        if coin.get("sparkline_in_7d", {}).get("price"):
            coin["sparkline_in_7d"]["price"] = [
                round(p * usd_inr, 2) for p in coin["sparkline_in_7d"]["price"]
            ]
    return data

@api_router.get("/markets/crypto")
async def get_crypto_prices(limit: int = 20):
    cache_key = f"crypto_inr_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    try:
        usd_inr = await get_live_usd_inr()
        async with httpx.AsyncClient(timeout=30.0) as c:
            params = {"vs_currency": "usd", "order": "market_cap_desc", "per_page": min(limit, 100),
                      "page": 1, "sparkline": True, "price_change_percentage": "24h,7d"}
            resp = await c.get("https://api.coingecko.com/api/v3/coins/markets", params=params,
                headers={"Accept": "application/json", "User-Agent": "GlobalMarketPulse/1.0"})
            if resp.status_code == 200:
                data = _convert_crypto_to_inr(resp.json(), usd_inr)
                cache_set(cache_key, data, ttl_seconds=90)
                return data
    except Exception as e:
        logger.error(f"Crypto API error: {e}")
    return cached or get_mock_crypto_data()

@api_router.get("/markets/crypto/search")
async def search_crypto(query: str):
    try:
        usd_inr = await get_live_usd_inr()
        async with httpx.AsyncClient(timeout=30.0) as c:
            search_resp = await c.get("https://api.coingecko.com/api/v3/search",
                params={"query": query}, headers={"Accept": "application/json"})
            if search_resp.status_code != 200:
                return {"coins": []}
            coins = search_resp.json().get("coins", [])[:5]
            if not coins:
                return {"coins": []}
            ids = ",".join([coin["id"] for coin in coins])
            price_resp = await c.get("https://api.coingecko.com/api/v3/coins/markets",
                params={"vs_currency": "usd", "ids": ids, "order": "market_cap_desc",
                        "sparkline": True, "price_change_percentage": "24h,7d"},
                headers={"Accept": "application/json"})
            if price_resp.status_code == 200:
                return {"coins": _convert_crypto_to_inr(price_resp.json(), usd_inr)}
            return {"coins": coins}
    except Exception as e:
        logger.error(f"Crypto search error: {e}")
        return {"coins": []}

@api_router.get("/markets/stocks")
async def get_stocks():
    cache_key = "stocks_default"
    cached = cache_get(cache_key)
    if cached:
        return cached
    default_stocks = {
        "AAPL": "Apple Inc.", "GOOGL": "Alphabet Inc.", "MSFT": "Microsoft Corp.",
        "AMZN": "Amazon.com Inc.", "TSLA": "Tesla Inc.", "NVDA": "NVIDIA Corp.",
        "META": "Meta Platforms", "NFLX": "Netflix Inc.",
    }
    results = await asyncio.to_thread(fetch_market_data, list(default_stocks.keys()), default_stocks)
    if results:
        cache_set(cache_key, results, ttl_seconds=30)
    return results or []

@api_router.get("/markets/commodities")
async def get_commodities():
    cache_key = "commodities_default"
    cached = cache_get(cache_key)
    if cached:
        return cached
    default_commodities = {
        "GC=F": "Gold", "SI=F": "Silver", "CL=F": "Crude Oil (WTI)",
        "BZ=F": "Crude Oil (Brent)", "NG=F": "Natural Gas", "HG=F": "Copper",
    }
    results = await asyncio.to_thread(fetch_market_data, list(default_commodities.keys()), default_commodities)
    if results:
        cache_set(cache_key, results, ttl_seconds=60)
    return results or []

# ─── Global Search — Search any asset worldwide ──────────────────────────────

@api_router.get("/markets/search")
async def global_search(query: str, asset_type: str = "auto"):
    if not query or len(query.strip()) < 1:
        raise HTTPException(status_code=400, detail="Query required")

    query = query.strip()
    results = {"query": query, "stocks": [], "crypto": [], "commodities": [], "polymarket": []}

    async def search_stocks():
        try:
            stock_results = await asyncio.to_thread(search_yfinance_global, query)
            results["stocks"] = stock_results
        except Exception as e:
            logger.warning(f"Stock search error: {e}")

    async def search_crypto_fn():
        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.get("https://api.coingecko.com/api/v3/search",
                    params={"query": query}, headers={"Accept": "application/json"})
                if r.status_code == 200:
                    coins = r.json().get("coins", [])[:5]
                    if coins:
                        ids = ",".join([coin["id"] for coin in coins])
                        pr = await c.get("https://api.coingecko.com/api/v3/coins/markets",
                            params={"vs_currency": "usd", "ids": ids, "sparkline": True,
                                    "price_change_percentage": "24h,7d"},
                            headers={"Accept": "application/json"})
                        if pr.status_code == 200:
                            results["crypto"] = pr.json()
                            return
                    results["crypto"] = coins
        except Exception as e:
            logger.warning(f"Crypto search error: {e}")

    async def search_sentiment():
        try:
            poly = await get_polymarket_sentiment(query)
            results["polymarket"] = poly.get("markets", [])
        except Exception:
            pass

    if asset_type == "auto":
        await asyncio.gather(search_stocks(), search_crypto_fn(), search_sentiment())
    elif asset_type == "stock":
        await search_stocks()
    elif asset_type == "crypto":
        await search_crypto_fn()
    elif asset_type == "commodity":
        await search_stocks()
    else:
        await asyncio.gather(search_stocks(), search_crypto_fn(), search_sentiment())

    return results

@api_router.get("/markets/stocks/search")
async def search_stock(query: str):
    results = await asyncio.to_thread(search_yfinance_global, query)
    if not results:
        raise HTTPException(status_code=404, detail="Stock not found. Try ticker symbol (e.g., AAPL, RELIANCE, TSLA)")
    return results[0]

# ─── Polymarket Endpoint ─────────────────────────────────────────────────────

@api_router.get("/markets/sentiment")
async def get_sentiment(query: str):
    poly = await get_polymarket_sentiment(query)
    return poly

# ─── Crypto Prediction ────────────────────────────────────────────────────────

@api_router.get("/markets/crypto/predict/{symbol}")
async def predict_crypto(symbol: str):
    symbol = symbol.upper().replace("/USDT", "").replace("USDT", "")
    try:
        today = datetime.now().strftime("%B %d, %Y %H:%M UTC")
        live, poly_data = await asyncio.gather(
            fetch_live_crypto_price(symbol),
            get_polymarket_sentiment(f"{symbol} crypto")
        )
        if not live:
            raise HTTPException(status_code=502, detail=f"Could not fetch live data for {symbol}")

        def fmt(v, d=2): return f"{v:.{d}f}" if v is not None else "N/A"
        fib = live.get("fib_retracement", {})
        pivots = live.get("pivot_points", {})

        poly_context = ""
        if poly_data.get("markets"):
            poly_context = ""
            poly_context = "\nPREDICTION MARKET SENTIMENT (Polymarket):\n"
            for m in poly_data["markets"][:3]:
                poly_context += f"  Q: {m['question']}\n"
                for i, outcome in enumerate(m.get("outcomes", [])):
                    price = (
                m.get("outcome_prices", [])[i]
                if i < len(m.get("outcome_prices", []))
                else "?"
            )
            poly_context += f"    {outcome}: {price}\n"


        prompt = f"""LIVE DATA — {symbol} — {today}

PRICE:
  Current: ${live['price_usd']:,.2f}
  24H Change: {live['change_24h_pct']:+.2f}%
  24H High: ${live['high_24h_usd']:,.2f}  |  Low: ${live['low_24h_usd']:,.2f}
  Volume 24H: ${live['volume_24h_usd']:,.0f}

INDICATORS:
  RSI(14): {fmt(live.get('rsi'))}
  EMA50: ${fmt(live.get('ema50_usd'))}  |  EMA200: ${fmt(live.get('ema200_usd'))}
  MACD: {fmt(live.get('macd_line'), 6)}
  BB Width: {fmt(live.get('bb_width_pct'))}%
  ATR: ${fmt(live.get('atr'), 4)}

KEY LEVELS:
  Fib 0.382: ${fib.get('0.382', 0):,.2f}   Fib 0.618: ${fib.get('0.618', 0):,.2f}
  Pivot R1: ${pivots.get('resistance_1', 0):,.2f}   Pivot S1: ${pivots.get('support_1', 0):,.2f}

SIGNAL: {live['signal']}  |  Score: {live['overall_score']:.0f}/100
{poly_context}
Based on this LIVE data + sentiment:
1. **Current Price Analysis**
2. **Key Support & Resistance** (from Fib/Pivot)
3. **24-48 Hour Outlook** — bull & bear scenarios with targets
4. **Trade Setup** — Entry, Target, Stop-loss
5. **Risk/Reward ratio**
6. **Sentiment Analysis** (from prediction markets if available)
7. **Final Recommendation** — Buy/Hold/Sell"""

        system = "You are a professional cryptocurrency analyst. Use ONLY the live market data provided. Also use Google Search to validate with latest news."
        analysis = await call_llm(system, prompt, max_tokens=4096, timeout=45.0, use_search=True)

        return {"symbol": symbol, "timestamp": datetime.now(timezone.utc).isoformat(),
                "live_data": live, "prediction": analysis, "polymarket": poly_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── AI Chat — Gemini + google_search grounding ──────────────────────────────

_MARKET_KW = {
    "buy", "sell", "hold", "price", "target", "nse", "bse", "reliance", "tcs",
    "infy", "sbin", "hdfc", "icici", "wipro", "bajaj", "infosys", "today",
    "news", "should i", "worth", "rally", "crash", "breakout", "support",
    "resistance", "technical", "earnings", "results", "dividend", "ipo",
    "nifty", "sensex", "stock", "crypto", "bitcoin", "btc", "eth", "gold",
    "silver", "crude", "oil", "trade", "rate", "rbi", "sebi", "inflation",
    "current", "now", "latest", "live", "market", "nasdaq", "dow", "s&p",
    "commodity", "forex", "predict", "forecast", "sentiment", "polymarket",
    "apple", "google", "microsoft", "tesla", "nvidia", "amazon", "meta",
}

@api_router.post("/ai/chat")
async def ai_chat(data: ChatMessage):
    try:
        session_id = data.session_id or f"sess_{uuid.uuid4().hex[:8]}"
        query = data.message.strip()

        # Load chat history from DB
        history_doc = await db.ai_chats.find_one(
            {"session_id": session_id}, {"_id": 0}
        )
        messages = []
        if history_doc:
            messages = history_doc.get("messages", [])[-5:]

        # Web search context
        search_context = ""
        if _should_search(query):
            results = await web_search(query)
            if results:
                search_context = f"""   
REAL-TIME WEB DATA:
{results}

Use this data as primary source.
"""

        system_prompt = """You are a powerful AI assistant with real-time Google Search access.

RULES:
- For market/financial queries, use Google Search grounding to get live data
- Provide specific numbers, prices, and data points
- If you have live data from search, cite it
- Be direct and actionable
- Format responses with markdown for readability"""

        messages.insert(0, {"role": "user", "content": system_prompt})
        messages.append({"role": "user", "content": f"{search_context} User: {query}"})

        response = await call_gemini(messages, use_search=True)

        messages.append({"role": "assistant", "content": response})

        await db.ai_chats.update_one(
            {"session_id": session_id},
            {"$set": {"messages": messages[-20:], "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )

        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        return {"response": "Something went wrong. Please try again.", "session_id": None}

# ─── AI Market Research ───────────────────────────────────────────────────────

@api_router.post("/markets/search/ai")
async def ai_market_search(data: AISearchRequest):
    try:
        poly_data = await get_polymarket_sentiment(data.query)
        poly_context = ""
        if poly_data.get("markets"):
            poly_context = """
Prediction Market Data (Polymarket):
"""
            for m in poly_data["markets"][:3]:
                poly_context += f"""- {m['question']}
"""

        prompt = f"""Research: {data.query}
Asset type: {data.asset_type}
{poly_context}
Provide:
1. **Current Status** (live price/data)
2. **Technical Outlook** (support/resistance)
3. **Fundamental Analysis**
4. **Market Sentiment** (from news + prediction markets)
5. **Bull Case**
6. **Bear Case**
7. **Recommendation** (Buy/Sell/Hold with price targets)
8. **Risk Factors**"""

        result = await call_llm(
            "You are a professional financial research analyst. Use Google Search to pull live prices and recent news.",
            prompt, max_tokens=4096, timeout=45.0, use_search=True,
        )
        return {"success": True, "result": result, "query": data.query, "polymarket": poly_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Transaction Endpoints (No Auth Required for Demo) ────────────────────────

@api_router.get("/transactions")
async def get_transactions(type: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    txns = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return txns

@api_router.post("/transactions")
async def create_transaction(data: TransactionCreate):
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    txn = {"transaction_id": transaction_id, "user_id": "demo_user",
           **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.transactions.insert_one(txn)
    txn.pop("_id", None)
    return txn

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"transaction_id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

@api_router.get("/transactions/stats")
async def get_transaction_stats():
    pipeline = [
        {"$group": {
            "_id": None,
            "total_income": {"$sum": {"$cond": [{"$eq": ["$type", "income"]}, "$amount", 0]}},
            "total_expense": {"$sum": {"$cond": [{"$eq": ["$type", "expense"]}, "$amount", 0]}},
            "transaction_count": {"$sum": 1}
        }}
    ]
    stats = await db.transactions.aggregate(pipeline).to_list(1)
    totals = stats[0] if stats else {"total_income": 0, "total_expense": 0, "transaction_count": 0}
    return {
        "total_income": totals.get("total_income", 0),
        "total_expense": totals.get("total_expense", 0),
        "balance": totals.get("total_income", 0) - totals.get("total_expense", 0),
        "transaction_count": totals.get("transaction_count", 0)
    }

# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@api_router.post("/auth/firebase-sync")
async def firebase_sync(data: dict):
    try:
        return {
            "status": "success",
            "message": "Firebase sync working",
            "user": data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


class GoogleAuthRequest(BaseModel):
    id_token: str

async def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token using Google's public key endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(
                f"https://identitytoolkit.googleapis.com/v1/accounts:lookup",
                params={"key": os.getenv("FIREBASE_WEB_API_KEY", "")},
                # Use tokenId to verify
            )
        # Simpler: verify via Google's tokeninfo endpoint
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(
                "https://identitytoolkit.googleapis.com/v1/accounts:lookup",
                params={"key": os.getenv("FIREBASE_WEB_API_KEY", "")},
                json={"idToken": id_token},
            )
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Firebase token")
            users = r.json().get("users", [])
            if not users:
                raise HTTPException(status_code=401, detail="User not found")
            return users[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")

@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthRequest):
    """Exchange Firebase ID token for a session token."""
    try:
        firebase_user = await verify_firebase_token(data.id_token)

        firebase_uid = firebase_user.get("localId")
        email = firebase_user.get("email", "")
        name = firebase_user.get("displayName", email.split("@")[0] if email else "User")
        photo_url = firebase_user.get("photoUrl", "")

        # Upsert user in DB
        session_token = f"sess_{uuid.uuid4().hex}"
        user_doc = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": name,
            "photo_url": photo_url,
            "session_token": session_token,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.update_one(
            {"firebase_uid": firebase_uid},
            {"$set": user_doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )

        return {
            "session_token": session_token,
            "user": {
                "id": firebase_uid,
                "name": name,
                "email": email,
                "photo_url": photo_url,
                "auth_method": "google",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Return current user from session token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = await db.users.find_one({"session_token": token}, {"_id": 0, "session_token": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidate session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.users.update_one({"session_token": token}, {"$unset": {"session_token": ""}})
    return {"message": "Logged out"}

# ─── Health & Root ────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Global Market Pulse API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─── App Config ───────────────────────────────────────────────────────────────

app.include_router(api_router)

_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)