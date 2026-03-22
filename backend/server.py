from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import httpx
from pathlib import Path
import json
import csv
import io
import re

# ===== IN-MEMORY CACHE =====
_cache = {}

def cache_set(key: str, value, ttl_seconds: int = 60):
    import time
    _cache[key] = {"value": value, "expires": time.time() + ttl_seconds}

def cache_get(key: str):
    import time
    entry = _cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    return None


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===== GROQ LLM HELPER =====

async def call_llm(system: str, prompt: str, max_tokens: int = 4096, timeout: float = 30.0) -> str:
    """Unified LLM call via Groq (qwen/qwen3-32b). Change model here to update everywhere."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "content-type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": "qwen/qwen3-32b",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": prompt},
                ],
                "max_tokens": max_tokens,
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        # Strip <think>...</think> blocks that Qwen3 sometimes emits
        return re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()


# ===== MODELS =====

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionCreate(BaseModel):
    session_id: str

class SessionResponse(BaseModel):
    user: User
    session_token: str

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    type: str  # income or expense
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    receipt_url: Optional[str] = None
    created_at: datetime

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    receipt_url: Optional[str] = None

class Invoice(BaseModel):
    invoice_id: str
    user_id: str
    invoice_number: str
    gst_number: Optional[str] = None
    client_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    gst_amount: float
    total: float
    date: str
    created_at: datetime

class InvoiceCreate(BaseModel):
    invoice_number: str
    gst_number: Optional[str] = None
    client_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    gst_amount: float
    total: float
    date: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class TelegramConnect(BaseModel):
    chat_id: int

# Import enhanced auth module
from auth_enhanced import (
    PhoneSignupRequest, EmailSignupRequest, OTPVerifyRequest,
    generate_otp, hash_otp, send_sms_demo, send_email_demo,
    send_sms_firebase, send_sms_msg91,
    AI_QNA_CATEGORIES, get_ai_answer,
    PaytmInitRequest, initiate_paytm_payment, fetch_paytm_transactions
)

# ===== CLERK JWT VERIFICATION =====

async def verify_clerk_token(authorization: Optional[str] = None) -> Optional[dict]:
    """Verify Clerk JWT using PEM public key (networkless)"""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    try:
        import jwt as pyjwt

        pem_key = os.getenv("CLERK_PEM_PUBLIC_KEY", "")
        if not pem_key:
            logger.error("CLERK_PEM_PUBLIC_KEY not set in .env")
            return None

        pem_key = pem_key.replace("\\n", "\n")

        claims = pyjwt.decode(
            token,
            pem_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims

    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

async def get_user_from_token(authorization: Optional[str] = None) -> Optional[str]:
    """Extract user_id from Clerk JWT"""
    claims = await verify_clerk_token(authorization)
    if not claims:
        return None
    clerk_user_id = claims.get("sub")
    if not clerk_user_id:
        return None
    user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})
    if not user_doc:
        return None
    return user_doc["user_id"]

# ===== AUTH ENDPOINTS =====

@api_router.post("/auth/clerk-sync")
async def clerk_sync(data: dict, authorization: Optional[str] = Header(None)):
    """Sync Clerk user with our DB — called on first login"""
    claims = await verify_clerk_token(authorization)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid token")

    clerk_user_id = claims.get("sub")
    user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})

    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "clerk_user_id": clerk_user_id,
            "email": data.get("email", ""),
            "name": data.get("name", "User"),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one({**user_doc, "_id": user_id})

    return {"user": user_doc}

@api_router.get("/auth/me", response_model=User)
async def get_current_user(authorization: Optional[str] = Header(None)):
    claims = await verify_clerk_token(authorization)
    if not claims:
        raise HTTPException(status_code=401, detail="Not authenticated")

    clerk_user_id = claims.get("sub")
    user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return User(**{**user_doc, "created_at": datetime.fromisoformat(user_doc["created_at"])})

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}

# ===== ENHANCED AUTH ENDPOINTS (Phone/Email OTP) =====

@api_router.post("/auth/signup/phone")
async def signup_with_phone(data: PhoneSignupRequest):
    try:
        existing = await db.users.find_one({"phone": data.phone}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        await db.otp_store.insert_one({
            "phone": data.phone, "otp_hash": otp_hash,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "created_at": datetime.now(timezone.utc)
        })
        sent = await send_sms_msg91(data.phone, otp)
        if not sent:
            sent = await send_sms_demo(data.phone, otp)
        return {
            "success": True, "message": "OTP sent to your phone", "phone": data.phone,
            "demo_otp": otp if os.getenv("MSG91_AUTH_KEY") == "demo-key" else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Phone signup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/signup/email")
async def signup_with_email(data: EmailSignupRequest):
    try:
        existing = await db.users.find_one({"email": data.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        await db.otp_store.insert_one({
            "email": data.email, "otp_hash": otp_hash,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "created_at": datetime.now(timezone.utc)
        })
        await send_email_demo(data.email, otp)
        return {"success": True, "message": "OTP sent to your email", "email": data.email, "demo_otp": otp}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email signup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/verify/otp")
async def verify_otp(data: OTPVerifyRequest):
    try:
        is_phone = data.phone_or_email.startswith("+")
        query_field = "phone" if is_phone else "email"
        otp_record = await db.otp_store.find_one({
            query_field: data.phone_or_email,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        if not otp_record:
            raise HTTPException(status_code=400, detail="OTP expired or invalid")
        if hash_otp(data.otp) != otp_record["otp_hash"]:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_data = {
            "user_id": user_id, query_field: data.phone_or_email,
            "name": "User", "created_at": datetime.now(timezone.utc).isoformat(),
            "auth_method": "phone_otp" if is_phone else "email_otp"
        }
        if is_phone:
            user_data["email"] = f"{user_id}@temp.com"
        await db.users.insert_one({**user_data})
        session_token = f"session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.user_sessions.insert_one({
            "user_id": user_id, "session_token": session_token,
            "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.otp_store.delete_one({"_id": otp_record["_id"]})
        return {"success": True, "session_token": session_token, "user": user_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verify error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== AI Q&A ENDPOINTS =====

@api_router.get("/ai/qna/categories")
async def get_qna_categories():
    return {"categories": AI_QNA_CATEGORIES}

@api_router.post("/ai/qna/ask")
async def ask_ai_question(category: str, question: str, authorization: Optional[str] = Header(None)):
    try:
        user_context = {}
        user_id = await get_user_from_token(authorization)
        if user_id:
            try:
                stats = await db.transactions.aggregate([
                    {"$match": {"user_id": user_id}},
                    {"$group": {"_id": None,
                        "total_income": {"$sum": {"$cond": [{"$eq": ["$type", "income"]}, "$amount", 0]}},
                        "total_expense": {"$sum": {"$cond": [{"$eq": ["$type", "expense"]}, "$amount", 0]}}
                    }}
                ]).to_list(1)
                if stats:
                    user_context = {
                        "total_income": stats[0].get("total_income", 0),
                        "total_expense": stats[0].get("total_expense", 0),
                        "balance": stats[0].get("total_income", 0) - stats[0].get("total_expense", 0)
                    }
            except:
                pass
        answer = await get_ai_answer(category, question, user_context)
        if user_id:
            await db.qna_history.insert_one({
                "user_id": user_id, "category": category, "question": question,
                "answer": answer, "created_at": datetime.now(timezone.utc).isoformat()
            })
        return {"success": True, "category": category, "question": question, "answer": answer}
    except Exception as e:
        logger.error(f"AI Q&A error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== PAYTM INTEGRATION ENDPOINTS =====

@api_router.post("/paytm/init-payment")
async def init_paytm_payment(data: PaytmInitRequest, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await initiate_paytm_payment(data.order_id, data.amount, user_id)

@api_router.get("/paytm/sync-transactions")
async def sync_paytm_transactions(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        phone = user.get("phone", "")
        paytm_txns = await fetch_paytm_transactions(phone, days=30)
        imported = 0
        for txn in paytm_txns:
            existing = await db.transactions.find_one({"user_id": user_id, "paytm_txn_id": txn["txn_id"]})
            if not existing:
                await db.transactions.insert_one({
                    "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "user_id": user_id,
                    "type": "expense" if txn["type"] == "DEBIT" else "income",
                    "amount": txn["amount"], "category": "Paytm",
                    "description": txn["description"], "date": txn["date"],
                    "paytm_txn_id": txn["txn_id"], "source": "paytm_sync",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                imported += 1
        return {"success": True, "imported": imported, "total_found": len(paytm_txns),
                "message": f"Successfully imported {imported} transactions"}
    except Exception as e:
        logger.error(f"Paytm sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== TRANSACTION ENDPOINTS =====

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(type: Optional[str] = None, category: Optional[str] = None,
                           authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for t in transactions:
        t["created_at"] = datetime.fromisoformat(t["created_at"]) if isinstance(t["created_at"], str) else t["created_at"]
        result.append(Transaction(**t))
    return result

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(data: TransactionCreate, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    transaction = {
        "transaction_id": transaction_id, "user_id": user_id,
        **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    transaction["created_at"] = datetime.fromisoformat(transaction["created_at"])
    return Transaction(**transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = await db.transactions.delete_one({"transaction_id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

@api_router.get("/transactions/stats")
async def get_transaction_stats(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    category_stats = {}
    for t in transactions:
        cat = t["category"]
        if cat not in category_stats:
            category_stats[cat] = {"income": 0, "expense": 0}
        category_stats[cat][t["type"]] += t["amount"]
    return {
        "total_income": total_income, "total_expense": total_expense,
        "balance": total_income - total_expense,
        "category_breakdown": category_stats, "transaction_count": len(transactions)
    }

# ===== INVOICE ENDPOINTS =====

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for inv in invoices:
        inv["created_at"] = datetime.fromisoformat(inv["created_at"]) if isinstance(inv["created_at"], str) else inv["created_at"]
        result.append(Invoice(**inv))
    return result

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(data: InvoiceCreate, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice = {
        "invoice_id": invoice_id, "user_id": user_id,
        **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice)
    invoice["created_at"] = datetime.fromisoformat(invoice["created_at"])
    return Invoice(**invoice)

# ===== TAX ENDPOINTS =====

@api_router.get("/tax/summary")
async def get_tax_summary(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_gst_collected = sum(inv["gst_amount"] for inv in invoices)
    taxable_income = max(0, total_income - total_expense - 1000000)
    estimated_tax = taxable_income * 0.3
    return {
        "total_income": total_income, "total_expense": total_expense,
        "taxable_income": taxable_income, "estimated_tax": estimated_tax,
        "gst_collected": total_gst_collected, "deductions": total_expense
    }

# ===== AI CHAT ENDPOINTS =====

@api_router.post("/ai/chat")
async def ai_chat(data: ChatMessage, authorization: Optional[str] = Header(None)):
    """Chat with AI — uses real user data when logged in, demo data otherwise"""
    try:
        session_id = data.session_id or f"chat_{uuid.uuid4().hex[:12]}"
        user_id = await get_user_from_token(authorization)

        # Use real stats if authenticated, demo stats otherwise
        if user_id:
            stats = await get_transaction_stats(authorization)
        else:
            stats = {"total_income": 500000, "total_expense": 300000,
                     "balance": 200000, "transaction_count": 0}

        system_message = f"""You are a financial advisor AI assistant. The user has:
- Total Income: ₹{stats['total_income']:.2f}
- Total Expenses: ₹{stats['total_expense']:.2f}
- Current Balance: ₹{stats['balance']:.2f}
- Total Transactions: {stats['transaction_count']}

Provide helpful, actionable financial advice in a conversational tone. Focus on Indian financial context (SIP, tax, mutual funds, savings)."""

        response = await call_llm(system_message, data.message)

        await db.ai_chats.insert_one({
            "user_id": user_id or "anonymous",
            "session_id": session_id,
            "message": data.message,
            "response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"response": response, "session_id": session_id}

    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/insights")
async def get_ai_insights(authorization: Optional[str] = Header(None)):
    """Get AI-generated financial insights"""
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        stats = await get_transaction_stats(authorization)
        prompt = f"""Based on this financial data:
- Income: ₹{stats['total_income']:.2f}
- Expenses: ₹{stats['total_expense']:.2f}
- Balance: ₹{stats['balance']:.2f}
- Categories: {json.dumps(stats['category_breakdown'])}

Provide 3-5 actionable insights and recommendations for improving financial health. Focus on Indian context."""

        response = await call_llm(
            "You are a financial analyst. Provide 3-5 key insights based on the user's financial data.",
            prompt, max_tokens=4096, timeout=30.0
        )
        return {"insights": response}
    except Exception as e:
        logger.error(f"AI insights error: {e}")
        return {"insights": "Unable to generate insights at this time."}

# ===== MARKET ENDPOINTS =====

@api_router.get("/markets/crypto")
async def get_crypto_prices(limit: int = 20, search: Optional[str] = None):
    """Get cryptocurrency prices — CoinMarketCap first, CoinGecko fallback"""
    cache_key = f"crypto_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    cmc_data = await get_cmc_crypto()
    if cmc_data:
        result = cmc_data[:limit]
        cache_set(cache_key, result, ttl_seconds=120)
        return result

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {
                "vs_currency": "inr", "order": "market_cap_desc",
                "per_page": min(limit, 100), "page": 1,
                "sparkline": True, "price_change_percentage": "24h,7d"
            }
            if search:
                params["ids"] = search.lower()
            response = await client.get(
                "https://api.coingecko.com/api/v3/coins/markets", params=params,
                headers={"Accept": "application/json", "User-Agent": "TradeTrackPro/1.0"}
            )
            if response.status_code == 200:
                data = response.json()
                cache_set(cache_key, data, ttl_seconds=90)
                return data
            elif response.status_code == 429:
                return cached or get_mock_crypto_data()
            else:
                return get_mock_crypto_data()
    except Exception as e:
        logger.error(f"Crypto API error: {e}")
        return cached or get_mock_crypto_data()

@api_router.get("/markets/crypto/search")
async def search_crypto(query: str):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            search_resp = await client.get(
                "https://api.coingecko.com/api/v3/search",
                params={"query": query}, headers={"Accept": "application/json"}
            )
            if search_resp.status_code != 200:
                return {"coins": []}
            coins = search_resp.json().get("coins", [])[:5]
            if not coins:
                return {"coins": []}
            ids = ",".join([c["id"] for c in coins])
            price_resp = await client.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params={"vs_currency": "inr", "ids": ids, "order": "market_cap_desc",
                        "sparkline": True, "price_change_percentage": "24h,7d"},
                headers={"Accept": "application/json"}
            )
            if price_resp.status_code == 200:
                return {"coins": price_resp.json()}
            return {"coins": coins}
    except Exception as e:
        logger.error(f"Crypto search error: {e}")
        return {"coins": []}

def get_mock_crypto_data():
    return [
        {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin",
         "image": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
         "current_price": 7850000, "market_cap": 154000000000000,
         "price_change_percentage_24h": 2.5,
         "sparkline_in_7d": {"price": [7800000, 7820000, 7850000, 7900000, 7880000, 7850000]}},
        {"id": "ethereum", "symbol": "eth", "name": "Ethereum",
         "image": "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
         "current_price": 285000, "market_cap": 34000000000000,
         "price_change_percentage_24h": 3.2,
         "sparkline_in_7d": {"price": [280000, 282000, 285000, 288000, 286000, 285000]}},
    ]

# ===== STOCKS — Alpha Vantage =====

@api_router.get("/markets/stocks")
async def get_stock_prices():
    """Get real-time Indian stock prices via Alpha Vantage"""
    cache_key = "stocks_all"
    cached = cache_get(cache_key)
    if cached:
        return cached

    av_key = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    symbols = [
        ("BSE:RELIANCE",   "Reliance Industries",      "NSE"),
        ("BSE:TCS",        "Tata Consultancy Services", "NSE"),
        ("BSE:HDFCBANK",   "HDFC Bank",                "NSE"),
        ("BSE:INFY",       "Infosys",                  "NSE"),
        ("BSE:ICICIBANK",  "ICICI Bank",               "NSE"),
        ("BSE:ITC",        "ITC Limited",              "NSE"),
        ("BSE:SBIN",       "State Bank of India",      "NSE"),
        ("BSE:BHARTIARTL", "Bharti Airtel",            "NSE"),
        ("BSE:BAJFINANCE", "Bajaj Finance",            "NSE"),
        ("BSE:WIPRO",      "Wipro",                    "NSE"),
        ("BSE:TATAMOTORS", "Tata Motors",              "NSE"),
        ("BSE:HINDUNILVR", "Hindustan Unilever",       "NSE"),
    ]
    results = []

    if av_key:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for av_sym, name, exchange in symbols:
                try:
                    r = await client.get("https://www.alphavantage.co/query",
                        params={"function": "GLOBAL_QUOTE", "symbol": av_sym, "apikey": av_key})
                    if r.status_code == 200:
                        q = r.json().get("Global Quote", {})
                        price = float(q.get("05. price", 0) or 0)
                        change = float(q.get("09. change", 0) or 0)
                        pct = float((q.get("10. change percent", "0%") or "0%").replace("%", ""))
                        if price > 0:
                            results.append({
                                "symbol": av_sym.replace("BSE:", ""),
                                "name": name, "exchange": exchange,
                                "price": round(price, 2), "change": round(change, 2),
                                "change_percent": round(pct, 2),
                            })
                except Exception as e:
                    logger.warning(f"AV stock error {av_sym}: {e}")

    if not results:
        logger.warning("Alpha Vantage stocks unavailable — using fallback data")
        results = [
            {"symbol": "RELIANCE",   "name": "Reliance Industries",      "exchange": "NSE", "price": 2456.75, "change": 23.40,  "change_percent":  0.96},
            {"symbol": "TCS",        "name": "Tata Consultancy Services", "exchange": "NSE", "price": 3567.80, "change": -12.30, "change_percent": -0.34},
            {"symbol": "HDFCBANK",   "name": "HDFC Bank",                "exchange": "NSE", "price": 1678.90, "change": 15.60,  "change_percent":  0.94},
            {"symbol": "INFY",       "name": "Infosys",                  "exchange": "NSE", "price": 1445.25, "change":  8.75,  "change_percent":  0.61},
            {"symbol": "ICICIBANK",  "name": "ICICI Bank",               "exchange": "NSE", "price": 1123.40, "change": -5.20,  "change_percent": -0.46},
            {"symbol": "ITC",        "name": "ITC Limited",              "exchange": "NSE", "price":  465.30, "change":  3.10,  "change_percent":  0.67},
            {"symbol": "SBIN",       "name": "State Bank of India",      "exchange": "NSE", "price":  789.55, "change": 11.25,  "change_percent":  1.45},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel",            "exchange": "NSE", "price": 1589.70, "change": -8.40,  "change_percent": -0.53},
        ]

    cache_set(cache_key, results, ttl_seconds=300)
    return results

@api_router.get("/markets/stocks/search")
async def search_stocks(query: str):
    """Search Indian stocks via Alpha Vantage symbol search"""
    av_key = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    if not av_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://www.alphavantage.co/query",
                params={"function": "SYMBOL_SEARCH", "keywords": query, "apikey": av_key})
            if resp.status_code != 200:
                return []
            results = []
            for m in resp.json().get("bestMatches", [])[:10]:
                sym = m.get("1. symbol", "")
                name = m.get("2. name", "")
                if "India" in m.get("4. region", "") or "BSE" in sym or sym.endswith(".NS"):
                    clean = sym.replace("BSE:", "").replace(".BSE", "").replace(".NS", "")
                    results.append({"symbol": clean, "name": name,
                        "exchange": "NSE" if ".NS" in sym else "BSE",
                        "price": 0, "change": 0, "change_percent": 0})
            return results
    except Exception as e:
        logger.error(f"Stock search error: {e}")
        return []

# ===== COMMODITIES — Alpha Vantage =====

@api_router.get("/markets/commodities")
async def get_commodity_prices():
    """Get real-time commodity prices via Alpha Vantage (converted to INR)"""
    cache_key = "commodities_all"
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
    # Auth optional - works for both logged-in and guest users
    user_id = await get_user_from_token(authorization)
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
    try:
        prompt = f"""Analyze {symbol.upper()} commodity:
1. Short-term price outlook (1-2 weeks) in INR
2. Key global and domestic factors affecting price
3. Supply/demand dynamics
4. Risk factors (geopolitical, seasonal, USD/INR impact)
5. Trading recommendation with price targets in INR

Focus on MCX India context."""
        response = await call_llm(
            "You are a commodities market expert specializing in MCX India, global commodity markets, and their impact on the Indian economy.",
            prompt, max_tokens=4096, timeout=30.0
        )
        return {"symbol": symbol.upper(), "prediction": response}
    except Exception as e:
        logger.error(f"Commodity prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== COINMARKETCAP INTEGRATION =====

async def get_cmc_crypto():
    cmc_key = os.getenv("COINMARKETCAP_API_KEY", "")
    if not cmc_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            fx_resp = await client.get(
                "https://pro-api.coinmarketcap.com/v1/tools/price-conversion",
                headers={"X-CMC_PRO_API_KEY": cmc_key},
                params={"amount": 1, "symbol": "USD", "convert": "INR"}
            )
            usd_inr = 83.5
            if fx_resp.status_code == 200:
                usd_inr = fx_resp.json().get("data", {}).get("quote", {}).get("INR", {}).get("price", 83.5)
            resp = await client.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
                headers={"X-CMC_PRO_API_KEY": cmc_key},
                params={"limit": 50, "convert": "USD", "sort": "market_cap"}
            )
            if resp.status_code != 200:
                return None
            result = []
            for c in resp.json().get("data", []):
                q = c.get("quote", {}).get("USD", {})
                price_usd = q.get("price", 0)
                result.append({
                    "id": c.get("slug", c.get("symbol", "").lower()),
                    "symbol": c.get("symbol", "").lower(),
                    "name": c.get("name", ""),
                    "image": f"https://s2.coinmarketcap.com/static/img/coins/64x64/{c.get('id')}.png",
                    "current_price": round(price_usd * usd_inr, 2),
                    "market_cap": round((q.get("market_cap", 0) or 0) * usd_inr, 0),
                    "price_change_percentage_24h": round(q.get("percent_change_24h", 0), 2),
                    "price_change_percentage_7d": round(q.get("percent_change_7d", 0), 2),
                    "total_volume": round((q.get("volume_24h", 0) or 0) * usd_inr, 0),
                    "circulating_supply": c.get("circulating_supply", 0),
                    "market_cap_rank": c.get("cmc_rank", 0),
                    "sparkline_in_7d": {"price": []}, "cmc_id": c.get("id"),
                })
            return result
    except Exception as e:
        logger.error(f"CMC error: {e}")
        return None

# ===== PORTFOLIO ENDPOINTS =====

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

@api_router.post("/portfolio/import")
async def import_portfolio(data: PortfolioImport, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        await db.portfolios.delete_many({"user_id": user_id})
        holdings = [{"holding_id": f"hold_{uuid.uuid4().hex[:12]}", "user_id": user_id,
                     "symbol": h.symbol.upper(), "name": h.name, "asset_type": h.asset_type,
                     "quantity": h.quantity, "avg_buy_price": h.avg_buy_price,
                     "exchange": h.exchange or "", "source": data.source,
                     "imported_at": datetime.now(timezone.utc).isoformat()} for h in data.holdings]
        if holdings:
            await db.portfolios.insert_many(holdings)
        return {"success": True, "imported": len(holdings),
                "message": f"Imported {len(holdings)} holdings from {data.source}"}
    except Exception as e:
        logger.error(f"Portfolio import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/portfolio/import/csv")
async def import_portfolio_csv(file: UploadFile = File(...), source: str = "csv",
                                authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        content = await file.read()
        reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
        holdings = []
        for row in reader:
            row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            symbol = (row.get("symbol") or row.get("trading symbol") or row.get("scrip") or row.get("ticker") or "").upper()
            name = row.get("name") or row.get("company") or row.get("scrip name") or symbol
            qty = float(str(row.get("quantity") or row.get("qty") or row.get("shares") or "0").replace(",", "") or 0)
            price = float(str(row.get("avg cost") or row.get("average price") or row.get("buy price") or "0").replace(",", "").replace("₹", "") or 0)
            asset_type = "stock"
            if row.get("type", "").lower() in ["crypto", "cryptocurrency"]:
                asset_type = "crypto"
            elif row.get("type", "").lower() in ["commodity", "etf"]:
                asset_type = "commodity"
            if symbol and qty > 0:
                holdings.append({"holding_id": f"hold_{uuid.uuid4().hex[:12]}", "user_id": user_id,
                    "symbol": symbol, "name": name, "asset_type": asset_type, "quantity": qty,
                    "avg_buy_price": price, "exchange": "NSE", "source": source,
                    "imported_at": datetime.now(timezone.utc).isoformat()})
        await db.portfolios.delete_many({"user_id": user_id})
        if holdings:
            await db.portfolios.insert_many(holdings)
        return {"success": True, "imported": len(holdings)}
    except Exception as e:
        logger.error(f"CSV import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/portfolio")
async def get_portfolio(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await db.portfolios.find({"user_id": user_id}, {"_id": 0}).to_list(1000)

@api_router.delete("/portfolio/{holding_id}")
async def delete_holding(holding_id: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    await db.portfolios.delete_one({"holding_id": holding_id, "user_id": user_id})
    return {"success": True}

@api_router.post("/portfolio/ai-recommendations")
async def get_portfolio_recommendations(authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        holdings = await db.portfolios.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(500)
        total_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
        total_expense = sum(t["amount"] for t in transactions if t.get("type") == "expense")
        balance = total_income - total_expense
        portfolio_summary = "\n".join([
            f"- {h['name']} ({h['symbol']}): {h['quantity']} units @ ₹{h['avg_buy_price']} [{h['asset_type']}]"
            for h in holdings
        ]) if holdings else "No holdings yet"

        prompt = f"""Analyze this Indian investor's portfolio and provide actionable recommendations:

HOLDINGS:
{portfolio_summary}

FINANCIALS:
- Income: ₹{total_income:,.0f} | Expenses: ₹{total_expense:,.0f} | Balance: ₹{balance:,.0f}

Provide:
## 1. Portfolio Health Score (0-100)
## 2. Bullish Signals 🟢 (3-5 assets/sectors)
## 3. Bearish/Risky Signals 🔴 (3-5 assets/sectors)
## 4. Buy Recommendations (with price targets in INR)
## 5. Sell Recommendations (with price targets in INR)
## 6. Hold Recommendations
## 7. Rebalancing Suggestion (allocation %)
## 8. Top 3 Actions This Week

Use March 2026 Indian market context, SEBI regulations, LTCG/STCG implications."""

        analysis = await call_llm(
            "You are a SEBI-registered investment advisor specializing in Indian markets. Provide detailed, actionable advice with INR price targets.",
            prompt, max_tokens=4096, timeout=45.0
        )
        return {"success": True, "analysis": analysis, "holdings_count": len(holdings)}
    except Exception as e:
        logger.error(f"AI recommendations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== AI MARKET SEARCH =====

class AISearchRequest(BaseModel):
    query: str
    asset_type: Optional[str] = "general"

@api_router.post("/markets/search/ai")
async def ai_market_search(data: AISearchRequest, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        system = """You are a professional financial research analyst with expertise in Indian stocks (NSE/BSE), cryptocurrencies, and commodities (MCX).
Provide detailed, accurate, actionable research. Always include: current outlook, key levels, risks, and a clear recommendation."""

        prompt = f"""Research: {data.query}
Asset type: {data.asset_type}

Include:
1. **Current Status**
2. **Technical Outlook** (support/resistance levels)
3. **Fundamental Analysis** (key drivers, news)
4. **Bull Case** 🟢
5. **Bear Case** 🔴
6. **Recommendation** (Buy/Sell/Hold with INR price targets)
7. **Risk Factors**"""

        result = await call_llm(system, prompt, max_tokens=4096, timeout=45.0)
        return {"success": True, "result": result, "query": data.query}
    except Exception as e:
        logger.error(f"AI search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== TELEGRAM ENDPOINTS =====

@api_router.post("/telegram/connect")
async def connect_telegram(data: TelegramConnect, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    await db.telegram_users.update_one(
        {"user_id": user_id},
        {"$set": {"chat_id": data.chat_id, "active": True,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    try:
        await send_telegram_message(data.chat_id, "✅ TradeTrack Pro connected successfully!")
    except Exception as e:
        logger.error(f"Welcome message error: {e}")
    return {"message": "Telegram connected successfully", "chat_id": data.chat_id}

@api_router.post("/telegram/notify")
async def send_notification(message: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    telegram_user = await db.telegram_users.find_one({"user_id": user_id, "active": True})
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram not connected")
    await send_telegram_message(telegram_user["chat_id"], message)
    return {"message": "Notification sent successfully"}

async def send_telegram_message(chat_id: int, message: str):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        logger.warning("Telegram bot token not configured")
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        )

@api_router.post("/telegram/alerts/transaction")
async def send_transaction_alert(transaction_id: str, authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    telegram_user = await db.telegram_users.find_one({"user_id": user_id, "active": True})
    if not telegram_user:
        return {"message": "Telegram not connected"}
    transaction = await db.transactions.find_one(
        {"transaction_id": transaction_id, "user_id": user_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    icon = "📈" if transaction["type"] == "income" else "📉"
    msg = f"""{icon} *Transaction Alert*\n\n*Type:* {transaction['type'].title()}\n*Amount:* ₹{transaction['amount']:,.2f}\n*Category:* {transaction['category']}\n*Date:* {transaction['date']}\n{f"*Description:* {transaction['description']}" if transaction.get('description') else ""}\n\n_TradeTrack Pro_"""
    try:
        await send_telegram_message(telegram_user["chat_id"], msg)
        return {"message": "Alert sent"}
    except Exception as e:
        logger.error(f"Alert error: {e}")
        return {"message": "Failed to send alert"}

# ===== IMPORT ENDPOINTS =====

@api_router.post("/import/paytm")
async def import_paytm(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        content = await file.read()
        csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        imported_count = 0
        for row in csv_reader:
            await db.transactions.insert_one({
                "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "user_id": user_id,
                "type": "expense" if float(row.get("Amount", 0)) < 0 else "income",
                "amount": abs(float(row.get("Amount", 0))),
                "category": row.get("Category", "Others"),
                "description": row.get("Description", ""),
                "date": row.get("Date", datetime.now().strftime("%Y-%m-%d")),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            imported_count += 1
        return {"message": f"Imported {imported_count} transactions"}
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== SCANNER ENDPOINTS =====

@api_router.post("/scanner/process")
async def process_receipt(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user_id = await get_user_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        content = await file.read()
        temp_path = f"/tmp/{uuid.uuid4().hex}.jpg"
        with open(temp_path, "wb") as f:
            f.write(content)
        return {"success": True, "file_id": uuid.uuid4().hex[:12], "message": "Receipt uploaded successfully"}
    except Exception as e:
        logger.error(f"Scanner error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== BASIC ROUTES =====

@api_router.get("/")
async def root():
    return {"message": "TradeTrack Pro API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
