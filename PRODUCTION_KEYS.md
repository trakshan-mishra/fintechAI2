# 🔑 API Keys Required for Production Deployment

## Authentication Services

### 1. Firebase (Phone + Email OTP)
**Service**: Firebase Authentication  
**Cost**: Free tier (10K verifications/month)  
**Website**: https://console.firebase.google.com/

**Setup**:
1. Create project in Firebase Console
2. Enable Authentication → Phone & Email
3. Get service account JSON

**Required**:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@xxx.iam.gserviceaccount.com
```

### 2. MSG91 (Indian SMS)
**Cost**: ~₹0.15/SMS  
**Website**: https://msg91.com/

**Required**:
```
MSG91_AUTH_KEY=your-key
MSG91_SENDER_ID=TRADTR
```

## Payment Integration

### 3. Paytm Payment Gateway
**Cost**: 2% transaction fee  
**Website**: https://business.paytm.com/

**Required**:
```
PAYTM_MERCHANT_ID=your-id
PAYTM_MERCHANT_KEY=your-key
PAYTM_WEBSITE=WEBSTAGING
```

### 4. Paytm Business API
**Cost**: Free  

**Required**:
```
PAYTM_BUSINESS_CLIENT_ID=your-id
PAYTM_BUSINESS_CLIENT_SECRET=your-secret
```

## AI & Communication

### 5. Emergent LLM (✅ Already Provided)
```
GEMINI_API_KEY=sk-emergent-1684bFf693396049e0
```

### 6. Telegram Bot (Optional)
**Cost**: Free  
**Setup**: Use @BotFather

```
TELEGRAM_BOT_TOKEN=1234567890:ABC...
```

## Market Data

### 7. CoinGecko API
**Cost**: Free (30 calls/min) or $129/month (Pro)

```
COINGECKO_API_KEY=CG-xxxxx  # Optional for Pro
```

### 8. Stock Market API (Optional)
**Alpha Vantage**: $49.99/month or Free (limited)

```
ALPHA_VANTAGE_API_KEY=your-key
```

## Summary

**Minimum Required**:
1. Firebase (Free)
2. Paytm Merchant (2% fee)
3. Emergent LLM (✅ Included)

**Recommended Add**:
- MSG91 (~₹1000/month)
- Telegram Bot (Free)
- Paytm Business API (Free)

**Monthly Cost**: ₹1000-2000 (~$12-25) + transaction fees

---

**Demo keys already configured for testing**  
**Replace with real keys for production**
