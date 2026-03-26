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

def search_yfinance_global(query: str) -> list:
    results = []
    query = query.upper().strip()

    # Special commodity mapping
    commodity_map = {
        "GOLD": "GC=F",
        "SILVER": "SI=F",
        "CRUDE": "CL=F",
        "OIL": "CL=F",
        "BRENT": "BZ=F",
        "GAS": "NG=F",
        "COPPER": "HG=F"
    }

    if query in commodity_map:
        query = commodity_map[query]

    try:
        ticker = yf.Ticker(query)
        info = ticker.fast_info

        if info.last_price and info.last_price > 0:
            hist = ticker.history(period="5d")

            name = query
            try:
                ti = ticker.info
                name = ti.get("longName") or ti.get("shortName") or query
            except:
                pass

            prev = info.previous_close or info.last_price

            return [{
                "symbol": query,
                "name": name,
                "price": round(info.last_price, 4),
                "change": round(info.last_price - prev, 4),
                "change_percent": round(((info.last_price - prev) / prev) * 100, 2),
                "high": round(info.day_high or 0, 4),
                "low": round(info.day_low or 0, 4),
                "volume": int(info.last_volume or 0),
                "currency": getattr(info, 'currency', 'USD'),
                "history": [
                    {"date": d.strftime("%Y-%m-%d"), "close": float(row["Close"])}
                    for d, row in hist.iterrows()
                ] if not hist.empty else []
            }]
    except Exception:
        pass

    return []
# ─── Market Endpoints ─────────────────────────────────────────────────────────

@api_router.get("/markets/crypto")
async def get_crypto(limit: int = 20):
    cache_key = f"crypto_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    # Primary: CoinGecko — real market caps, icons, sparklines
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            params = {
                "vs_currency": "usd", "order": "market_cap_desc",
                "per_page": min(limit, 100), "page": 1,
                "sparkline": True, "price_change_percentage": "24h,7d"
            }
            resp = await c.get(
                "https://api.coingecko.com/api/v3/coins/markets", params=params,
                headers={"Accept": "application/json", "User-Agent": "TradeTrackPro/1.0"}
            )
            if resp.status_code == 200:
                data = resp.json()
                cache_set(cache_key, data, ttl_seconds=90)
                return data
            logger.warning(f"CoinGecko returned {resp.status_code}, falling back to Binance")
    except Exception as e:
        logger.error(f"CoinGecko error: {e}")
    # Fallback: Binance with INR conversion
    try:
        COIN_META = {
            "BTC":  {"name":"Bitcoin","id":"bitcoin","image":"https://assets.coingecko.com/coins/images/1/large/bitcoin.png"},
            "ETH":  {"name":"Ethereum","id":"ethereum","image":"https://assets.coingecko.com/coins/images/279/large/ethereum.png"},
            "BNB":  {"name":"BNB","id":"binancecoin","image":"https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png"},
            "XRP":  {"name":"XRP","id":"ripple","image":"https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png"},
            "SOL":  {"name":"Solana","id":"solana","image":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},
            "ADA":  {"name":"Cardano","id":"cardano","image":"https://assets.coingecko.com/coins/images/975/large/cardano.png"},
            "DOGE": {"name":"Dogecoin","id":"dogecoin","image":"https://assets.coingecko.com/coins/images/5/large/dogecoin.png"},
            "DOT":  {"name":"Polkadot","id":"polkadot","image":"https://assets.coingecko.com/coins/images/12171/large/polkadot.png"},
            "MATIC":{"name":"Polygon","id":"matic-network","image":"https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png"},
            "LTC":  {"name":"Litecoin","id":"litecoin","image":"https://assets.coingecko.com/coins/images/2/large/litecoin.png"},
            "SHIB": {"name":"Shiba Inu","id":"shiba-inu","image":"https://assets.coingecko.com/coins/images/11939/large/shiba.png"},
            "TRX":  {"name":"TRON","id":"tron","image":"https://assets.coingecko.com/coins/images/1094/large/tron-logo.png"},
            "AVAX": {"name":"Avalanche","id":"avalanche-2","image":"https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png"},
            "LINK": {"name":"Chainlink","id":"chainlink","image":"https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png"},
            "UNI":  {"name":"Uniswap","id":"uniswap","image":"https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png"},
        }
        async with httpx.AsyncClient(timeout=15.0) as c:
            res = await c.get("https://api.binance.com/api/v3/ticker/24hr")
            usd_inr = await get_live_usd_inr()
            data = res.json()
        coins = sorted(
            [d for d in data if d["symbol"].endswith("USDT")],
            key=lambda x: float(x.get("quoteVolume", 0)), reverse=True
        )[:limit]
        result = []
        for d in coins:
            sym = d["symbol"].replace("USDT", "")
            meta = COIN_META.get(sym, {"name": sym, "id": sym.lower(),
                "image": f"https://assets.coingecko.com/coins/images/1/large/bitcoin.png"})
            price_inr = round(float(d["lastPrice"]) * usd_inr, 2)
            result.append({
                "id": meta["id"], "symbol": sym.lower(), "name": meta["name"],
                "image": meta["image"], "current_price": price_inr,
                "market_cap": 0,
                "price_change_percentage_24h": float(d["priceChangePercent"]),
                "total_volume": float(d.get("volume", 0)),
                "sparkline_in_7d": {"price": []},
            })
        return result
    except Exception as e:
        logger.error(f"Binance fallback error: {e}")
        return get_mock_crypto_data()

        
@api_router.get("/markets/crypto/search")
async def search_crypto(query: str):
    try:
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
                return {"coins": price_resp.json()}
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

    av_key = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    usd_inr = 83.5
    results = []

    if av_key:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Live USD/INR rate
            try:
                fx = await client.get("https://www.alphavantage.co/query",
                    params={"function": "CURRENCY_EXCHANGE_RATE",
                            "from_currency": "USD", "to_currency": "INR", "apikey": av_key})
                if fx.status_code == 200:
                    rate = float(fx.json().get("Realtime Currency Exchange Rate", {})
                                 .get("5. Exchange Rate", 83.5) or 83.5)
                    if rate > 0:
                        usd_inr = rate
            except Exception as e:
                logger.warning(f"FX rate error: {e}")

            # Energy & metals via AV commodity functions
            for func, name, sym, unit in [
                ("WTI",         "Crude Oil (WTI)",  "OIL",    "per barrel"),
                ("BRENT",       "Crude Oil (Brent)", "BRENT",  "per barrel"),
                ("NATURAL_GAS", "Natural Gas",       "NG",     "per mmbtu"),
                ("COPPER",      "Copper",            "COPPER", "per metric ton"),
                ("ALUMINUM",    "Aluminium",         "ALUM",   "per metric ton"),
                ("WHEAT",       "Wheat",             "WHEAT",  "per bushel"),
            ]:
                try:
                    r = await client.get("https://www.alphavantage.co/query",
                        params={"function": func, "interval": "monthly", "apikey": av_key})
                    if r.status_code == 200:
                        data = r.json().get("data", [])
                        if len(data) >= 2:
                            latest = float(data[0].get("value", 0) or 0)
                            prev   = float(data[1].get("value", 0) or 0)
                            if latest > 0:
                                chg = latest - prev
                                pct = (chg / prev * 100) if prev else 0
                                results.append({"name": name, "symbol": sym,
                                    "price": round(latest * usd_inr, 2), "unit": unit,
                                    "change": round(chg * usd_inr, 2),
                                    "change_percent": round(pct, 2),
                                    "price_usd": round(latest, 2)})
                except Exception as e:
                    logger.warning(f"AV commodity error {func}: {e}")

            # Gold & Silver via ETF proxies (GLD, SLV)
            for ticker, name, sym, unit in [
                ("GLD", "Gold",   "GOLD",   "per oz"),
                ("SLV", "Silver", "SILVER", "per oz"),
            ]:
                try:
                    r = await client.get("https://www.alphavantage.co/query",
                        params={"function": "GLOBAL_QUOTE", "symbol": ticker, "apikey": av_key})
                    if r.status_code == 200:
                        q = r.json().get("Global Quote", {})
                        price = float(q.get("05. price", 0) or 0)
                        change = float(q.get("09. change", 0) or 0)
                        pct = float((q.get("10. change percent", "0%") or "0%").replace("%", ""))
                        if price > 0:
                            results.append({"name": name, "symbol": sym,
                                "price": round(price * usd_inr, 2), "unit": unit,
                                "change": round(change * usd_inr, 2),
                                "change_percent": round(pct, 2),
                                "price_usd": round(price, 2)})
                except Exception as e:
                    logger.warning(f"AV gold/silver error {ticker}: {e}")

    if not results:
        logger.warning("Alpha Vantage commodities unavailable — using fallback data")
        results = [
            {"name": "Gold",            "symbol": "GOLD",   "price": round(2320*usd_inr,2), "unit": "per oz",     "change": round(-8.5*usd_inr,2),   "change_percent": -0.37, "price_usd": 2320.0},
            {"name": "Silver",          "symbol": "SILVER", "price": round(27.2*usd_inr,2), "unit": "per oz",     "change": round(0.12*usd_inr,2),   "change_percent":  0.46, "price_usd":   27.2},
            {"name": "Crude Oil (WTI)", "symbol": "OIL",    "price": round(79.3*usd_inr,2), "unit": "per barrel", "change": round(1.50*usd_inr,2),   "change_percent":  1.76, "price_usd":   79.3},
            {"name": "Natural Gas",     "symbol": "NG",     "price": round(2.94*usd_inr,2), "unit": "per mmbtu",  "change": round(-0.06*usd_inr,2),  "change_percent": -2.15, "price_usd":    2.94},
            {"name": "Copper",          "symbol": "COPPER", "price": round(4.15*usd_inr,2), "unit": "per lb",     "change": round(0.03*usd_inr,2),   "change_percent":  0.73, "price_usd":    4.15},
        ]

    cache_set(cache_key, results, ttl_seconds=600)
    return results

# ===== AI PREDICT ENDPOINTS =====

@api_router.get("/markets/crypto/predict/{symbol}")
async def predict_crypto(symbol: str, authorization: Optional[str] = Header(None)):
    """AI-powered crypto price prediction with live CoinGecko data"""
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        live_data = {}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                search_resp = await client.get(
                    f"https://api.coingecko.com/api/v3/search?query={symbol}",
                    headers={"Accept": "application/json"}
                )
                coin_id = symbol.lower()
                if search_resp.status_code == 200:
                    coins = search_resp.json().get("coins", [])
                    if coins:
                        coin_id = coins[0]["id"]
                price_resp = await client.get(
                    "https://api.coingecko.com/api/v3/coins/markets",
                    params={"vs_currency": "inr", "ids": coin_id,
                            "price_change_percentage": "1h,24h,7d", "sparkline": False},
                    headers={"Accept": "application/json"}
                )
                if price_resp.status_code == 200:
                    data = price_resp.json()
                    if data:
                        d = data[0]
                        live_data = {
                            "name": d.get("name", symbol.upper()),
                            "price_inr": d.get("current_price", 0),
                            "price_usd": d.get("current_price", 0) / 83.5,
                            "change_1h": d.get("price_change_percentage_1h_in_currency", 0),
                            "change_24h": d.get("price_change_percentage_24h", 0),
                            "change_7d": d.get("price_change_percentage_7d_in_currency", 0),
                            "high_24h_inr": d.get("high_24h", 0),
                            "low_24h_inr": d.get("low_24h", 0),
                            "market_cap_inr": d.get("market_cap", 0),
                            "volume_24h_inr": d.get("total_volume", 0),
                            "ath_inr": d.get("ath", 0),
                            "ath_change_pct": d.get("ath_change_percentage", 0),
                            "market_cap_rank": d.get("market_cap_rank", "N/A"),
                        }
        except Exception as e:
            logger.warning(f"Live data fetch failed: {e}")

        today = datetime.now().strftime("%B %d, %Y")
        if live_data:
            prompt = f"""Today is {today}. Analyzing {live_data['name']} ({symbol.upper()}) with LIVE market data:

- Current Price: ₹{live_data['price_inr']:,.2f} (${live_data['price_usd']:,.2f} USD)
- 1H Change: {live_data['change_1h']:+.2f}%
- 24H Change: {live_data['change_24h']:+.2f}%
- 7D Change: {live_data['change_7d']:+.2f}%
- 24H High/Low: ₹{live_data['high_24h_inr']:,.2f} / ₹{live_data['low_24h_inr']:,.2f}
- Market Cap: ₹{live_data['market_cap_inr']/1e9:.2f}B | Volume: ₹{live_data['volume_24h_inr']/1e9:.2f}B
- ATH: ₹{live_data['ath_inr']:,.2f} ({live_data['ath_change_pct']:+.2f}% from ATH)
- Rank: #{live_data['market_cap_rank']}

Provide:
1. **Short-term Prediction (24-48 hours)** — reference current price ₹{live_data['price_inr']:,.2f}
2. **Key Factors** — what's driving price right now
3. **Risk Assessment** — current volatility and ATH distance
4. **Trading Recommendation** — specific price levels to watch"""
        else:
            prompt = f"""Today is {today}. Analyze {symbol.upper()} crypto (live data unavailable).
1. Short-term Prediction (24-48 hours)
2. Key Factors Affecting Price
3. Risk Assessment
4. Trading Recommendation (Buy/Hold/Sell)"""

        system_msg = f"You are a professional cryptocurrency analyst providing analysis on {today}. Use INR (₹) for all prices."
        response = await call_llm(system_msg, prompt, max_tokens=4096, timeout=30.0)
        return {"symbol": symbol.upper(), "prediction": response, "live_data": live_data}
    except Exception as e:
        logger.error(f"Crypto prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/markets/stocks/predict/{symbol}")
async def predict_stock(symbol: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        prompt = f"""Analyze {symbol.upper()} Indian stock (NSE/BSE) and provide:
1. Short-term outlook (1-2 weeks)
2. Key factors (sector trends, company news, macro environment)
3. Technical levels (support/resistance in INR)
4. Risk assessment
5. Recommendation (Buy/Hold/Sell) with target price range in INR

Focus on Indian market context, SEBI regulations, and retail investor perspective."""
        response = await call_llm(
            "You are an expert Indian stock market analyst with deep knowledge of NSE/BSE listed companies, Indian economy, and SEBI regulations.",
            prompt, max_tokens=4096, timeout=30.0
        )
        return {"symbol": symbol.upper(), "prediction": response}
    except Exception as e:
        logger.error(f"Stock prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/markets/commodities/predict/{symbol}")
async def predict_commodity(symbol: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
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
