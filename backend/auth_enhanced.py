"""
Enhanced Authentication Module with Phone/Email OTP
Supports: Firebase, MSG91, Paytm integration
"""
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import random
import hashlib
import logging
import re

logger = logging.getLogger(__name__)

# ===== MODELS =====

class PhoneSignupRequest(BaseModel):
    phone: str
    name: str

class EmailSignupRequest(BaseModel):
    email: str
    name: str

class OTPVerifyRequest(BaseModel):
    phone_or_email: str
    otp: str

class PaytmInitRequest(BaseModel):
    amount: float
    order_id: str

# ===== OTP GENERATION =====

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

# ===== DEMO/MOCK IMPLEMENTATIONS =====

async def send_sms_demo(phone: str, otp: str) -> bool:
    logger.info(f"📱 SMS OTP to {phone}: {otp}")
    return True

async def send_email_demo(email: str, otp: str) -> bool:
    logger.info(f"📧 Email OTP to {email}: {otp}")
    return True

# ===== FIREBASE INTEGRATION =====

async def send_sms_firebase(phone: str, otp: str) -> bool:
    try:
        logger.info(f"[Firebase] SMS to {phone}: {otp}")
        return True
    except Exception as e:
        logger.error(f"Firebase SMS error: {e}")
        return False

# ===== MSG91 INTEGRATION =====

async def send_sms_msg91(phone: str, otp: str) -> bool:
    try:
        auth_key = os.getenv("MSG91_AUTH_KEY")
        sender_id = os.getenv("MSG91_SENDER_ID", "TRADTR")
        if not auth_key or auth_key == "demo-key":
            logger.info(f"[MSG91 Demo] SMS to {phone}: {otp}")
            return True
        import httpx
        url = "https://api.msg91.com/api/v5/otp"
        params = {
            "authkey": auth_key,
            "mobile": phone.replace("+", ""),
            "otp": otp,
            "sender": sender_id,
            "message": f"Your TradeTrack Pro OTP is {otp}. Valid for 10 minutes."
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params)
            return response.status_code == 200
    except Exception as e:
        logger.error(f"MSG91 SMS error: {e}")
        return False

# ===== PAYTM PAYMENT GATEWAY =====

def generate_paytm_checksum(params: dict, merchant_key: str) -> str:
    import hashlib
    param_str = '|'.join([str(params[key]) for key in sorted(params.keys())])
    checksum = hashlib.sha256(f"{param_str}|{merchant_key}".encode()).hexdigest()
    return checksum

async def initiate_paytm_payment(order_id: str, amount: float, customer_id: str) -> dict:
    try:
        merchant_id = os.getenv("PAYTM_MERCHANT_ID")
        merchant_key = os.getenv("PAYTM_MERCHANT_KEY")
        website = os.getenv("PAYTM_WEBSITE", "WEBSTAGING")
        if merchant_id == "demo-merchant":
            return {"success": True, "payment_url": "https://securegw-stage.paytm.in/order/process",
                    "order_id": order_id, "amount": amount, "mode": "demo"}
        params = {
            "MID": merchant_id, "WEBSITE": website,
            "INDUSTRY_TYPE_ID": os.getenv("PAYTM_INDUSTRY_TYPE", "Retail"),
            "CHANNEL_ID": os.getenv("PAYTM_CHANNEL_ID", "WEB"),
            "ORDER_ID": order_id, "CUST_ID": customer_id, "TXN_AMOUNT": str(amount),
            "CALLBACK_URL": "https://crypto-tracker-172.preview.emergentagent.com/api/paytm/callback"
        }
        checksum = generate_paytm_checksum(params, merchant_key)
        params["CHECKSUMHASH"] = checksum
        return {"success": True, "payment_url": "https://securegw.paytm.in/order/process", "params": params}
    except Exception as e:
        logger.error(f"Paytm init error: {e}")
        raise HTTPException(status_code=500, detail="Payment initialization failed")

async def fetch_paytm_transactions(user_phone: str, days: int = 30) -> list:
    try:
        client_id = os.getenv("PAYTM_BUSINESS_CLIENT_ID")
        if not client_id or client_id == "demo":
            return [
                {"txn_id": "PTM001", "amount": 500.00, "type": "DEBIT", "date": "2026-01-15", "description": "Grocery Store"},
                {"txn_id": "PTM002", "amount": 1200.00, "type": "DEBIT", "date": "2026-01-14", "description": "Restaurant"}
            ]
        import httpx
        client_secret = os.getenv("PAYTM_BUSINESS_CLIENT_SECRET")
        token_url = os.getenv("PAYTM_BUSINESS_TOKEN_URL")
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data={
                "client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"
            })
            access_token = token_response.json()["access_token"]
            api_url = os.getenv("PAYTM_BUSINESS_API_URL")
            txn_response = await client.get(f"{api_url}/transactions",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"phone": user_phone, "days": days})
            return txn_response.json()
    except Exception as e:
        logger.error(f"Paytm Business API error: {e}")
        return []


# =============================================================
# 🔍 WEB SEARCH HELPER — DuckDuckGo (no API key needed)
# Falls back to Brave Search if BRAVE_SEARCH_API_KEY is set
# =============================================================

# Keywords that signal a question needs live web data
_NEEDS_SEARCH_PATTERNS = [
    r'\bprice\b', r'\bcost\b', r'\brate\b', r'\btoday\b', r'\bcurrent\b',
    r'\bnow\b', r'\blatest\b', r'\b202[4-9]\b', r'\b203\d\b',
    r'\bpetrol\b', r'\bdiesel\b', r'\bfuel\b', r'\bgold\b', r'\bsilver\b',
    r'\bcar\b', r'\bvehicle\b', r'\bbike\b', r'\bscooter\b',
    r'\bemi\b', r'\bloan\b', r'\binterest\b',
    r'\bsalary\b', r'\bpackage\b', r'\bctc\b', r'\bhike\b',
    r'\bstock\b', r'\bnifty\b', r'\bsensex\b', r'\bshare\b',
    r'\breal estate\b', r'\bproperty\b', r'\brent\b',
    r'\binflation\b', r'\bgdp\b', r'\brbi\b', r'\brepo\b',
    r'\bbitcoin\b', r'\bcrypto\b',
]

def _should_search(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in _NEEDS_SEARCH_PATTERNS)


async def web_search(query: str, max_results: int = 4) -> str:
    """
    Search the web for current information.
    Primary: Brave Search API (if BRAVE_SEARCH_API_KEY set).
    Fallback: DuckDuckGo Instant Answer API (no key needed).
    Returns a formatted string of search snippets to inject into the LLM prompt.
    """
    import httpx

    brave_key = os.getenv("BRAVE_SEARCH_API_KEY", "")

    # ── Brave Search (best quality) ──────────────────────────
    if brave_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as c:
                r = await c.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    headers={"Accept": "application/json", "X-Subscription-Token": brave_key},
                    params={"q": query, "count": max_results, "country": "IN",
                            "search_lang": "en", "freshness": "pm"}  # past month
                )
                if r.status_code == 200:
                    results = r.json().get("web", {}).get("results", [])
                    if results:
                        snippets = []
                        for res in results[:max_results]:
                            title = res.get("title", "")
                            desc  = res.get("description", "")
                            url   = res.get("url", "")
                            age   = res.get("age", "")
                            snippets.append(f"• [{title}] ({age})\n  {desc}\n  Source: {url}")
                        return "\n".join(snippets)
        except Exception as e:
            logger.warning(f"Brave search failed: {e}")

    # ── DuckDuckGo Instant Answer (free fallback) ─────────────
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": "1",
                        "skip_disambig": "1", "kl": "in-en"},
                headers={"User-Agent": "TradeTrackPro/1.0"}
            )
            if r.status_code == 200:
                data = r.json()
                snippets = []
                # Abstract (main answer)
                if data.get("AbstractText"):
                    snippets.append(f"• {data['AbstractText']}\n  Source: {data.get('AbstractURL','')}")
                # Related topics
                for topic in data.get("RelatedTopics", [])[:max_results - 1]:
                    if isinstance(topic, dict) and topic.get("Text"):
                        snippets.append(f"• {topic['Text']}")
                if snippets:
                    return "\n".join(snippets)
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")

    return ""  # Empty string — LLM will answer from training data only


# =============================================================
# 🤖 AI Q&A — GROQ + WEB SEARCH
# =============================================================

async def get_ai_answer(category: str, question: str, user_context: dict = None) -> str:
    """
    Answer financial questions using Groq + optional live web search.
    - Detects questions that need real-time data (prices, rates, salaries)
    - Fetches web search results first if needed
    - Injects results into LLM prompt so answers are grounded in current data
    - Today's date is always injected so the LLM never confuses years
    """
    try:
        import httpx

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in .env")

        today = datetime.now().strftime("%B %d, %Y")
        current_year = datetime.now().year

        # ── 1. Decide if we need a web search ──────────────────
        search_context = ""
        if _should_search(question):
            # Build a search query focused on India + recency
            search_query = f"{question} India {current_year}"
            # Trim generic words that hurt search quality
            search_query = re.sub(r'\b(what is|how much|tell me|explain)\b', '', search_query, flags=re.I).strip()
            logger.info(f"🔍 Web search for Q&A: {search_query!r}")
            results = await web_search(search_query, max_results=4)
            if results:
                search_context = f"""
═══════════════════════════════════════
LIVE WEB SEARCH RESULTS (fetched {today}):
{results}
═══════════════════════════════════════
Use the above search results as your PRIMARY source for any prices, rates, or current data.
If search results contain the answer, cite it directly. If results are incomplete, supplement with your knowledge but flag it.
"""
            else:
                search_context = f"\n[Web search attempted but returned no results — using training knowledge. State this clearly if answering about current prices/rates.]\n"

        # ── 2. Build user financial context ──────────────────
        context_str = ""
        if user_context and any(user_context.values()):
            income  = user_context.get('total_income', 0)
            expense = user_context.get('total_expense', 0)
            balance = user_context.get('balance', 0)
            savings_rate = ((income - expense) / income * 100) if income > 0 else 0
            context_str = f"""
User's Actual Financial Data (use in calculations):
- Total Income recorded: ₹{income:,.2f}
- Total Expenses recorded: ₹{expense:,.2f}
- Balance: ₹{balance:,.2f}
- Savings Rate: {savings_rate:.1f}%
"""

        # ── 3. System prompt ──────────────────────────────────
        system_message = f"""You are a certified financial advisor specializing in Indian personal finance, tax laws, and markets.
TODAY'S DATE: {today}  ← Always use this date. Never reference 2023 or 2024 as "current".
CURRENT YEAR: {current_year}

{context_str}

Category: {AI_QNA_CATEGORIES.get(category, {}).get('title', category)}

RULES:
1. TODAY IS {today}. Use this for all date-based planning (e.g., "by end of 2028" = {2028 - current_year} years from now).
2. If web search results are provided above, USE THEM as your primary source for current prices/rates.
3. If you cannot verify a current price from search results, say "as of my last data" and give a range.
4. Keep answers practical (300–600 words), use ₹ for all amounts.
5. Reference Indian laws (IT Act, SEBI, RBI) where relevant.
6. Provide 2–3 concrete actionable steps.
7. Show your arithmetic when doing financial projections."""

        # ── 4. Call LLM ────────────────────────────────────────
        full_prompt = f"{search_context}\n\nQuestion: {question}" if search_context else question

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"content-type": "application/json", "Authorization": f"Bearer {api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_message},
                        {"role": "user",   "content": full_prompt},
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.3,
                },
                timeout=35.0,
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            return re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    except Exception as e:
        logger.error(f"AI Q&A error: {e}")
        return "Unable to generate answer at this time. Please try again."

# ===== MODELS =====

class PhoneSignupRequest(BaseModel):
    phone: str  # International format: +919876543210
    name: str

class EmailSignupRequest(BaseModel):
    email: str
    name: str

class OTPVerifyRequest(BaseModel):
    phone_or_email: str
    otp: str

class PaytmInitRequest(BaseModel):
    amount: float
    order_id: str

# ===== OTP GENERATION =====

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def hash_otp(otp: str) -> str:
    """Hash OTP for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()

# ===== DEMO/MOCK IMPLEMENTATIONS =====

async def send_sms_demo(phone: str, otp: str) -> bool:
    """Demo SMS sending (logs OTP)"""
    logger.info(f"📱 SMS OTP to {phone}: {otp}")
    return True

async def send_email_demo(email: str, otp: str) -> bool:
    """Demo email sending (logs OTP)"""
    logger.info(f"📧 Email OTP to {email}: {otp}")
    return True

# ===== FIREBASE INTEGRATION =====

async def send_sms_firebase(phone: str, otp: str) -> bool:
    """
    Send SMS via Firebase
    In production, use Firebase Admin SDK
    """
    try:
        # Demo implementation
        logger.info(f"[Firebase] SMS to {phone}: {otp}")
        return True
        
        # Production code (uncomment when Firebase is configured):
        # import firebase_admin
        # from firebase_admin import auth
        # 
        # # Verify phone number exists
        # user = auth.get_user_by_phone_number(phone)
        # return True
        
    except Exception as e:
        logger.error(f"Firebase SMS error: {e}")
        return False

# ===== MSG91 INTEGRATION =====

async def send_sms_msg91(phone: str, otp: str) -> bool:
    """
    Send SMS via MSG91 (Indian SMS gateway)
    """
    try:
        auth_key = os.getenv("MSG91_AUTH_KEY")
        sender_id = os.getenv("MSG91_SENDER_ID", "TRADTR")
        
        if not auth_key or auth_key == "demo-key":
            # Demo mode
            logger.info(f"[MSG91 Demo] SMS to {phone}: {otp}")
            return True
        
        # Production code:
        import httpx
        url = "https://api.msg91.com/api/v5/otp"
        params = {
            "authkey": auth_key,
            "mobile": phone.replace("+", ""),
            "otp": otp,
            "sender": sender_id,
            "message": f"Your TradeTrack Pro OTP is {otp}. Valid for 10 minutes."
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params)
            return response.status_code == 200
            
    except Exception as e:
        logger.error(f"MSG91 SMS error: {e}")
        return False

# ===== PAYTM PAYMENT GATEWAY =====

def generate_paytm_checksum(params: dict, merchant_key: str) -> str:
    """Generate Paytm checksum"""
    import hashlib
    param_str = '|'.join([str(params[key]) for key in sorted(params.keys())])
    checksum = hashlib.sha256(f"{param_str}|{merchant_key}".encode()).hexdigest()
    return checksum

async def initiate_paytm_payment(order_id: str, amount: float, customer_id: str) -> dict:
    """
    Initiate Paytm payment
    Returns payment URL and parameters
    """
    try:
        merchant_id = os.getenv("PAYTM_MERCHANT_ID")
        merchant_key = os.getenv("PAYTM_MERCHANT_KEY")
        website = os.getenv("PAYTM_WEBSITE", "WEBSTAGING")
        
        if merchant_id == "demo-merchant":
            # Demo mode
            return {
                "success": True,
                "payment_url": "https://securegw-stage.paytm.in/order/process",
                "order_id": order_id,
                "amount": amount,
                "mode": "demo"
            }
        
        # Production Paytm integration
        params = {
            "MID": merchant_id,
            "WEBSITE": website,
            "INDUSTRY_TYPE_ID": os.getenv("PAYTM_INDUSTRY_TYPE", "Retail"),
            "CHANNEL_ID": os.getenv("PAYTM_CHANNEL_ID", "WEB"),
            "ORDER_ID": order_id,
            "CUST_ID": customer_id,
            "TXN_AMOUNT": str(amount),
            "CALLBACK_URL": "https://crypto-tracker-172.preview.emergentagent.com/api/paytm/callback"
        }
        
        checksum = generate_paytm_checksum(params, merchant_key)
        params["CHECKSUMHASH"] = checksum
        
        return {
            "success": True,
            "payment_url": "https://securegw.paytm.in/order/process",
            "params": params
        }
        
    except Exception as e:
        logger.error(f"Paytm init error: {e}")
        raise HTTPException(status_code=500, detail="Payment initialization failed")

# ===== PAYTM BUSINESS API =====

async def fetch_paytm_transactions(user_phone: str, days: int = 30) -> list:
    """
    Fetch Paytm transactions using Business API
    """
    try:
        client_id = os.getenv("PAYTM_BUSINESS_CLIENT_ID")
        client_secret = os.getenv("PAYTM_BUSINESS_CLIENT_SECRET")
        
        if not client_id or client_id == "demo":
            # Return demo transactions
            return [
                {
                    "txn_id": "PTM001",
                    "amount": 500.00,
                    "type": "DEBIT",
                    "date": "2026-01-15",
                    "description": "Grocery Store"
                },
                {
                    "txn_id": "PTM002",
                    "amount": 1200.00,
                    "type": "DEBIT",
                    "date": "2026-01-14",
                    "description": "Restaurant"
                }
            ]
        
        # Production: OAuth flow + API call
        import httpx
        
        # Step 1: Get access token
        token_url = os.getenv("PAYTM_BUSINESS_TOKEN_URL")
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "client_credentials"
            })
            access_token = token_response.json()["access_token"]
            
            # Step 2: Fetch transactions
            api_url = os.getenv("PAYTM_BUSINESS_API_URL")
            headers = {"Authorization": f"Bearer {access_token}"}
            txn_response = await client.get(
                f"{api_url}/transactions",
                headers=headers,
                params={"phone": user_phone, "days": days}
            )
            
            return txn_response.json()
            
    except Exception as e:
        logger.error(f"Paytm Business API error: {e}")
        return []

# ===== AI Q&A CATEGORIES =====

AI_QNA_CATEGORIES = {
    "sip": {
        "title": "Should I start SIP?",
        "description": "Learn about Systematic Investment Plans and whether they're right for you",
        "questions": [
            "What is SIP and how does it work?",
            "Should I start SIP now or wait?",
            "How much should I invest in SIP monthly?",
            "Which SIP funds are best for beginners?",
            "Can I stop SIP anytime?"
        ]
    },
    "tax": {
        "title": "Tax Saving Strategies",
        "description": "Save taxes legally with smart financial planning",
        "questions": [
            "How can I save tax this year?",
            "What is Section 80C and how to use it?",
            "Should I opt for old or new tax regime?",
            "Can I claim HRA and home loan together?",
            "What are tax-saving investments?"
        ]
    },
    "investment": {
        "title": "Investment Advice",
        "description": "Smart investment strategies for wealth creation",
        "questions": [
            "Where should I invest my savings?",
            "Is mutual fund better than FD?",
            "Should I invest in stocks or gold?",
            "How to build an investment portfolio?",
            "What is asset allocation?"
        ]
    },
    "insurance": {
        "title": "Insurance Planning",
        "description": "Protect your family and assets with right insurance",
        "questions": [
            "Do I need life insurance?",
            "How much term insurance should I buy?",
            "Is health insurance mandatory?",
            "What is the difference between term and endowment?",
            "Should I take insurance from employer only?"
        ]
    },
    "retirement": {
        "title": "Retirement Planning",
        "description": "Plan your retirement corpus and secure your future",
        "questions": [
            "How much do I need for retirement?",
            "Should I invest in NPS or PPF?",
            "When should I start retirement planning?",
            "Can I retire early with current savings?",
            "What are best retirement investment options?"
        ]
    },
    "debt": {
        "title": "Debt Management",
        "description": "Manage and eliminate debt effectively",
        "questions": [
            "How to pay off credit card debt fast?",
            "Should I take personal loan or use savings?",
            "What is good debt vs bad debt?",
            "How to improve credit score?",
            "Should I consolidate my loans?"
        ]
    }
}

async def get_ai_answer(category: str, question: str, user_context: dict = None) -> str:
    """
    Get AI answer for Q&A with user context
    Uses Claude via Anthropic API
    """
    try:
        import httpx

        api_key = os.getenv("GEMINI_API_KEY")

        # Build context-aware system message
        context_str = ""
        if user_context:
            context_str = f"""
User Financial Context:
- Total Income: ₹{user_context.get('total_income', 0):,.2f}
- Total Expenses: ₹{user_context.get('total_expense', 0):,.2f}
- Current Balance: ₹{user_context.get('balance', 0):,.2f}
- Age: {user_context.get('age', 'Not specified')}
"""

        system_message = f"""You are a certified financial advisor specializing in Indian financial markets and tax laws.
Provide practical, actionable advice tailored to Indian investors.

{context_str}

Category: {AI_QNA_CATEGORIES.get(category, {}).get('title', category)}

Guidelines:
1. Keep answers concise (300-500 words)
2. Use INR (₹) for amounts
3. Reference Indian laws (IT Act, GST, etc.)
4. Provide 2-3 actionable steps
5. Add disclaimer if needed
6. Use simple language, avoid jargon"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={api_key}",
                headers={"content-type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system_message}]},
                    "contents": [{"role": "user", "parts": [{"text": question}]}],
                    "generationConfig": {"maxOutputTokens": 4096},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]

    except Exception as e:
        logger.error(f"AI Q&A error: {e}")
        return "Unable to generate answer at this time. Please try again."